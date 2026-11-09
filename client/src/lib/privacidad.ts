import { supabase } from '@/lib/supabase';

/** Módulos que se pueden compartir por separado. Coinciden con el check de la tabla ocultamientos. */
export type Modulo = 'estados' | 'gimnasio' | 'compras';

export const MODULOS: readonly Modulo[] = ['estados', 'gimnasio', 'compras'];

/**
 * Lo que yo oculto: conjunto de claves `${viewerId}:${modulo}`.
 * Por defecto todo es visible, así que solo existen filas para lo oculto.
 */
export async function listarOcultos(grupoId: string, usuarioId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('ocultamientos')
    .select('viewer_id, modulo')
    .eq('grupo_id', grupoId)
    .eq('owner_id', usuarioId);
  if (error) throw error;
  return new Set((data ?? []).map((fila) => claveOcultamiento(fila.viewer_id, fila.modulo as Modulo)));
}

export const claveOcultamiento = (viewerId: string, modulo: Modulo) => `${viewerId}:${modulo}`;

/** Muestra u oculta un módulo mío a otro miembro. */
export async function fijarVisibilidad(
  grupoId: string,
  usuarioId: string,
  viewerId: string,
  modulo: Modulo,
  visible: boolean,
): Promise<void> {
  if (visible) {
    const { error } = await supabase
      .from('ocultamientos')
      .delete()
      .eq('grupo_id', grupoId)
      .eq('owner_id', usuarioId)
      .eq('viewer_id', viewerId)
      .eq('modulo', modulo);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('ocultamientos').upsert(
      { grupo_id: grupoId, owner_id: usuarioId, viewer_id: viewerId, modulo },
      { onConflict: 'grupo_id,owner_id,viewer_id,modulo', ignoreDuplicates: true },
    );
    if (error) throw error;
  }
}
