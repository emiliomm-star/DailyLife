import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { EstadoTile } from '@/components/estado-tile';
import { Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { visualDe } from '@/lib/estados-visual';
import {
  EstadoTrabajo,
  limitesDelDia,
  listarEstados,
  listarRegistros,
  RegistroTrabajo,
  registrarEstado,
} from '@/lib/go-to-work';
import { useAuth } from '@/lib/auth-context';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';
import { useEstadoConexion, useVersionTabla } from '@/lib/sincronizacion';

const t = textos.goToWork;

function horaCorta(fecha: Date): string {
  return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function etiquetaFecha(fecha: Date): string {
  return fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function mismoDia(a: Date, b: Date): boolean {
  return limitesDelDia(a).desde.getTime() === limitesDelDia(b).desde.getTime();
}

/**
 * Estados de una persona del grupo con su historial del día.
 * Si la persona es el usuario actual, se pueden marcar estados; si no, la vista es solo de lectura.
 */
export function EstadosDePersona({ duenoId, propio }: { duenoId: string; propio: boolean }) {
  const { grupo, usuarioId } = useAuth();
  const grupoId = grupo?.id;
  const conexion = useEstadoConexion();

  const [estados, setEstados] = useState<EstadoTrabajo[]>([]);
  const [registros, setRegistros] = useState<RegistroTrabajo[]>([]);
  const [fecha, setFecha] = useState(() => new Date());
  const [cargandoEstados, setCargandoEstados] = useState(true);
  const [cargandoRegistros, setCargandoRegistros] = useState(false);
  const [marcando, setMarcando] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDescrito | null>(null);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);

  const hoy = new Date();
  const esHoy = mismoDia(fecha, hoy);

  const recargarEstados = useCallback(async () => {
    if (!grupoId) return;
    try {
      setEstados(await listarEstados(grupoId, duenoId));
    } catch (e) {
      setError(describirError(e));
    }
  }, [grupoId, duenoId]);

  // Carga inicial de los estados de la persona.
  useEffect(() => {
    if (!grupoId) return;
    let activo = true;
    setCargandoEstados(true);
    (async () => {
      try {
        const lista = await listarEstados(grupoId, duenoId);
        if (activo) setEstados(lista);
      } catch (e) {
        if (activo) setError(describirError(e));
      } finally {
        if (activo) setCargandoEstados(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [grupoId, duenoId]);

  const cargarRegistros = useCallback(async () => {
    if (!grupoId) return;
    setCargandoRegistros(true);
    try {
      const { desde, hasta } = limitesDelDia(fecha);
      setRegistros(await listarRegistros(grupoId, duenoId, desde, hasta));
    } catch (e) {
      setError(describirError(e));
    } finally {
      setCargandoRegistros(false);
    }
  }, [grupoId, duenoId, fecha]);

  // Se recarga al cambiar la fecha y cuando cambian los registros o estados del grupo (aunque los cambie otro miembro).
  const versionRegistros = useVersionTabla('registros_trabajo');
  const versionEstados = useVersionTabla('estados_trabajo');

  useEffect(() => {
    cargarRegistros();
  }, [cargarRegistros, versionRegistros]);

  useEffect(() => {
    recargarEstados();
  }, [recargarEstados, versionEstados]);

  // Al volver de "Gestionar estados" o de "Privacidad", se recarga la lista.
  useFocusEffect(
    useCallback(() => {
      recargarEstados();
    }, [recargarEstados]),
  );

  async function marcar(estado: EstadoTrabajo) {
    if (!grupoId || !usuarioId || !propio) return;
    setError(null);
    setConfirmacion(null);
    setMarcando(estado.id);
    try {
      await registrarEstado(grupoId, usuarioId, estado.id);
      const ahora = new Date();
      setConfirmacion(t.registrado(estado.nombre, horaCorta(ahora)));
      // Tras marcar, se muestra el día de hoy para ver el registro recién hecho.
      if (esHoy) {
        await cargarRegistros();
      } else {
        setFecha(ahora);
      }
    } catch (e) {
      setError(describirError(e));
    } finally {
      setMarcando(null);
    }
  }

  function cambiarDia(dias: number) {
    const nueva = new Date(fecha);
    nueva.setDate(nueva.getDate() + dias);
    setFecha(nueva);
    setConfirmacion(null);
  }

  const sinVisibles = !cargandoEstados && estados.length === 0;

  return (
    <ThemedView style={styles.columna}>
      {propio ? (
        <>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
            {t.marcar}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
            {conexion === 'en-directo' ? '● En directo' : conexion === 'conectando' ? '○ Conectando…' : '○ Sin conexión en directo'}
          </ThemedText>
        </>
      ) : null}

      {cargandoEstados ? (
        <ActivityIndicator style={styles.espacio} />
      ) : sinVisibles ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
          {propio ? t.sinEstados : t.sinEstadosVisibles}
        </ThemedText>
      ) : (
        <ThemedView style={styles.rejilla}>
          {estados.map((estado, indice) => {
            const visual = visualDe(estado);
            return (
              <EstadoTile
                key={estado.id}
                nombre={estado.nombre}
                icono={visual.icono}
                color={visual.color}
                indice={indice}
                cargando={marcando === estado.id}
                deshabilitado={!propio || marcando !== null}
                onPress={() => marcar(estado)}
              />
            );
          })}
        </ThemedView>
      )}

      {confirmacion && (
        <ThemedText type="smallBold" role="status" style={styles.centrado}>
          {confirmacion}
        </ThemedText>
      )}
      {error && <Mensaje texto={error.texto} detalle={error.detalle} />}

      <ThemedView style={styles.cabeceraHistorial}>
        <Pressable accessibilityRole="button" onPress={() => cambiarDia(-1)} hitSlop={12}>
          <ThemedText type="smallBold">‹ {t.anterior}</ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.fecha}>
          {esHoy ? t.hoy : etiquetaFecha(fecha)}
        </ThemedText>
        {esHoy ? (
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t.siguiente} ›
          </ThemedText>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => cambiarDia(1)} hitSlop={12}>
            <ThemedText type="smallBold">{t.siguiente} ›</ThemedText>
          </Pressable>
        )}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.tarjeta}>
        {cargandoRegistros ? (
          <ActivityIndicator />
        ) : registros.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t.sinRegistros}
          </ThemedText>
        ) : (
          registros.map((registro) => (
            <View key={registro.id} style={styles.fila}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.hora}>
                {horaCorta(new Date(registro.marcado_en))}
              </ThemedText>
              <ThemedText type="small" style={styles.flexible}>
                {registro.nombre}
              </ThemedText>
            </View>
          ))
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  columna: {
    gap: Spacing.three,
  },
  centrado: {
    textAlign: 'center',
  },
  espacio: {
    marginVertical: Spacing.three,
  },
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cabeceraHistorial: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  fecha: {
    textTransform: 'capitalize',
  },
  tarjeta: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  fila: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  hora: {
    width: 56,
  },
  flexible: {
    flex: 1,
  },
});
