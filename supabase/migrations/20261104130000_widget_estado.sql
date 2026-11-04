-- Widget de estado (Scriptable u otros clientes sin sesión de usuario).
--
-- Modelo:
--   * Cada usuario genera códigos de dispositivo desde la app. El código se muestra una sola vez;
--     en la base solo se guarda su hash SHA-256.
--   * El widget llama a funciones con el código. Esas funciones son el único acceso anónimo.
--   * "Hoy" se calcula en la zona horaria de Madrid.
--   * La secuencia de estados es la lista activa ordenada por "orden".

create table public.dispositivos_token (
  id            uuid primary key default gen_random_uuid(),
  grupo_id      uuid not null references public.grupos (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  nombre        text not null check (length(trim(nombre)) > 0),
  token_hash    text not null unique,
  created_at    timestamptz not null default now(),
  revocado_en   timestamptz
);

alter table public.dispositivos_token enable row level security;
revoke all on public.dispositivos_token from anon, authenticated;

-- Obtiene el grupo de un código válido o falla.
create function public.grupo_de_token(p_token text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_grupo uuid;
begin
  select d.grupo_id into v_grupo
  from public.dispositivos_token d
  where d.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and d.revocado_en is null;

  if v_grupo is null then
    raise exception 'Código de dispositivo no válido' using errcode = '28000';
  end if;
  return v_grupo;
end;
$$;

-- Inicio del día actual en Madrid, expresado como timestamptz.
create function public.inicio_del_dia_madrid()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid';
$$;

-- Último registro de hoy del grupo (o null si no hay ninguno).
create function public.ultimo_registro_hoy(p_grupo uuid)
returns table (estado_id uuid, nombre text, orden integer, marcado_en timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.estado_id, e.nombre, e.orden, r.marcado_en
  from public.registros_trabajo r
  join public.estados_trabajo e on e.grupo_id = r.grupo_id and e.id = r.estado_id
  where r.grupo_id = p_grupo
    and r.marcado_en >= public.inicio_del_dia_madrid()
  order by r.marcado_en desc
  limit 1;
$$;

-- Estado actual del día y los nombres de los estados vecinos en la secuencia.
create function public.estado_actual_dispositivo(p_token text)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_grupo uuid := public.grupo_de_token(p_token);
  v_ultimo record;
  v_siguiente text;
  v_anterior text;
begin
  select * into v_ultimo from public.ultimo_registro_hoy(v_grupo);

  if v_ultimo.estado_id is null then
    select nombre into v_siguiente from public.estados_trabajo
      where grupo_id = v_grupo and activo order by orden, nombre limit 1;
    select nombre into v_anterior from public.estados_trabajo
      where grupo_id = v_grupo and activo order by orden desc, nombre desc limit 1;
  else
    select nombre into v_siguiente from public.estados_trabajo
      where grupo_id = v_grupo and activo and orden > v_ultimo.orden order by orden, nombre limit 1;
    select nombre into v_anterior from public.estados_trabajo
      where grupo_id = v_grupo and activo and orden < v_ultimo.orden order by orden desc, nombre desc limit 1;
    -- Al final o al principio de la secuencia se da la vuelta.
    if v_siguiente is null then
      select nombre into v_siguiente from public.estados_trabajo
        where grupo_id = v_grupo and activo order by orden, nombre limit 1;
    end if;
    if v_anterior is null then
      select nombre into v_anterior from public.estados_trabajo
        where grupo_id = v_grupo and activo order by orden desc, nombre desc limit 1;
    end if;
  end if;

  return json_build_object(
    'actual', v_ultimo.nombre,
    'marcado_en', v_ultimo.marcado_en,
    'siguiente', v_siguiente,
    'anterior', v_anterior
  );
end;
$$;

-- Registra el estado siguiente o anterior de la secuencia y devuelve el estado registrado.
create function public.cambiar_estado_dispositivo(p_token text, p_direccion text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo uuid := public.grupo_de_token(p_token);
  v_ultimo record;
  v_destino record;
  v_registro timestamptz;
begin
  if p_direccion not in ('siguiente', 'anterior') then
    raise exception 'Dirección no válida: usa siguiente o anterior';
  end if;

  select * into v_ultimo from public.ultimo_registro_hoy(v_grupo);

  if p_direccion = 'siguiente' then
    select id, nombre, orden into v_destino from public.estados_trabajo
      where grupo_id = v_grupo and activo and (v_ultimo.estado_id is null or orden > v_ultimo.orden)
      order by orden, nombre limit 1;
    if v_destino.id is null then
      select id, nombre, orden into v_destino from public.estados_trabajo
        where grupo_id = v_grupo and activo order by orden, nombre limit 1;
    end if;
  else
    select id, nombre, orden into v_destino from public.estados_trabajo
      where grupo_id = v_grupo and activo and (v_ultimo.estado_id is not null and orden < v_ultimo.orden)
      order by orden desc, nombre desc limit 1;
    if v_destino.id is null then
      select id, nombre, orden into v_destino from public.estados_trabajo
        where grupo_id = v_grupo and activo order by orden desc, nombre desc limit 1;
    end if;
  end if;

  if v_destino.id is null then
    raise exception 'El grupo no tiene estados activos';
  end if;

  insert into public.registros_trabajo (grupo_id, estado_id)
  values (v_grupo, v_destino.id)
  returning marcado_en into v_registro;

  return json_build_object('actual', v_destino.nombre, 'marcado_en', v_registro);
end;
$$;

-- Gestión desde la app (solo usuarios autenticados miembros del grupo).
create function public.crear_token_dispositivo(p_nombre text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo uuid;
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select m.grupo_id into v_grupo from public.miembros_grupo m where m.user_id = auth.uid() limit 1;
  if v_grupo is null then
    raise exception 'No perteneces a ningún grupo';
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into public.dispositivos_token (grupo_id, user_id, nombre, token_hash)
  values (v_grupo, auth.uid(), trim(p_nombre), encode(sha256(convert_to(v_token, 'UTF8')), 'hex'));

  return v_token;
end;
$$;

create function public.revocar_token_dispositivo(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.dispositivos_token
  set revocado_en = now()
  where id = p_id
    and user_id = auth.uid()
    and revocado_en is null;
  if not found then
    raise exception 'Código no encontrado o ya revocado';
  end if;
end;
$$;

-- Permisos de funciones: por defecto PUBLIC puede ejecutarlas, así que se restringe todo.
revoke execute on function public.grupo_de_token(text), public.inicio_del_dia_madrid(),
  public.ultimo_registro_hoy(uuid), public.crear_token_dispositivo(text),
  public.revocar_token_dispositivo(uuid), public.estado_actual_dispositivo(text),
  public.cambiar_estado_dispositivo(text, text)
  from public, anon, authenticated;

-- Internas: solo las usan las otras funciones.
-- Gestión desde la app: usuarios autenticados.
grant execute on function public.crear_token_dispositivo(text),
  public.revocar_token_dispositivo(uuid) to authenticated;
-- Acceso del widget: sin sesión, solo con el código del dispositivo.
grant execute on function public.estado_actual_dispositivo(text),
  public.cambiar_estado_dispositivo(text, text) to anon, authenticated;
