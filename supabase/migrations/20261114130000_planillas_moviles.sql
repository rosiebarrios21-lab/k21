-- Planillas (seccion + item) y móviles accesibles desde el front con Supabase.
-- Reemplaza lo que hacían /plantillas y /moviles de k21-back.

begin;

-- 1. Valores por defecto que antes ponía Prisma desde el back ------------------------------------
alter table public.movil        alter column id set default gen_random_uuid();
alter table public.seccion      alter column id set default gen_random_uuid();
alter table public.item         alter column id set default gen_random_uuid();
alter table public.control      alter column id set default gen_random_uuid();
alter table public.control_item alter column id set default gen_random_uuid();
alter table public.control      alter column modificado_el set default now();

-- @updatedAt de Prisma: ahora lo mantiene la base.
create or replace function private.tocar_modificado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.modificado_el := now();
  return new;
end;
$$;

create or replace trigger tocar_modificado before update on public.usuario
  for each row execute function private.tocar_modificado();
create or replace trigger tocar_modificado before update on public.control
  for each row execute function private.tocar_modificado();

-- 2. Usuario en sesión activo (cualquier rol) ---------------------------------------------------
create or replace function private.usuario_activo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.usuario where id = (select auth.uid()) and activo);
$$;

grant execute on function private.usuario_activo() to authenticated;

-- 3. Validaciones (las que hacía zod en el back) -------------------------------------------------
create or replace function private.normalizar_movil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.codigo := upper(btrim(new.codigo));
  new.descripcion := nullif(btrim(new.descripcion), '');
  return new;
end;
$$;

create or replace trigger normalizar before insert or update on public.movil
  for each row execute function private.normalizar_movil();

alter table public.movil
  add constraint movil_codigo_largo check (char_length(codigo) between 1 and 20),
  add constraint movil_descripcion_largo check (char_length(descripcion) <= 100);

-- Ítem nuevo: va al final de su sección si no se indica el orden.
create or replace function private.normalizar_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.nombre := btrim(new.nombre);
  new.unidad := nullif(btrim(new.unidad), '');
  if tg_op = 'INSERT' and new.orden is null then
    select coalesce(max(orden), 0) + 1 into new.orden from public.item where seccion_id = new.seccion_id;
  end if;
  return new;
end;
$$;

create or replace trigger normalizar before insert or update on public.item
  for each row execute function private.normalizar_item();

alter table public.item
  add constraint item_nombre_largo check (char_length(nombre) between 1 and 120),
  add constraint item_unidad_largo check (char_length(unidad) <= 20),
  add constraint item_debe_haber_positivo check (debe_haber >= 0);

-- 4. Permisos -----------------------------------------------------------------------------------
-- Nada para anon: sin sesión no se lee ni se escribe ninguna tabla.
revoke all on all tables in schema public from anon;

grant select on public.movil, public.seccion, public.item to authenticated;
grant insert, update on public.movil, public.item to authenticated;

-- Móviles: choferes y respondientes ven solo los activos; el admin ve todos y los edita.
drop policy if exists "movil: leer" on public.movil;
create policy "movil: leer" on public.movil for select to authenticated
  using ((select private.usuario_activo()) and (activo or (select private.es_admin())));

drop policy if exists "movil: admin crea" on public.movil;
create policy "movil: admin crea" on public.movil for insert to authenticated
  with check ((select private.es_admin()));

drop policy if exists "movil: admin edita" on public.movil;
create policy "movil: admin edita" on public.movil for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

-- Secciones: fijas, solo lectura.
drop policy if exists "seccion: leer" on public.seccion;
create policy "seccion: leer" on public.seccion for select to authenticated
  using ((select private.usuario_activo()));

-- Ítems: igual que móviles.
drop policy if exists "item: leer" on public.item;
create policy "item: leer" on public.item for select to authenticated
  using ((select private.usuario_activo()) and (activo or (select private.es_admin())));

drop policy if exists "item: admin crea" on public.item;
create policy "item: admin crea" on public.item for insert to authenticated
  with check ((select private.es_admin()));

drop policy if exists "item: admin edita" on public.item;
create policy "item: admin edita" on public.item for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

commit;
