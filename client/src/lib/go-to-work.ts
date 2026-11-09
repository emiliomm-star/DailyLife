import { supabase } from '@/lib/supabase';

/**
 * Estados: cada persona tiene su propia lista (created_by). Lo que otros miembros ven depende de
 * la privacidad del módulo 'estados' (ver lib/privacidad.ts). Las escrituras solo afectan a lo propio:
 * la base de datos lo impone con RLS.
 */

export type EstadoTrabajo = {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
  icono: string | null;
  color: string | null;
};

export type RegistroTrabajo = {
  id: string;
  marcado_en: string;
  estado_id: string;
  nombre: string;
};

/** Límites del día local [inicio, fin) para consultar el historial de una fecha. */
export function limitesDelDia(fecha: Date): { desde: Date; hasta: Date } {
  const desde = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const hasta = new Date(desde);
  hasta.setDate(hasta.getDate() + 1);
  return { desde, hasta };
}

/**
 * Estados de una persona del grupo. Por defecto solo los activos, que son los que aparecen como botones.
 * Si la persona no los comparte contigo, la lista llega vacía.
 */
export async function listarEstados(
  grupoId: string,
  duenoId: string,
  incluirInactivos = false,
): Promise<EstadoTrabajo[]> {
  let consulta = supabase
    .from('estados_trabajo')
    .select('id, nombre, orden, activo, icono, color')
    .eq('grupo_id', grupoId)
    .eq('created_by', duenoId)
    .order('orden')
    .order('nombre');

  if (!incluirInactivos) {
    consulta = consulta.eq('activo', true);
  }

  const { data, error } = await consulta;
  if (error) throw error;
  return data ?? [];
}

export async function crearEstado(
  grupoId: string,
  usuarioId: string,
  nombre: string,
  orden: number,
  visual: { icono: string; color: string },
): Promise<void> {
  const { error } = await supabase.from('estados_trabajo').insert({
    grupo_id: grupoId,
    created_by: usuarioId,
    nombre: nombre.trim(),
    orden,
    icono: visual.icono,
    color: visual.color,
  });
  if (error) throw error;
}

export async function actualizarEstado(
  estadoId: string,
  cambios: { nombre: string; icono: string; color: string },
): Promise<void> {
  const { error } = await supabase
    .from('estados_trabajo')
    .update({ nombre: cambios.nombre.trim(), icono: cambios.icono, color: cambios.color })
    .eq('id', estadoId);
  if (error) throw error;
}

/**
 * Quita un estado de la lista. Si ya tiene registros no se puede borrar (la base lo impide para
 * conservar el historial), así que se desactiva. Si no tiene registros, se borra.
 */
export async function quitarEstado(estadoId: string): Promise<void> {
  const { count, error: errorConteo } = await supabase
    .from('registros_trabajo')
    .select('id', { count: 'exact', head: true })
    .eq('estado_id', estadoId);
  if (errorConteo) throw errorConteo;

  if (count && count > 0) {
    const { error } = await supabase.from('estados_trabajo').update({ activo: false }).eq('id', estadoId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('estados_trabajo').delete().eq('id', estadoId);
    if (error) throw error;
  }
}

/** Registra que se ha marcado un estado propio ahora mismo. La fecha y hora la guarda la base de datos. */
export async function registrarEstado(grupoId: string, usuarioId: string, estadoId: string): Promise<void> {
  const { error } = await supabase
    .from('registros_trabajo')
    .insert({ grupo_id: grupoId, created_by: usuarioId, estado_id: estadoId });
  if (error) throw error;
}

/** Historial de una persona en un intervalo, del más reciente al más antiguo. */
export async function listarRegistros(
  grupoId: string,
  duenoId: string,
  desde: Date,
  hasta: Date,
): Promise<RegistroTrabajo[]> {
  const { data, error } = await supabase
    .from('registros_trabajo')
    .select('id, marcado_en, estado_id, estados_trabajo(nombre)')
    .eq('grupo_id', grupoId)
    .eq('created_by', duenoId)
    .gte('marcado_en', desde.toISOString())
    .lt('marcado_en', hasta.toISOString())
    .order('marcado_en', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((fila) => {
    const estado = fila.estados_trabajo as unknown as { nombre: string } | null;
    return {
      id: fila.id,
      marcado_en: fila.marcado_en,
      estado_id: fila.estado_id,
      nombre: estado?.nombre ?? '—',
    };
  });
}
