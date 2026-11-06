import { supabase } from '@/lib/supabase';

export type Miembro = { user_id: string; nombre: string | null; rol: string };

/** Entrada del plan semanal: qué rutina hace una persona en un día (0 = lunes ... 6 = domingo). */
export type DiaPlan = { user_id: string; dia: number; rutina_id: string };

export async function listarMiembros(grupoId: string): Promise<Miembro[]> {
  const { data, error } = await supabase
    .from('miembros_grupo')
    .select('user_id, nombre, rol')
    .eq('grupo_id', grupoId)
    .order('unido_en');
  if (error) throw error;
  return (data ?? []) as Miembro[];
}

export async function guardarMiNombre(grupoId: string, usuarioId: string, nombre: string): Promise<void> {
  const { error } = await supabase
    .from('miembros_grupo')
    .update({ nombre: nombre.trim() || null })
    .eq('grupo_id', grupoId)
    .eq('user_id', usuarioId);
  if (error) throw error;
}

export async function listarPlan(grupoId: string): Promise<DiaPlan[]> {
  const { data, error } = await supabase
    .from('plan_semanal')
    .select('user_id, dia, rutina_id')
    .eq('grupo_id', grupoId)
    .not('rutina_id', 'is', null);
  if (error) throw error;
  return (data ?? []) as DiaPlan[];
}

/** Asigna una rutina a un día. Sin rutina, el día queda como descanso (se borra la entrada). */
export async function fijarDiaPlan(grupoId: string, usuarioId: string, dia: number, rutinaId: string | null): Promise<void> {
  if (rutinaId === null) {
    const { error } = await supabase
      .from('plan_semanal')
      .delete()
      .eq('grupo_id', grupoId)
      .eq('user_id', usuarioId)
      .eq('dia', dia);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('plan_semanal').upsert(
    { grupo_id: grupoId, user_id: usuarioId, dia, rutina_id: rutinaId, updated_at: new Date().toISOString() },
    { onConflict: 'grupo_id,user_id,dia' },
  );
  if (error) throw error;
}

/** Ids de los ejercicios que una persona ha marcado como hechos en una fecha ('AAAA-MM-DD'). */
export async function listarMarcas(grupoId: string, usuarioId: string, fecha: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('sesion_ejercicios')
    .select('ejercicio_id')
    .eq('grupo_id', grupoId)
    .eq('user_id', usuarioId)
    .eq('fecha', fecha);
  if (error) throw error;
  return new Set((data ?? []).map((f) => f.ejercicio_id as string));
}

export async function marcarEjercicio(
  grupoId: string,
  usuarioId: string,
  fecha: string,
  ejercicioId: string,
  hecho: boolean,
): Promise<void> {
  if (hecho) {
    const { error } = await supabase
      .from('sesion_ejercicios')
      .upsert(
        { grupo_id: grupoId, user_id: usuarioId, fecha, ejercicio_id: ejercicioId },
        { onConflict: 'grupo_id,user_id,fecha,ejercicio_id', ignoreDuplicates: true },
      );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('sesion_ejercicios')
      .delete()
      .eq('grupo_id', grupoId)
      .eq('user_id', usuarioId)
      .eq('fecha', fecha)
      .eq('ejercicio_id', ejercicioId);
    if (error) throw error;
  }
}

/** Día de la semana de una fecha, con lunes = 0. */
export const diaSemana = (fecha: Date) => (fecha.getDay() + 6) % 7;

/** Fecha local 'AAAA-MM-DD'. */
export const fechaISO = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
