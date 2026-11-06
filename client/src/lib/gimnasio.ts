import { supabase } from '@/lib/supabase';

export type Clasificacion = 'masculina' | 'femenina';
export type EstadoRutina = 'borrador' | 'activa' | 'archivada';

export type Rutina = {
  id: string;
  nombre: string;
  clasificacion: Clasificacion;
  estado: EstadoRutina;
};

export type EjercicioRutina = {
  id: string;
  rutina_id: string;
  nombre: string;
  orden: number;
  series: number | null;
  repeticiones: string | null;
  peso_kg: number | null;
  descanso_seg: number | null;
  wger_id: number | null;
  categoria: string | null;
  musculos: string | null;
  imagen_url: string | null;
};

export type FiltrosRutinas = { clasificacion: Clasificacion | 'todas'; estado: EstadoRutina | 'todas' };

export async function listarRutinas(grupoId: string, filtros: FiltrosRutinas): Promise<Rutina[]> {
  let consulta = supabase
    .from('rutinas')
    .select('id, nombre, clasificacion, estado')
    .eq('grupo_id', grupoId)
    .order('nombre');
  if (filtros.clasificacion !== 'todas') consulta = consulta.eq('clasificacion', filtros.clasificacion);
  if (filtros.estado !== 'todas') consulta = consulta.eq('estado', filtros.estado);

  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as Rutina[];
}

export async function obtenerRutina(rutinaId: string): Promise<Rutina | null> {
  const { data, error } = await supabase
    .from('rutinas')
    .select('id, nombre, clasificacion, estado')
    .eq('id', rutinaId)
    .maybeSingle();
  if (error) throw error;
  return data as Rutina | null;
}

export async function crearRutina(
  grupoId: string,
  datos: { nombre: string; clasificacion: Clasificacion; estado: EstadoRutina },
): Promise<void> {
  const { error } = await supabase.from('rutinas').insert({ grupo_id: grupoId, ...datos, nombre: datos.nombre.trim() });
  if (error) throw error;
}

export async function actualizarRutina(
  rutinaId: string,
  cambios: Partial<{ nombre: string; clasificacion: Clasificacion; estado: EstadoRutina }>,
): Promise<void> {
  const { error } = await supabase.from('rutinas').update(cambios).eq('id', rutinaId);
  if (error) throw error;
}

export async function quitarRutina(rutinaId: string): Promise<void> {
  const { error } = await supabase.from('rutinas').delete().eq('id', rutinaId);
  if (error) throw error;
}

export async function listarEjercicios(rutinaId: string): Promise<EjercicioRutina[]> {
  const { data, error } = await supabase
    .from('ejercicios_rutina')
    .select('id, rutina_id, nombre, orden, series, repeticiones, peso_kg, descanso_seg, wger_id, categoria, musculos, imagen_url')
    .eq('rutina_id', rutinaId)
    .order('orden')
    .order('nombre');
  if (error) throw error;
  return (data ?? []).map((e) => ({ ...e, peso_kg: e.peso_kg == null ? null : Number(e.peso_kg) })) as EjercicioRutina[];
}

export type DatosEjercicio = {
  nombre: string;
  series?: number | null;
  repeticiones?: string | null;
  peso_kg?: number | null;
  descanso_seg?: number | null;
  wger_id?: number | null;
  categoria?: string | null;
  musculos?: string | null;
  imagen_url?: string | null;
};

export async function crearEjercicio(
  grupoId: string,
  rutinaId: string,
  datos: DatosEjercicio,
  orden: number,
): Promise<void> {
  const { error } = await supabase
    .from('ejercicios_rutina')
    .insert({ grupo_id: grupoId, rutina_id: rutinaId, orden, ...datos, nombre: datos.nombre.trim() });
  if (error) throw error;
}

export async function actualizarEjercicio(
  ejercicioId: string,
  cambios: Partial<Pick<DatosEjercicio, 'series' | 'repeticiones' | 'peso_kg' | 'descanso_seg'>>,
): Promise<void> {
  const { error } = await supabase.from('ejercicios_rutina').update(cambios).eq('id', ejercicioId);
  if (error) throw error;
}

export async function quitarEjercicio(ejercicioId: string): Promise<void> {
  const { error } = await supabase.from('ejercicios_rutina').delete().eq('id', ejercicioId);
  if (error) throw error;
}

/** Iconos de Ionicons por valor y por campo del gimnasio. */
export const ICONO_CLASIFICACION = { masculina: 'male', femenina: 'female' } as const;
export const ICONO_ESTADO = { borrador: 'create-outline', activa: 'flash', archivada: 'archive' } as const;
export const ICONO_CAMPO = {
  rutina: 'body',
  ejercicio: 'fitness',
  series: 'list',
  repeticiones: 'repeat',
  peso: 'barbell',
  descanso: 'timer',
} as const;

/** Icono de cada categoría de ejercicio (nombres en español, como vienen del catálogo). */
export const ICONO_CATEGORIA: Record<string, 'walk' | 'body' | 'fitness' | 'accessibility' | 'shield' | 'ellipse' | 'heart' | 'footsteps'> = {
  Piernas: 'walk',
  Espalda: 'body',
  Brazos: 'fitness',
  Hombros: 'accessibility',
  Pecho: 'shield',
  Abdominales: 'ellipse',
  Cardio: 'heart',
  Gemelos: 'footsteps',
};
