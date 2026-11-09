-- Privacidad por módulo.
-- Cada registro tiene un dueño (created_by). Por defecto, todos los miembros del grupo ven los datos
-- de cada módulo. El dueño puede ocultar un módulo a un miembro concreto (tabla ocultamientos).
-- Módulos: 'estados' (estados y registros), 'gimnasio' (plan y marcas), 'compras' (gastos, compras, ingresos).
-- Las rutinas, los ejercicios, las categorías y los productos siguen siendo compartidos (biblioteca del grupo).

-- 1) Ocultamientos
create table public.ocultamientos (
  grupo_id    uuid not null references public.grupos (id) on delete cascade,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  viewer_id   uuid not null references auth.users (id) on delete cascade,
  modulo      text not null check (modulo in ('estados', 'gimnasio', 'compras')),
  created_at  timestamptz not null default now(),
  primary key (grupo_id, owner_id, viewer_id, modulo),
  check (owner_id <> viewer_id)
);

revoke all on public.ocultamientos from anon;
grant select, insert, delete on public.ocultamientos to authenticated;
alter table public.ocultamientos enable row level security;
create policy "ocultamientos: gestiona su dueño" on public.ocultamientos
  for all to authenticated
  using (owner_id = auth.uid() and public.es_miembro(grupo_id))
  with check (owner_id = auth.uid() and public.es_miembro(grupo_id));

-- 2) ¿Puede el usuario actual ver los datos de 'p_dueno' en el módulo 'p_modulo'?
create function public.puede_ver(p_grupo uuid, p_dueno uuid, p_modulo text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.es_miembro(p_grupo) and (
    p_dueno = auth.uid()
    or not exists (
      select 1 from public.ocultamientos o
      where o.grupo_id = p_grupo
        and o.owner_id = p_dueno
        and o.viewer_id = auth.uid()
        and o.modulo = p_modulo
    )
  );
$$;

revoke execute on function public.puede_ver(uuid, uuid, text) from public, anon;
grant execute on function public.puede_ver(uuid, uuid, text) to authenticated;

-- 3) Dueño obligatorio en los datos personales. Lo que no tenga dueño pasa al administrador del grupo.
do $$
declare
  t text;
begin
  foreach t in array array['estados_trabajo', 'registros_trabajo', 'gastos', 'compras', 'ingresos'] loop
    execute format($f$
      update public.%1$I x set created_by = (
        select m.user_id from public.miembros_grupo m
        where m.grupo_id = x.grupo_id and m.rol = 'admin'
        order by m.unido_en limit 1
      ) where x.created_by is null$f$, t);
    execute format('alter table public.%I alter column created_by set not null', t);
  end loop;
end $$;

-- 4) Estados: cada persona tiene su propia lista (el nombre se repite entre personas, no en la misma).
alter table public.estados_trabajo drop constraint estados_trabajo_grupo_id_nombre_key;
alter table public.estados_trabajo add constraint estados_trabajo_dueno_nombre_key unique (grupo_id, created_by, nombre);

drop policy "estados_trabajo: acceso de miembros" on public.estados_trabajo;
create policy "estados: ver según compartir" on public.estados_trabajo
  for select to authenticated using (public.puede_ver(grupo_id, created_by, 'estados'));
create policy "estados: crear propios" on public.estados_trabajo
  for insert to authenticated with check (created_by = auth.uid() and public.es_miembro(grupo_id));
create policy "estados: editar propios" on public.estados_trabajo
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid() and public.es_miembro(grupo_id));
create policy "estados: borrar propios" on public.estados_trabajo
  for delete to authenticated using (created_by = auth.uid());

drop policy "registros_trabajo: acceso de miembros" on public.registros_trabajo;
create policy "registros: ver según compartir" on public.registros_trabajo
  for select to authenticated using (public.puede_ver(grupo_id, created_by, 'estados'));
create policy "registros: crear con estados propios" on public.registros_trabajo
  for insert to authenticated with check (
    created_by = auth.uid() and public.es_miembro(grupo_id)
    and exists (select 1 from public.estados_trabajo e where e.id = estado_id and e.created_by = auth.uid())
  );
create policy "registros: editar propios" on public.registros_trabajo
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "registros: borrar propios" on public.registros_trabajo
  for delete to authenticated using (created_by = auth.uid());

-- 5) Gimnasio: plan y marcas. Se ven según compartir; solo se escriben las propias.
drop policy "plan: lectura de miembros" on public.plan_semanal;
create policy "plan: ver según compartir" on public.plan_semanal
  for select to authenticated using (public.puede_ver(grupo_id, user_id, 'gimnasio'));

drop policy "marcas: lectura de miembros" on public.sesion_ejercicios;
create policy "marcas: ver según compartir" on public.sesion_ejercicios
  for select to authenticated using (public.puede_ver(grupo_id, user_id, 'gimnasio'));

-- 6) Compras: gastos, historial de compras e ingresos. Se ven según compartir; solo se escriben los propios.
drop policy "gastos: acceso de miembros" on public.gastos;
create policy "gastos: ver según compartir" on public.gastos
  for select to authenticated using (public.puede_ver(grupo_id, created_by, 'compras'));
create policy "gastos: crear propios" on public.gastos
  for insert to authenticated with check (created_by = auth.uid() and public.es_miembro(grupo_id));
create policy "gastos: editar propios" on public.gastos
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "gastos: borrar propios" on public.gastos
  for delete to authenticated using (created_by = auth.uid());

drop policy "compras: acceso de miembros" on public.compras;
create policy "compras_historial: ver según compartir" on public.compras
  for select to authenticated using (public.puede_ver(grupo_id, created_by, 'compras'));
create policy "compras_historial: crear propias" on public.compras
  for insert to authenticated with check (created_by = auth.uid() and public.es_miembro(grupo_id));
create policy "compras_historial: borrar propias" on public.compras
  for delete to authenticated using (created_by = auth.uid());

drop policy "ingresos: acceso de miembros" on public.ingresos;
create policy "ingresos: ver según compartir" on public.ingresos
  for select to authenticated using (public.puede_ver(grupo_id, created_by, 'compras'));
create policy "ingresos: crear propios" on public.ingresos
  for insert to authenticated with check (created_by = auth.uid() and public.es_miembro(grupo_id));
create policy "ingresos: editar propios" on public.ingresos
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "ingresos: borrar propios" on public.ingresos
  for delete to authenticated using (created_by = auth.uid());

-- 7) Widget de estado: cada código de dispositivo pertenece a una persona y trabaja con SUS estados.
create or replace function public.usuario_de_token(p_token text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid;
begin
  select d.user_id into v_usuario
  from public.dispositivos_token d
  where d.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and d.revocado_en is null;
  if v_usuario is null then
    raise exception 'Código de dispositivo no válido' using errcode = '28000';
  end if;
  return v_usuario;
end;
$$;

drop function public.ultimo_registro_hoy(uuid);
create function public.ultimo_registro_hoy(p_grupo uuid, p_usuario uuid)
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
    and r.created_by = p_usuario
    and e.created_by = p_usuario
    and r.marcado_en >= public.inicio_del_dia_madrid()
  order by r.marcado_en desc
  limit 1;
$$;

create or replace function public.estado_actual_dispositivo(p_token text)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.usuario_de_token(p_token);
  v_grupo uuid;
  v_ultimo record;
  v_siguiente text;
  v_anterior text;
begin
  select grupo_id into v_grupo from public.miembros_grupo where user_id = v_usuario limit 1;
  select * into v_ultimo from public.ultimo_registro_hoy(v_grupo, v_usuario);

  if v_ultimo.estado_id is null then
    select nombre into v_siguiente from public.estados_trabajo
      where grupo_id = v_grupo and created_by = v_usuario and activo order by orden, nombre limit 1;
    select nombre into v_anterior from public.estados_trabajo
      where grupo_id = v_grupo and created_by = v_usuario and activo order by orden desc, nombre desc limit 1;
  else
    select nombre into v_siguiente from public.estados_trabajo
      where grupo_id = v_grupo and created_by = v_usuario and activo and orden > v_ultimo.orden
      order by orden, nombre limit 1;
    select nombre into v_anterior from public.estados_trabajo
      where grupo_id = v_grupo and created_by = v_usuario and activo and orden < v_ultimo.orden
      order by orden desc, nombre desc limit 1;
    if v_siguiente is null then
      select nombre into v_siguiente from public.estados_trabajo
        where grupo_id = v_grupo and created_by = v_usuario and activo order by orden, nombre limit 1;
    end if;
    if v_anterior is null then
      select nombre into v_anterior from public.estados_trabajo
        where grupo_id = v_grupo and created_by = v_usuario and activo order by orden desc, nombre desc limit 1;
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

create or replace function public.cambiar_estado_dispositivo(p_token text, p_direccion text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := public.usuario_de_token(p_token);
  v_grupo uuid;
  v_ultimo record;
  v_destino record;
  v_registro timestamptz;
begin
  if p_direccion not in ('siguiente', 'anterior') then
    raise exception 'Dirección no válida: usa siguiente o anterior';
  end if;
  select grupo_id into v_grupo from public.miembros_grupo where user_id = v_usuario limit 1;
  select * into v_ultimo from public.ultimo_registro_hoy(v_grupo, v_usuario);

  if p_direccion = 'siguiente' then
    select id, nombre, orden into v_destino from public.estados_trabajo
      where grupo_id = v_grupo and created_by = v_usuario and activo
        and (v_ultimo.estado_id is null or orden > v_ultimo.orden)
      order by orden, nombre limit 1;
    if v_destino.id is null then
      select id, nombre, orden into v_destino from public.estados_trabajo
        where grupo_id = v_grupo and created_by = v_usuario and activo order by orden, nombre limit 1;
    end if;
  else
    select id, nombre, orden into v_destino from public.estados_trabajo
      where grupo_id = v_grupo and created_by = v_usuario and activo
        and (v_ultimo.estado_id is not null and orden < v_ultimo.orden)
      order by orden desc, nombre desc limit 1;
    if v_destino.id is null then
      select id, nombre, orden into v_destino from public.estados_trabajo
        where grupo_id = v_grupo and created_by = v_usuario and activo order by orden desc, nombre desc limit 1;
    end if;
  end if;

  if v_destino.id is null then
    raise exception 'No tienes estados activos';
  end if;

  insert into public.registros_trabajo (grupo_id, estado_id, created_by)
  values (v_grupo, v_destino.id, v_usuario)
  returning marcado_en into v_registro;

  return json_build_object('actual', v_destino.nombre, 'marcado_en', v_registro);
end;
$$;

revoke execute on function public.usuario_de_token(text) from public, anon, authenticated;

-- Funciones internas: nunca se ejecutan directamente desde la API.
revoke execute on function public.ultimo_registro_hoy(uuid, uuid), public.grupo_de_token(text)
  from public, anon, authenticated;
