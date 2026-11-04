import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Boton, Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import {
  EstadoTrabajo,
  limitesDelDia,
  listarEstados,
  listarRegistros,
  RegistroTrabajo,
  registrarEstado,
  sembrarEstadosIniciales,
} from '@/lib/go-to-work';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';
import { useVersionTabla } from '@/lib/sincronizacion';

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

export default function GoToWorkScreen() {
  const { grupo } = useAuth();
  const grupoId = grupo?.id;

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

  // Carga inicial de estados: crea los de ejemplo si el grupo no tiene ninguno.
  useEffect(() => {
    if (!grupoId) return;
    let activo = true;
    setCargandoEstados(true);
    (async () => {
      try {
        await sembrarEstadosIniciales(grupoId, t.estadosIniciales);
        const lista = await listarEstados(grupoId);
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
  }, [grupoId]);

  const cargarRegistros = useCallback(async () => {
    if (!grupoId) return;
    setCargandoRegistros(true);
    try {
      const { desde, hasta } = limitesDelDia(fecha);
      setRegistros(await listarRegistros(grupoId, desde, hasta));
    } catch (e) {
      setError(describirError(e));
    } finally {
      setCargandoRegistros(false);
    }
  }, [grupoId, fecha]);

  // Se recarga al cambiar la fecha y cuando cambian los registros del grupo (aunque los haga otro miembro).
  const versionRegistros = useVersionTabla('registros_trabajo');
  const versionEstados = useVersionTabla('estados_trabajo');

  useEffect(() => {
    cargarRegistros();
  }, [cargarRegistros, versionRegistros]);

  const recargarEstados = useCallback(async () => {
    if (!grupoId) return;
    try {
      setEstados(await listarEstados(grupoId));
    } catch (e) {
      setError(describirError(e));
    }
  }, [grupoId]);

  useEffect(() => {
    recargarEstados();
  }, [recargarEstados, versionEstados]);

  // Al volver de "Gestionar estados", se recarga la lista de botones.
  useFocusEffect(
    useCallback(() => {
      if (!grupoId) return;
      listarEstados(grupoId)
        .then(setEstados)
        .catch((e) => setError(describirError(e)));
    }, [grupoId]),
  );

  async function marcar(estado: EstadoTrabajo) {
    if (!grupoId) return;
    setError(null);
    setConfirmacion(null);
    setMarcando(estado.id);
    try {
      await registrarEstado(grupoId, estado.id);
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

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Stack.Screen options={{ title: t.titulo }} />

      <ThemedView style={styles.columna}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
          {t.marcar}
        </ThemedText>

        {cargandoEstados ? (
          <ActivityIndicator style={styles.espacio} />
        ) : estados.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
            {t.sinEstados}
          </ThemedText>
        ) : (
          <ThemedView style={styles.rejilla}>
            {estados.map((estado) => (
              <Pressable
                key={estado.id}
                accessibilityRole="button"
                accessibilityLabel={estado.nombre}
                disabled={marcando !== null}
                onPress={() => marcar(estado)}
                style={({ pressed }) => [styles.boton, { opacity: pressed || marcando ? 0.6 : 1 }]}>
                <ThemedView type="backgroundElement" style={styles.botonInterior}>
                  {marcando === estado.id ? (
                    <ActivityIndicator />
                  ) : (
                    <ThemedText type="smallBold" style={styles.centrado}>
                      {estado.nombre}
                    </ThemedText>
                  )}
                </ThemedView>
              </Pressable>
            ))}
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
              <ThemedView key={registro.id} style={styles.fila}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hora}>
                  {horaCorta(new Date(registro.marcado_en))}
                </ThemedText>
                <ThemedText type="small" style={styles.flexible}>
                  {registro.nombre}
                </ThemedText>
              </ThemedView>
            ))
          )}
        </ThemedView>

        <Boton titulo={t.gestionarEstados} onPress={() => router.push('/go-to-work/estados')} secundario />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  columna: {
    alignSelf: 'center',
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
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
  boton: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 64,
    borderRadius: Spacing.three,
  },
  botonInterior: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    minHeight: 64,
    padding: Spacing.two,
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
