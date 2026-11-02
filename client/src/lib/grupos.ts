import { supabase } from '@/lib/supabase';

export type Grupo = {
  id: string;
  nombre: string;
  codigo_invitacion: string;
};

/** Devuelve el grupo al que pertenece el usuario, o null si todavía no tiene ninguno. */
export async function obtenerGrupoActual(userId: string): Promise<Grupo | null> {
  const { data, error } = await supabase
    .from('miembros_grupo')
    .select('grupos(id, nombre, codigo_invitacion)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const grupo = (data as { grupos: Grupo | null } | null)?.grupos;
  return grupo ?? null;
}

/** Crea un grupo nuevo y añade al usuario actual como administrador. */
export async function crearGrupo(nombre: string): Promise<void> {
  const { error } = await supabase.rpc('crear_grupo', { p_nombre: nombre.trim() });
  if (error) throw error;
}

/** Une al usuario actual a un grupo con su código de invitación. */
export async function unirseAGrupo(codigo: string): Promise<void> {
  const { error } = await supabase.rpc('unirse_a_grupo', { p_codigo: codigo.trim() });
  if (error) throw error;
}
