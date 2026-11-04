import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Boton, Campo, Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { actualizarEstado, crearEstado, EstadoTrabajo, listarEstados, quitarEstado } from '@/lib/go-to-work';
import { colorDeTexto, ICONOS, PALETA, visualDe } from '@/lib/estados-visual';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';

const t = textos.goToWork.estados;

export default function EstadosScreen() {
  const { grupo } = useAuth();
  const grupoId = grupo?.id;

  const [estados, setEstados] = useState<EstadoTrabajo[]>([]);
  const [nuevo, setNuevo] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicion, setTextoEdicion] = useState('');
  const [iconoEdicion, setIconoEdicion] = useState<string>(ICONOS[0]);
  const [colorEdicion, setColorEdicion] = useState<string>(PALETA[0]);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDescrito | null>(null);

  const cargar = useCallback(async () => {
    if (!grupoId) return;
    try {
      setEstados(await listarEstados(grupoId));
    } catch (e) {
      setError(describirError(e));
    }
  }, [grupoId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  /** Ejecuta una operación de escritura con el estado de "ocupado" y recarga la lista al terminar. */
  async function operar(accion: () => Promise<void>) {
    setError(null);
    setOcupado(true);
    try {
      await accion();
      await cargar();
    } catch (e) {
      setError(describirError(e));
    } finally {
      setOcupado(false);
    }
  }

  function anadir() {
    if (!grupoId) return;
    const nombre = nuevo.trim();
    if (!nombre) {
      setError({ texto: t.nombreVacio, detalle: 'Nombre vacío' });
      return;
    }
    const orden = Math.max(0, ...estados.map((estado) => estado.orden)) + 1;
    const visual = visualDe({ nombre, orden });
    operar(async () => {
      await crearEstado(grupoId, nombre, orden, visual);
      setNuevo('');
    });
  }

  function guardarEdicion(estado: EstadoTrabajo) {
    const nombre = textoEdicion.trim();
    if (!nombre) {
      setError({ texto: t.nombreVacio, detalle: 'Nombre vacío' });
      return;
    }
    operar(async () => {
      await actualizarEstado(estado.id, { nombre, icono: iconoEdicion, color: colorEdicion });
      setEditandoId(null);
    });
  }

  function quitar(estado: EstadoTrabajo) {
    if (confirmandoId !== estado.id) {
      setConfirmandoId(estado.id);
      return;
    }
    setConfirmandoId(null);
    operar(() => quitarEstado(estado.id));
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t.titulo }} />

      <ThemedView style={styles.columna}>
        {estados.map((estado) => {
          const visual = visualDe(estado);
          return (
          <Animated.View key={estado.id} layout={LinearTransition} entering={FadeIn}>
          <ThemedView type="backgroundElement" style={styles.fila}>
            <ThemedView style={[styles.punto, { backgroundColor: visual.color }]}>
              <ThemedText style={styles.puntoIcono}>{visual.icono}</ThemedText>
            </ThemedView>
            {editandoId === estado.id ? (
              <ThemedView style={styles.flexible}>
                <Campo
                  etiqueta={t.nuevo}
                  value={textoEdicion}
                  onChangeText={setTextoEdicion}
                  onSubmitEditing={() => guardarEdicion(estado)}
                  autoFocus
                />
                <ThemedText type="small" themeColor="textSecondary">Icono</ThemedText>
                <ThemedView style={styles.selector}>
                  {ICONOS.map((icono) => (
                    <Pressable
                      key={icono}
                      accessibilityRole="button"
                      accessibilityState={{ selected: iconoEdicion === icono }}
                      onPress={() => setIconoEdicion(icono)}
                      style={[styles.opcion, iconoEdicion === icono && styles.opcionSeleccionada]}>
                      <ThemedText style={styles.opcionIcono}>{icono}</ThemedText>
                    </Pressable>
                  ))}
                </ThemedView>
                <ThemedText type="small" themeColor="textSecondary">Color</ThemedText>
                <ThemedView style={styles.selector}>
                  {PALETA.map((color) => (
                    <Pressable
                      key={color}
                      accessibilityRole="button"
                      accessibilityLabel={`Color ${color}`}
                      accessibilityState={{ selected: colorEdicion === color }}
                      onPress={() => setColorEdicion(color)}
                      style={[styles.muestra, { backgroundColor: color }, colorEdicion === color && styles.opcionSeleccionada]}>
                      <ThemedText style={{ color: colorDeTexto(color) }}>{colorEdicion === color ? '✓' : ''}</ThemedText>
                    </Pressable>
                  ))}
                </ThemedView>
                <ThemedView style={styles.acciones}>
                  <Pressable accessibilityRole="button" onPress={() => guardarEdicion(estado)} disabled={ocupado}>
                    <ThemedText type="smallBold">{t.guardar}</ThemedText>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => setEditandoId(null)}>
                    <ThemedText type="small" themeColor="textSecondary">{t.cancelar}</ThemedText>
                  </Pressable>
                </ThemedView>
              </ThemedView>
            ) : (
              <>
                <ThemedText type="smallBold" style={styles.flexible}>
                  {estado.nombre}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setEditandoId(estado.id);
                    setTextoEdicion(estado.nombre);
                    setIconoEdicion(visual.icono);
                    setColorEdicion(visual.color);
                  }}
                  hitSlop={8}>
                  <ThemedText type="small">{t.editar}</ThemedText>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => quitar(estado)} hitSlop={8} disabled={ocupado}>
                  <ThemedText type="small" style={styles.peligro}>
                    {confirmandoId === estado.id ? t.confirmarQuitar : t.quitar}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </ThemedView>
          </Animated.View>
          );
        })}

        <ThemedText type="small" themeColor="textSecondary">
          {t.quitarAviso}
        </ThemedText>

        <Campo
          etiqueta={t.nuevo}
          value={nuevo}
          onChangeText={setNuevo}
          onSubmitEditing={anadir}
          returnKeyType="done"
        />
        <Boton titulo={t.anadir} onPress={anadir} cargando={ocupado} />

        {error && <Mensaje texto={error.texto} detalle={error.detalle} />}
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
  fila: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 48,
    padding: Spacing.three,
  },
  flexible: {
    flex: 1,
    gap: Spacing.two,
  },
  acciones: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  peligro: {
    color: '#D32F2F',
  },
  punto: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  puntoIcono: {
    fontSize: 20,
  },
  selector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  opcion: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  opcionIcono: {
    fontSize: 22,
  },
  muestra: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  opcionSeleccionada: {
    borderWidth: 3,
    borderColor: '#1A1A1A',
  },
});
