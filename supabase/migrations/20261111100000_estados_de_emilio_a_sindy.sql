-- Los estados de ejemplo que se crearon para Emilio pertenecen a Sindy.
-- Mueve sus estados (y las marcas hechas con ellos) a Sindy y deja a Emilio sin estados.
-- Es un cambio de datos de una sola vez: si no existe exactamente un Emilio y una Sindy en el
-- mismo grupo (por ejemplo, en una base nueva), no hace nada.
-- Antes guarda una copia de seguridad en el esquema "respaldo", que la API no expone.

do $$
declare
  v_grupo   uuid;
  v_emilio  uuid;
  v_sindy   uuid;
  e         record;
  v_destino uuid;
  v_movidos int := 0;
  v_fusion  int := 0;
  v_regs    int := 0;
begin
  if (select count(*) from public.miembros_grupo where lower(trim(nombre)) = 'emilio') = 1
     and (select count(*) from public.miembros_grupo where lower(trim(nombre)) = 'sindy') = 1 then
    select m.grupo_id, m.user_id into v_grupo, v_emilio
      from public.miembros_grupo m where lower(trim(m.nombre)) = 'emilio';
    select m.user_id into v_sindy
      from public.miembros_grupo m where lower(trim(m.nombre)) = 'sindy' and m.grupo_id = v_grupo;
  end if;

  if v_sindy is null then
    raise notice 'Emilio y Sindy no están en el mismo grupo: no se mueve nada';
    return;
  end if;

  create schema if not exists respaldo;
  revoke all on schema respaldo from public, anon, authenticated;
  create table if not exists respaldo.estados_trabajo as select * from public.estados_trabajo;
  create table if not exists respaldo.registros_trabajo as select * from public.registros_trabajo;

  -- Cada estado de Emilio pasa a Sindy. Si Sindy ya tiene uno con ese nombre, las marcas de Emilio
  -- pasan a ese estado y el duplicado de Emilio se borra.
  for e in
    select s.id, s.nombre from public.estados_trabajo s
    where s.grupo_id = v_grupo and s.created_by = v_emilio
  loop
    select s.id into v_destino from public.estados_trabajo s
      where s.grupo_id = v_grupo and s.created_by = v_sindy and s.nombre = e.nombre;

    if v_destino is null then
      update public.estados_trabajo set created_by = v_sindy where id = e.id;
      v_movidos := v_movidos + 1;
    else
      update public.registros_trabajo set estado_id = v_destino where estado_id = e.id;
      delete from public.estados_trabajo where id = e.id;
      v_fusion := v_fusion + 1;
    end if;
  end loop;

  -- Las marcas de Emilio sobre estados que ahora son de Sindy pasan a ser de Sindy.
  update public.registros_trabajo r set created_by = v_sindy
    where r.grupo_id = v_grupo
      and r.created_by = v_emilio
      and exists (select 1 from public.estados_trabajo s where s.id = r.estado_id and s.created_by = v_sindy);
  get diagnostics v_regs = row_count;

  raise notice 'Estados movidos a Sindy: %, fusionados con uno existente: %, marcas reasignadas: %',
    v_movidos, v_fusion, v_regs;
end $$;
