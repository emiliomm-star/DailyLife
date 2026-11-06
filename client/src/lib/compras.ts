import { supabase } from '@/lib/supabase';

export type Categoria = {
  id: string;
  nombre: string;
  icono: string | null;
  color: string | null;
  orden: number;
  activo: boolean;
};

/** Cuántos productos hay pendientes y comprados en cada categoría. */
export type ResumenCategoria = { pendientes: number; comprados: number };

/** Categorías del grupo. Por defecto solo las activas. */
export async function listarCategorias(grupoId: string, incluirInactivas = false): Promise<Categoria[]> {
  let consulta = supabase
    .from('categorias')
    .select('id, nombre, icono, color, orden, activo')
    .eq('grupo_id', grupoId)
    .order('orden')
    .order('nombre');
  if (!incluirInactivas) consulta = consulta.eq('activo', true);

  const { data, error } = await consulta;
  if (error) throw error;
  return data ?? [];
}

/** Resumen de productos por categoría, de una sola consulta. */
export async function resumenPorCategoria(grupoId: string): Promise<Record<string, ResumenCategoria>> {
  const { data, error } = await supabase
    .from('productos')
    .select('categoria_id, comprado')
    .eq('grupo_id', grupoId);
  if (error) throw error;

  const resumen: Record<string, ResumenCategoria> = {};
  for (const fila of data ?? []) {
    const actual = resumen[fila.categoria_id] ?? { pendientes: 0, comprados: 0 };
    if (fila.comprado) actual.comprados += 1;
    else actual.pendientes += 1;
    resumen[fila.categoria_id] = actual;
  }
  return resumen;
}

/** Crea las categorías de ejemplo si el grupo no tiene ninguna. Es idempotente. */
export async function sembrarCategoriasIniciales(
  grupoId: string,
  nombres: readonly string[],
  visualDe: (nombre: string, orden: number) => { icono: string; color: string },
): Promise<void> {
  const existentes = await listarCategorias(grupoId, true);
  if (existentes.length > 0) return;

  const filas = nombres.map((nombre, indice) => {
    const visual = visualDe(nombre, indice + 1);
    return { grupo_id: grupoId, nombre, orden: indice + 1, icono: visual.icono, color: visual.color };
  });
  const { error } = await supabase
    .from('categorias')
    .upsert(filas, { onConflict: 'grupo_id,nombre', ignoreDuplicates: true });
  if (error) throw error;
}

export async function crearCategoria(
  grupoId: string,
  nombre: string,
  orden: number,
  visual: { icono: string; color: string },
): Promise<void> {
  const { error } = await supabase
    .from('categorias')
    .insert({ grupo_id: grupoId, nombre: nombre.trim(), orden, icono: visual.icono, color: visual.color });
  if (error) throw error;
}

export async function actualizarCategoria(
  categoriaId: string,
  cambios: { nombre: string; icono: string; color: string },
): Promise<void> {
  const { error } = await supabase
    .from('categorias')
    .update({ nombre: cambios.nombre.trim(), icono: cambios.icono, color: cambios.color })
    .eq('id', categoriaId);
  if (error) throw error;
}

/**
 * Quita una categoría. Si tiene productos o gastos, se oculta para conservar el historial
 * (los gastos la referencian y la base de datos impide borrarla). Si no tiene nada, se borra.
 */
export async function quitarCategoria(categoriaId: string): Promise<void> {
  const [productos, gastos] = await Promise.all([
    supabase.from('productos').select('id', { count: 'exact', head: true }).eq('categoria_id', categoriaId),
    supabase.from('gastos').select('id', { count: 'exact', head: true }).eq('categoria_id', categoriaId),
  ]);
  if (productos.error) throw productos.error;
  if (gastos.error) throw gastos.error;

  if ((productos.count ?? 0) > 0 || (gastos.count ?? 0) > 0) {
    const { error } = await supabase.from('categorias').update({ activo: false }).eq('id', categoriaId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('categorias').delete().eq('id', categoriaId);
    if (error) throw error;
  }
}

export type Producto = {
  id: string;
  nombre: string;
  comprado: boolean;
  comprado_en: string | null;
};

/** Productos de una categoría (pendientes y comprados). */
export async function listarProductos(grupoId: string, categoriaId: string): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, comprado, comprado_en')
    .eq('grupo_id', grupoId)
    .eq('categoria_id', categoriaId)
    .order('nombre');
  if (error) throw error;
  return data ?? [];
}

export async function obtenerCategoria(categoriaId: string): Promise<Categoria | null> {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre, icono, color, orden, activo')
    .eq('id', categoriaId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function crearProducto(grupoId: string, categoriaId: string, nombre: string): Promise<void> {
  const { error } = await supabase
    .from('productos')
    .insert({ grupo_id: grupoId, categoria_id: categoriaId, nombre: nombre.trim() });
  if (error) throw error;
}

/** Marca como comprado. Con importe, crea también el gasto de esa categoría. */
export async function marcarComprado(productoId: string, importe: number | null): Promise<void> {
  const { error } = await supabase.rpc('marcar_producto_comprado', {
    p_producto: productoId,
    p_importe: importe,
  });
  if (error) throw error;
}

export async function marcarPendiente(productoId: string): Promise<void> {
  const { error } = await supabase.rpc('marcar_producto_pendiente', { p_producto: productoId });
  if (error) throw error;
}

export async function quitarProducto(productoId: string): Promise<void> {
  const { error } = await supabase.from('productos').delete().eq('id', productoId);
  if (error) throw error;
}

/** Vuelve a pendientes todos los comprados de la categoría (para empezar una nueva compra). */
export async function reiniciarCategoria(grupoId: string, categoriaId: string): Promise<void> {
  const { error } = await supabase
    .from('productos')
    .update({ comprado: false, comprado_en: null })
    .eq('grupo_id', grupoId)
    .eq('categoria_id', categoriaId)
    .eq('comprado', true);
  if (error) throw error;
}
