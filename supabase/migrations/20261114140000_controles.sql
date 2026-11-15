-- Controles en Supabase: carga, corrección, revisión, listado, detalle y resumen.
-- Reemplaza /controles de k21-back. Todo pasa por funciones (RPC) que validan y verifican
-- permisos; las tablas control y control_item no son accesibles directamente desde el front.
--
-- Errores: las funciones lanzan P0001 con el mensaje en español listo para mostrar.
-- Cuando la planilla está incompleta, DETAIL lleva un arreglo JSON con cada ítem a corregir.

begin;

-- 1. Fechas con zona horaria (Prisma las guardaba en UTC sin zona) -------------------------------
alter table public.control
  alter column creado_el type timestamptz using creado_el at time zone 'UTC',
  alter column modificado_el type timestamptz using modificado_el at time zone 'UTC',
  alter column revisado_el type timestamptz using revisado_el at time zone 'UTC';
alter table public.movil
  alter column creado_el type timestamptz using creado_el at time zone 'UTC';
alter table public.usuario
  alter column creado_el type timestamptz using creado_el at time zone 'UTC',
  alter column modificado_el type timestamptz using modificado_el at time zone 'UTC';

-- 2. Reglas de cada ítem (espejo de src/lib/reglas.ts del front) --------------------------------

-- Texto opcional: recorta espacios, vacío → null, y valida el largo máximo.
create or replace function private.texto(v jsonb, maximo int, campo text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  t text;
begin
  if v is null or jsonb_typeof(v) = 'null' then return null; end if;
  if jsonb_typeof(v) <> 'string' then raise exception '% inválido', campo; end if;
  t := nullif(btrim(v #>> '{}'), '');
  if char_length(t) > maximo then raise exception '% admite hasta % caracteres', campo, maximo; end if;
  return t;
end;
$$;

-- Devuelve el problema de la respuesta, o null si está completa y es coherente.
create or replace function private.validar_respuesta(tipo public."TipoRespuesta", r jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  resp text := r ->> 'respuesta';
  est text := r ->> 'estado';
  niv text := r ->> 'nivel';
  ex jsonb := r -> 'existente';
begin
  if r is null then return 'sin responder'; end if;
  if char_length(btrim(r ->> 'nota')) > 200 then return 'la nota admite hasta 200 caracteres'; end if;
  if tipo = 'CANTIDAD' then
    if ex is null or jsonb_typeof(ex) = 'null' then return 'falta la cantidad existente'; end if;
    if jsonb_typeof(ex) <> 'number' or ex::numeric <> trunc(ex::numeric) or ex::numeric not between 0 and 100000 then
      return 'cantidad inválida';
    end if;
    return null;
  end if;
  if resp is null then return 'falta marcar SI / NO / N/A'; end if;
  if resp not in ('SI', 'NO', 'NA') then return 'respuesta inválida'; end if;
  if tipo = 'SI_NO_HABILITACION' and resp = 'NA' then return 'N/A no corresponde'; end if;
  if est is not null and not est = any (
    case tipo
      when 'SI_NO_ESTADO' then array['B', 'R', 'M']
      when 'SI_NO_HABILITACION' then array['B', 'M', 'I']
      else array[]::text[]
    end
  ) then
    return 'estado inválido';
  end if;
  if niv is not null and (tipo <> 'SI_NO_NIVEL' or niv not in ('R', 'M', 'F')) then return 'nivel no corresponde'; end if;
  return null;
end;
$$;

-- true si el ítem debe destacarse como problema para el admin.
create or replace function private.es_falla(tipo public."TipoRespuesta", debe_haber int, invertido boolean, r jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when tipo = 'CANTIDAD' then coalesce((r -> 'existente')::numeric, 0) < coalesce(debe_haber, 1)
    when r ->> 'respuesta' = 'NA' then false
    when (case when invertido then r ->> 'respuesta' = 'SI' else r ->> 'respuesta' = 'NO' end) then true
    when tipo = 'SI_NO_NIVEL' then coalesce(r ->> 'nivel' = 'R', false)
    else coalesce(r ->> 'estado' in ('M', 'I'), false)
  end;
$$;

-- Cada ítem activo de la planilla con la respuesta recibida (null si no vino).
create or replace function private.items_con_respuesta(p_tipo public."TipoControl", p_items jsonb)
returns table (
  seccion text, seccion_orden int, tipo_respuesta public."TipoRespuesta",
  item_id uuid, item text, item_orden int, debe_haber int, invertido boolean, r jsonb
)
language sql
stable
set search_path = ''
as $$
  select s.nombre, s.orden, s.tipo_respuesta, i.id, i.nombre, i.orden, i.debe_haber, i.invertido, resp.r
  from public.seccion s
  join public.item i on i.seccion_id = s.id and i.activo
  left join lateral (
    select e as r from jsonb_array_elements(p_items) e where e ->> 'itemId' = i.id::text limit 1
  ) resp on true
  where s.tipo_control = p_tipo;
$$;

-- 3. Guardar (crear o corregir) ----------------------------------------------------------------
-- p_datos: { tipo, movilId, fecha, servicio, observacion, encabezado, items: [{ itemId, respuesta, estado, nivel, existente, nota }] }
create or replace function public.guardar_control(p_datos jsonb, p_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rol public."Rol";
  v_tipo public."TipoControl";
  v_movil uuid;
  v_fecha date;
  v_encabezado jsonb;
  v_items jsonb := p_datos -> 'items';
  v_enc jsonb := coalesce(p_datos -> 'encabezado', '{}');
  v_errores text[];
  v_control public.control;
begin
  select rol into v_rol from public.usuario where id = v_uid and activo;
  if v_rol is null then raise exception 'No tenés permiso para cargar controles' using errcode = '42501'; end if;

  if p_datos ->> 'tipo' not in ('MECANICO', 'MATERIAL') or p_datos ->> 'tipo' is null then
    raise exception 'Tipo de control inválido';
  end if;
  v_tipo := (p_datos ->> 'tipo')::public."TipoControl";
  if not (v_rol = 'ADMIN' or (v_rol = 'CHOFER' and v_tipo = 'MECANICO') or (v_rol = 'RESPONDIENTE' and v_tipo = 'MATERIAL')) then
    raise exception 'Tu rol no carga este tipo de control' using errcode = '42501';
  end if;

  if coalesce(p_datos ->> 'movilId', '') !~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' then
    raise exception 'Elegí el móvil';
  end if;
  v_movil := (p_datos ->> 'movilId')::uuid;
  if not exists (select 1 from public.movil where id = v_movil and activo) then
    raise exception 'El móvil no existe o está inactivo';
  end if;

  if coalesce(p_datos ->> 'fecha', '') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha inválida'; end if;
  begin
    v_fecha := (p_datos ->> 'fecha')::date;
  exception when others then
    raise exception 'Fecha inválida';
  end;

  if jsonb_typeof(v_enc) <> 'object' then raise exception 'Encabezado inválido'; end if;
  if v_tipo = 'MECANICO' then
    if v_enc ->> 'combustible' is not null and v_enc ->> 'combustible' not in ('R', 'M', 'F') then
      raise exception 'Nivel de combustible inválido';
    end if;
    v_encabezado := jsonb_build_object(
      'grupo', private.texto(v_enc -> 'grupo', 30, 'Grupo'),
      'numero', private.texto(v_enc -> 'numero', 30, 'Número'),
      'aCargoCompania', private.texto(v_enc -> 'aCargoCompania', 100, 'A cargo de la compañía'),
      'combustible', v_enc ->> 'combustible'
    );
  else
    v_encabezado := jsonb_build_object(
      'aCargoMovil', private.texto(v_enc -> 'aCargoMovil', 100, 'A cargo del móvil'),
      'controlAcompanante', private.texto(v_enc -> 'controlAcompanante', 100, 'Control del acompañante')
    );
  end if;

  -- Ítems: todos los activos de la planilla, cada uno una vez y bien respondido.
  if jsonb_typeof(v_items) is distinct from 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'La planilla no tiene respuestas';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_items) e
    where coalesce(e ->> 'itemId', '') !~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
  ) then
    raise exception 'Hay ítems inválidos (recargá la página)';
  end if;
  if (select count(*) <> count(distinct e ->> 'itemId') from jsonb_array_elements(v_items) e) then
    raise exception 'Hay ítems repetidos';
  end if;

  select coalesce(array_agg(format('%s › %s: %s', x.seccion, x.item, x.error) order by x.seccion_orden, x.item_orden), '{}')
  into v_errores
  from (
    select ir.*, private.validar_respuesta(ir.tipo_respuesta, ir.r) as error
    from private.items_con_respuesta(v_tipo, v_items) ir
  ) x
  where x.error is not null;

  if exists (
    select 1 from jsonb_array_elements(v_items) e
    where (e ->> 'itemId')::uuid not in (select ir.item_id from private.items_con_respuesta(v_tipo, v_items) ir)
  ) then
    v_errores := v_errores || 'Hay ítems que no pertenecen a la planilla (recargá la página)';
  end if;

  if cardinality(v_errores) > 0 then
    raise exception 'La planilla está incompleta' using detail = to_jsonb(v_errores)::text;
  end if;

  -- Crear o corregir.
  if p_id is null then
    insert into public.control (tipo, movil_id, autor_id, fecha, servicio, encabezado, observacion)
    values (
      v_tipo, v_movil, v_uid, v_fecha,
      private.texto(p_datos -> 'servicio', 100, 'Servicio'),
      v_encabezado,
      private.texto(p_datos -> 'observacion', 1000, 'Observación')
    )
    returning * into v_control;
  else
    select * into v_control from public.control where id = p_id for update;
    if not found then raise exception 'Control no encontrado'; end if;
    if v_control.autor_id <> v_uid then
      raise exception 'Solo quien cargó el control puede corregirlo' using errcode = '42501';
    end if;
    if v_control.estado = 'APROBADO' then raise exception 'El control ya fue aprobado'; end if;
    if v_control.tipo <> v_tipo then raise exception 'No se puede cambiar el tipo de control'; end if;

    delete from public.control_item where control_id = p_id;
    -- Vuelve a quedar pendiente; se conserva el comentario de la revisión anterior.
    update public.control set
      movil_id = v_movil,
      fecha = v_fecha,
      servicio = private.texto(p_datos -> 'servicio', 100, 'Servicio'),
      encabezado = v_encabezado,
      observacion = private.texto(p_datos -> 'observacion', 1000, 'Observación'),
      estado = 'PENDIENTE'
    where id = p_id
    returning * into v_control;
  end if;

  insert into public.control_item (control_id, item_id, respuesta, estado, nivel, existente, nota, falla)
  select
    v_control.id,
    ir.item_id,
    case when ir.tipo_respuesta = 'CANTIDAD' then null else ir.r ->> 'respuesta' end,
    case when ir.tipo_respuesta = 'CANTIDAD' then null else ir.r ->> 'estado' end,
    case when ir.tipo_respuesta = 'SI_NO_NIVEL' then ir.r ->> 'nivel' end,
    case when ir.tipo_respuesta = 'CANTIDAD' then (ir.r -> 'existente')::numeric::int end,
    nullif(btrim(ir.r ->> 'nota'), ''),
    private.es_falla(ir.tipo_respuesta, ir.debe_haber, ir.invertido, ir.r)
  from private.items_con_respuesta(v_tipo, v_items) ir;

  update public.control
  set cantidad_fallas = (select count(*) from public.control_item where control_id = v_control.id and falla)
  where id = v_control.id;

  return jsonb_build_object('id', v_control.id, 'numero', v_control.numero);
end;
$$;

-- 4. Revisión del admin ------------------------------------------------------------------------
create or replace function public.revisar_control(p_id uuid, p_estado text, p_comentario text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comentario text := nullif(btrim(p_comentario), '');
  v_estado public."EstadoControl";
begin
  if not private.es_admin() then raise exception 'Solo el administrador revisa controles' using errcode = '42501'; end if;
  if p_estado is null or p_estado not in ('APROBADO', 'OBSERVADO') then raise exception 'Estado de revisión inválido'; end if;
  if p_estado = 'OBSERVADO' and v_comentario is null then raise exception 'Indicá qué hay que corregir'; end if;
  if char_length(v_comentario) > 1000 then raise exception 'El comentario admite hasta 1000 caracteres'; end if;

  select estado into v_estado from public.control where id = p_id for update;
  if not found then raise exception 'Control no encontrado'; end if;
  if v_estado <> 'PENDIENTE' then raise exception 'Solo se revisan controles pendientes'; end if;

  update public.control set
    estado = p_estado::public."EstadoControl",
    comentario_revision = v_comentario,
    revisor_id = auth.uid(),
    revisado_el = now()
  where id = p_id;

  return jsonb_build_object('id', p_id, 'estado', p_estado);
end;
$$;

-- 5. Lecturas ----------------------------------------------------------------------------------
-- El admin ve todos los controles; los demás, solo los propios.

create or replace function public.listar_controles(
  p_tipo text default null,
  p_estado text default null,
  p_movil_id uuid default null,
  p_desde date default null,
  p_hasta date default null,
  p_pagina int default 1
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := private.es_admin();
  v_pagina int := greatest(coalesce(p_pagina, 1), 1);
  por_pagina constant int := 20;
  v_total int;
  v_filas jsonb;
begin
  if not private.usuario_activo() then raise exception 'No tenés permiso para ver controles' using errcode = '42501'; end if;

  with filtrados as (
    select c.* from public.control c
    where (v_admin or c.autor_id = v_uid)
      and (p_tipo is null or c.tipo::text = p_tipo)
      and (p_estado is null or c.estado::text = p_estado)
      and (p_movil_id is null or c.movil_id = p_movil_id)
      and (p_desde is null or c.fecha >= p_desde)
      and (p_hasta is null or c.fecha <= p_hasta)
  )
  select
    (select count(*) from filtrados),
    coalesce((
      select jsonb_agg(fila order by fecha desc, numero desc)
      from (
        select
          c.fecha, c.numero,
          jsonb_build_object(
            'id', c.id, 'numero', c.numero, 'tipo', c.tipo, 'fecha', c.fecha, 'servicio', c.servicio,
            'estado', c.estado, 'cantidadFallas', c.cantidad_fallas, 'creadoEl', c.creado_el,
            'movil', jsonb_build_object('codigo', m.codigo),
            'autor', jsonb_build_object('nombre', a.nombre, 'codigo', a.codigo)
          ) as fila
        from filtrados c
        join public.movil m on m.id = c.movil_id
        join public.usuario a on a.id = c.autor_id
        order by c.fecha desc, c.numero desc
        limit por_pagina offset (v_pagina - 1) * por_pagina
      ) x
    ), '[]')
  into v_total, v_filas;

  return jsonb_build_object('total', v_total, 'pagina', v_pagina, 'porPagina', por_pagina, 'filas', v_filas);
end;
$$;

create or replace function public.obtener_control(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_control public.control;
begin
  if not private.usuario_activo() then raise exception 'No tenés permiso para ver controles' using errcode = '42501'; end if;
  select * into v_control from public.control where id = p_id;
  if not found then raise exception 'Control no encontrado'; end if;
  if v_control.autor_id <> v_uid and not private.es_admin() then
    raise exception 'No tenés permiso para ver este control' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'id', c.id, 'numero', c.numero, 'tipo', c.tipo, 'fecha', c.fecha, 'servicio', c.servicio,
      'encabezado', c.encabezado, 'observacion', c.observacion, 'estado', c.estado,
      'cantidadFallas', c.cantidad_fallas, 'comentarioRevision', c.comentario_revision,
      'revisadoEl', c.revisado_el, 'creadoEl', c.creado_el,
      'movil', jsonb_build_object('id', m.id, 'codigo', m.codigo, 'descripcion', m.descripcion),
      'autor', jsonb_build_object('id', a.id, 'nombre', a.nombre, 'codigo', a.codigo, 'rol', a.rol),
      'revisor', case when r.id is null then null else jsonb_build_object('nombre', r.nombre, 'codigo', r.codigo) end,
      'secciones', coalesce((
        select jsonb_agg(sec order by orden)
        from (
          select s.orden, jsonb_build_object(
            'id', s.id, 'nombre', s.nombre, 'orden', s.orden, 'tipoRespuesta', s.tipo_respuesta, 'nota', s.nota,
            'items', jsonb_agg(jsonb_build_object(
              'itemId', ci.item_id, 'nombre', i.nombre, 'debeHaber', i.debe_haber, 'unidad', i.unidad,
              'invertido', i.invertido, 'respuesta', ci.respuesta, 'estado', ci.estado, 'nivel', ci.nivel,
              'existente', ci.existente, 'nota', ci.nota, 'falla', ci.falla
            ) order by i.orden)
          ) as sec
          from public.control_item ci
          join public.item i on i.id = ci.item_id
          join public.seccion s on s.id = i.seccion_id
          where ci.control_id = c.id
          group by s.id
        ) x
      ), '[]')
    )
    from public.control c
    join public.movil m on m.id = c.movil_id
    join public.usuario a on a.id = c.autor_id
    left join public.usuario r on r.id = c.revisor_id
    where c.id = p_id
  );
end;
$$;

-- Tablero de inicio: cantidades por tipo y estado, y último control de cada móvil activo.
create or replace function public.resumen_controles()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := private.es_admin();
begin
  if not private.usuario_activo() then raise exception 'No tenés permiso para ver controles' using errcode = '42501'; end if;

  return jsonb_build_object(
    'conteos', coalesce((
      select jsonb_agg(jsonb_build_object('tipo', tipo, 'estado', estado, 'cantidad', cantidad))
      from (
        select tipo, estado, count(*) as cantidad from public.control
        where v_admin or autor_id = v_uid
        group by tipo, estado
      ) x
    ), '[]'),
    'moviles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'codigo', m.codigo, 'descripcion', m.descripcion,
        'mecanico', (
          select jsonb_build_object('id', c.id, 'numero', c.numero, 'fecha', c.fecha, 'estado', c.estado, 'cantidadFallas', c.cantidad_fallas)
          from public.control c
          where c.movil_id = m.id and c.tipo = 'MECANICO' and (v_admin or c.autor_id = v_uid)
          order by c.fecha desc, c.numero desc limit 1
        ),
        'material', (
          select jsonb_build_object('id', c.id, 'numero', c.numero, 'fecha', c.fecha, 'estado', c.estado, 'cantidadFallas', c.cantidad_fallas)
          from public.control c
          where c.movil_id = m.id and c.tipo = 'MATERIAL' and (v_admin or c.autor_id = v_uid)
          order by c.fecha desc, c.numero desc limit 1
        )
      ) order by m.codigo)
      from public.movil m
      where m.activo
    ), '[]')
  );
end;
$$;

-- 6. Permisos ----------------------------------------------------------------------------------
-- Solo usuarios con sesión pueden llamar a las funciones; ellas verifican rol y autoría.
revoke execute on function
  public.guardar_control(jsonb, uuid),
  public.revisar_control(uuid, text, text),
  public.listar_controles(text, text, uuid, date, date, int),
  public.obtener_control(uuid),
  public.resumen_controles()
from public, anon;

grant execute on function
  public.guardar_control(jsonb, uuid),
  public.revisar_control(uuid, text, text),
  public.listar_controles(text, text, uuid, date, date, int),
  public.obtener_control(uuid),
  public.resumen_controles()
to authenticated;

revoke execute on function
  private.texto(jsonb, int, text),
  private.validar_respuesta(public."TipoRespuesta", jsonb),
  private.es_falla(public."TipoRespuesta", int, boolean, jsonb),
  private.items_con_respuesta(public."TipoControl", jsonb)
from public, anon, authenticated;

-- control y control_item: sin acceso directo (RLS activo y sin políticas).
revoke all on public.control, public.control_item from authenticated;

commit;
