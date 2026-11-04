import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

/**
 * Tablas del grupo que se sincronizan en tiempo real con todos los miembros.
 * Al añadir un módulo nuevo: añade aquí su tabla y, en su migración, añádela a la publicación supabase_realtime.
 */
export const TABLAS_SINCRONIZADAS = ['registros_trabajo', 'estados_trabajo'] as const;
export type TablaSincronizada = (typeof TABLAS_SINCRONIZADAS)[number];

type Versiones = Record<TablaSincronizada, number>;

export type EstadoConexion = 'conectando' | 'en-directo' | 'sin-conexion';

const versionesIniciales = Object.fromEntries(
  TABLAS_SINCRONIZADAS.map((tabla) => [tabla, 0]),
) as Versiones;

type ContextoSync = { versiones: Versiones; conexion: EstadoConexion };

const ContextoSincronizacion = createContext<ContextoSync>({ versiones: versionesIniciales, conexion: 'conectando' });

/**
 * Mantiene una única suscripción en tiempo real para todo el grupo.
 * Cada cambio incrementa la versión de la tabla afectada; las pantallas recargan al verla cambiar.
 */
export function SincronizacionProvider({ children }: PropsWithChildren) {
  const { grupo } = useAuth();
  const grupoId = grupo?.id;
  const [versiones, setVersiones] = useState<Versiones>(versionesIniciales);
  const [conexion, setConexion] = useState<EstadoConexion>('conectando');

  useEffect(() => {
    if (!grupoId) return;

    let canal = supabase.channel(`grupo-${grupoId}`);
    for (const tabla of TABLAS_SINCRONIZADAS) {
      canal = canal.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tabla, filter: `grupo_id=eq.${grupoId}` },
        () => setVersiones((actuales) => ({ ...actuales, [tabla]: actuales[tabla] + 1 })),
      );
    }
    canal.subscribe((estado) => {
      if (estado === 'SUBSCRIBED') setConexion('en-directo');
      else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') setConexion('sin-conexion');
    });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [grupoId]);

  // Al volver a la app (o a la pestaña), iOS puede haber cortado la conexión en tiempo real:
  // los cambios hechos mientras tanto no llegan después, así que se recargan todos los datos.
  useEffect(() => {
    const recargarTodo = () =>
      setVersiones((actuales) =>
        Object.fromEntries(TABLAS_SINCRONIZADAS.map((tabla) => [tabla, actuales[tabla] + 1])) as Versiones,
      );

    if (Platform.OS === 'web') {
      const alCambiarVisibilidad = () => {
        if (document.visibilityState === 'visible') recargarTodo();
      };
      document.addEventListener('visibilitychange', alCambiarVisibilidad);
      return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    }

    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') recargarTodo();
    });
    return () => suscripcion.remove();
  }, []);

  return (
    <ContextoSincronizacion.Provider value={{ versiones, conexion }}>{children}</ContextoSincronizacion.Provider>
  );
}

/** Número que cambia cada vez que la tabla cambia en el grupo. Úsalo como dependencia de useEffect para recargar. */
export function useVersionTabla(tabla: TablaSincronizada): number {
  return useContext(ContextoSincronizacion).versiones[tabla];
}

/** Estado de la conexión en tiempo real, para mostrarlo al usuario. */
export function useEstadoConexion(): EstadoConexion {
  return useContext(ContextoSincronizacion).conexion;
}
