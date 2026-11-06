import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { obtenerGrupoActual, type Grupo } from '@/lib/grupos';
import { supabase } from '@/lib/supabase';
import { describirError, type ErrorDescrito } from '@/lib/textos';

/**
 * cargando:   comprobando sesión o grupo.
 * sin-sesion: nadie ha entrado (pantallas de login y registro).
 * sin-grupo:  hay sesión, pero el usuario todavía no pertenece a ningún grupo.
 * app:        sesión y grupo listos.
 * error:      no se pudo cargar el grupo.
 */
export type EstadoAuth = 'cargando' | 'sin-sesion' | 'sin-grupo' | 'app' | 'error';

type InfoGrupo =
  | { userId: string; grupo: Grupo | null }
  | { userId: string; error: ErrorDescrito };

type ContextoAuth = {
  estado: EstadoAuth;
  grupo: Grupo | null;
  /** Id del usuario que ha entrado (null si no hay sesión). */
  usuarioId: string | null;
  /** Error al cargar el grupo, cuando estado es 'error'. */
  errorGrupo: ErrorDescrito | null;
  cerrarSesion: () => Promise<void>;
  recargarGrupo: () => Promise<void>;
};

const AuthContext = createContext<ContextoAuth | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [sesionCargada, setSesionCargada] = useState(false);
  const [sesion, setSesion] = useState<Session | null>(null);
  const [infoGrupo, setInfoGrupo] = useState<InfoGrupo | null>(null);

  // Sesión: carga inicial y cambios (login, logout, renovación de token).
  useEffect(() => {
    let activo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return;
      setSesion(data.session);
      setSesionCargada(true);
    });

    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion);
    });

    return () => {
      activo = false;
      suscripcion.subscription.unsubscribe();
    };
  }, []);

  const userId = sesion?.user.id ?? null;

  const cargarGrupo = useCallback(async (id: string) => {
    try {
      const grupo = await obtenerGrupoActual(id);
      setInfoGrupo({ userId: id, grupo });
    } catch (error) {
      setInfoGrupo({ userId: id, error: describirError(error) });
    }
  }, []);

  // Grupo: se carga cada vez que cambia el usuario que ha entrado.
  useEffect(() => {
    if (userId) {
      cargarGrupo(userId);
    } else {
      setInfoGrupo(null);
    }
  }, [userId, cargarGrupo]);

  const recargarGrupo = useCallback(async () => {
    if (userId) await cargarGrupo(userId);
  }, [userId, cargarGrupo]);

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const valor = useMemo<ContextoAuth>(() => {
    let estado: EstadoAuth;
    let grupo: Grupo | null = null;
    let errorGrupo: ErrorDescrito | null = null;

    if (!sesionCargada) {
      estado = 'cargando';
    } else if (!userId) {
      estado = 'sin-sesion';
    } else if (!infoGrupo || infoGrupo.userId !== userId) {
      estado = 'cargando';
    } else if ('error' in infoGrupo) {
      estado = 'error';
      errorGrupo = infoGrupo.error;
    } else if (!infoGrupo.grupo) {
      estado = 'sin-grupo';
    } else {
      estado = 'app';
      grupo = infoGrupo.grupo;
    }

    return { estado, grupo, usuarioId: userId, errorGrupo, cerrarSesion, recargarGrupo };
  }, [sesionCargada, userId, infoGrupo, cerrarSesion, recargarGrupo]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ContextoAuth {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return contexto;
}
