import { useEffect, useRef } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Llama a onCambio cada vez que cambian los registros o los estados del grupo,
 * hechos desde esta app o desde otro miembro. Usa Supabase Realtime, que aplica RLS:
 * solo llegan cambios de tu propio grupo.
 */
export function useCambiosGrupo(grupoId: string | undefined, onCambio: () => void) {
  // Guardamos la última función para no re-suscribirnos en cada render.
  const alCambiar = useRef(onCambio);

  useEffect(() => {
    alCambiar.current = onCambio;
  }, [onCambio]);

  useEffect(() => {
    if (!grupoId) return;

    const canal = supabase
      .channel(`grupo-${grupoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registros_trabajo', filter: `grupo_id=eq.${grupoId}` },
        () => alCambiar.current(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'estados_trabajo', filter: `grupo_id=eq.${grupoId}` },
        () => alCambiar.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [grupoId]);
}
