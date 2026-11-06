-- Marcar productos como comprados o pendientes, de forma atómica.
-- Marcar como comprado: actualiza el producto, registra la compra y, si hay importe, crea el gasto.

create function public.marcar_producto_comprado(p_producto uuid, p_importe numeric default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producto public.productos;
  v_gasto uuid := null;
begin
  select * into v_producto from public.productos where id = p_producto;
  if not found or not public.es_miembro(v_producto.grupo_id) then
    raise exception 'Producto no encontrado';
  end if;
  if p_importe is not null and p_importe < 0 then
    raise exception 'El importe no puede ser negativo';
  end if;

  update public.productos
  set comprado = true, comprado_en = now()
  where id = p_producto;

  if p_importe is not null and p_importe > 0 then
    insert into public.gastos (grupo_id, fecha, importe, categoria_id, descripcion)
    values (
      v_producto.grupo_id,
      (now() at time zone 'Europe/Madrid')::date,
      p_importe,
      v_producto.categoria_id,
      v_producto.nombre
    )
    returning id into v_gasto;
  end if;

  insert into public.compras (grupo_id, producto_id, gasto_id)
  values (v_producto.grupo_id, p_producto, v_gasto);

  return v_gasto;
end;
$$;

-- Volver a pendiente. El historial de compras se conserva.
create function public.marcar_producto_pendiente(p_producto uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo uuid;
begin
  select grupo_id into v_grupo from public.productos where id = p_producto;
  if v_grupo is null or not public.es_miembro(v_grupo) then
    raise exception 'Producto no encontrado';
  end if;

  update public.productos set comprado = false, comprado_en = null where id = p_producto;
end;
$$;

revoke execute on function public.marcar_producto_comprado(uuid, numeric),
  public.marcar_producto_pendiente(uuid) from public, anon;
grant execute on function public.marcar_producto_comprado(uuid, numeric),
  public.marcar_producto_pendiente(uuid) to authenticated;
