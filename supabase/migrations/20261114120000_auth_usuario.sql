-- Login con Supabase Auth.
-- public.usuario deja de guardar credenciales: pasa a ser el perfil (nombre, código, rol)
-- de cada usuario de auth.users, con el mismo id.

begin;

-- 1. Perfil enlazado a auth.users ------------------------------------------------------------
-- Solo había datos de prueba (el admin del seed, sin controles), así que se borra.
delete from public.usuario where not exists (
  select 1 from public.control c where c.autor_id = usuario.id or c.revisor_id = usuario.id
);

alter table public.usuario
  drop column if exists usuario,
  drop column if exists contrasenha_hash,
  add column email text,
  alter column id drop default,
  alter column modificado_el set default now();

alter table public.usuario
  add constraint usuario_id_fkey foreign key (id) references auth.users (id) on delete cascade,
  add constraint usuario_email_key unique (email);

-- 2. Alta automática del perfil ---------------------------------------------------------------
-- rol, nombre y código vienen de app_metadata, que solo puede escribir la clave secreta
-- (Edge Function del admin). Si falta el rol (alta manual desde el dashboard o un registro
-- público por error), el perfil queda INACTIVO hasta que un admin lo habilite.
create schema if not exists private;

create or replace function private.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  rol_meta text := meta ->> 'rol';
begin
  insert into public.usuario (id, email, nombre, codigo, rol, activo, modificado_el)
  values (
    new.id,
    new.email,
    coalesce(nullif(meta ->> 'nombre', ''), split_part(new.email, '@', 1)),
    nullif(meta ->> 'codigo', ''),
    coalesce(rol_meta, 'CHOFER')::public."Rol",
    rol_meta is not null,
    now()
  );
  return new;
end;
$$;

create or replace trigger al_crear_usuario_auth
  after insert on auth.users
  for each row execute function private.crear_perfil();

create or replace function private.sincronizar_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.usuario set email = new.email, modificado_el = now() where id = new.id;
  return new;
end;
$$;

create or replace trigger al_cambiar_email_auth
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sincronizar_email();

-- 3. Permisos -----------------------------------------------------------------------------------
-- security definer para que la política de usuario no se llame a sí misma.
create or replace function private.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuario
    where id = (select auth.uid()) and rol = 'ADMIN' and activo
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.es_admin() to authenticated;
revoke execute on function private.crear_perfil(), private.sincronizar_email() from public, anon, authenticated;

-- RLS ya estaba activo (sin políticas) desde la migración inicial.
alter table public.usuario enable row level security;

drop policy if exists "usuario: ver el propio o admin ve todos" on public.usuario;
create policy "usuario: ver el propio o admin ve todos"
  on public.usuario for select
  to authenticated
  using (id = (select auth.uid()) or (select private.es_admin()));

-- Altas, cambios de rol y reseteo de contraseña los hace la Edge Function del admin
-- con la clave secreta, así que no hay políticas de insert/update/delete.

commit;
