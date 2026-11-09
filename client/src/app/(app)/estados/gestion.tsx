import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, useSharedValue } from 'react-native-reanimated';

import { Boton, Campo, Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import {
  actualizarEstado,
  crearEstado,
  EstadoTrabajo,
  guardarOrden,
  listarEstados,
  quitarEstado,
} from '@/lib/go-to-work';
import { colorDeTexto, ICONOS, PALETA, visualDe } from '@/lib/estados-visual';
import { EstadoIcono } from '@/components/estado-icono';
import { FilaArrastrable, PASO_FILA } from '@/components/fila-arrastrable';
import { SelectorIcono } from '@/components/selector-icono';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';

const t = textos.goToWork.estados;

/** Gestión de mis estados: añadir, editar o quitar. Solo se editan los propios (la base lo impone). */
export default function GestionEstadosScreen() {
  const { grupo, usuarioId } = useAuth();
  const grupoId = grupo?.id;

  const [estados, setEstados] = useState<EstadoTrabajo[]>([]);
  const [nuevo, setNuevo] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicion, setTextoEdicion] = useState('');
  const [iconoEdicion, setIconoEdicion] = useState<string>(ICONOS[0].clave);
  const [iconoNuevo, setIconoNuevo] = useState<string>(ICONOS[0].clave);
  const [colorEdicion, setColorEdicion] = useState<string>(PALETA[0]);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDescrito | null>(null);
  // Arrastre de una fila: de qué hueco sale y a cuál llega. El ref lo leen los gestos sin esperar al render.
  const [arrastre, setArrastre] = useState<{ origen: number; destino: number } | null>(null);
  const arrastreRef = useRef<{ origen: number; destino: number } | null>(null);
  const dragY = useSharedValue(0);

  const cargar = useCallback(async () => {
    if (!grupoId || !usuarioId) return;
    try {
      setEstados(await listarEstados(grupoId, usuarioId));
    } catch (e) {
      setError(describirError(e));
    }
  }, [grupoId, usuarioId]);

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
    if (!grupoId || !usuarioId) return;
    const nombre = nuevo.trim();
    if (!nombre) {
      setError({ texto: t.nombreVacio, detalle: 'Nombre vacío' });
      return;
    }
    const orden = Math.max(0, ...estados.map((estado) => estado.orden)) + 1;
    // El color sale del nombre (o de la paleta); el icono es el que se ha elegido.
    const visual = visualDe({ nombre, orden, icono: iconoNuevo });
    operar(async () => {
      await crearEstado(grupoId, usuarioId, nombre, orden, visual);
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

  function iniciarArrastre(indice: number) {
    const inicial = { origen: indice, destino: indice };
    arrastreRef.current = inicial;
    setArrastre(inicial);
  }

  function moverArrastre(desplazamientoY: number) {
    const actual = arrastreRef.current;
    if (!actual) return;
    const destino = Math.min(Math.max(actual.origen + Math.round(desplazamientoY / PASO_FILA), 0), estados.length - 1);
    if (destino === actual.destino) return;
    const siguiente = { origen: actual.origen, destino };
    arrastreRef.current = siguiente;
    setArrastre(siguiente);
  }

  /** Pasa la fila de la posición origen a la destino y guarda el orden: cada estado recibe su posición (1, 2, …). */
  async function reordenar(origen: number, destino: number) {
    if (origen === destino) return;
    const nueva = [...estados];
    const [movido] = nueva.splice(origen, 1);
    nueva.splice(destino, 0, movido);
    const cambios = nueva.flatMap((estado, indice) => (estado.orden === indice + 1 ? [] : [{ id: estado.id, orden: indice + 1 }]));

    setEstados(nueva);
    setError(null);
    setOcupado(true);
    try {
      await guardarOrden(cambios);
    } catch (e) {
      setError(describirError(e));
    } finally {
      setOcupado(false);
      await cargar();
    }
  }

  /** Al soltar el arrastre, la fila se coloca donde está el dedo. */
  async function soltarArrastre() {
    const actual = arrastreRef.current;
    arrastreRef.current = null;
    setArrastre(null);
    if (actual) await reordenar(actual.origen, actual.destino);
  }

  /** Desplazamiento de cada fila mientras otra se arrastra: las que quedan entre origen y destino se corren un hueco. */
  function desplazamientoDe(indice: number): number {
    if (!arrastre || indice === arrastre.origen) return 0;
    const { origen, destino } = arrastre;
    if (origen < destino && indice > origen && indice <= destino) return -PASO_FILA;
    if (origen > destino && indice < origen && indice >= destino) return PASO_FILA;
    return 0;
  }

  const ordenBloqueado = ocupado || editandoId !== null || estados.length < 2;

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t.titulo }} />

      <ThemedView style={styles.columna}>
        {estados.length > 1 && (
          <ThemedText type="small" themeColor="textSecondary">
            {t.ordenAyuda}
          </ThemedText>
        )}

        <ThemedView style={styles.lista}>
          {estados.map((estado, indice) => {
            const visual = visualDe(estado);
            const editando = editandoId === estado.id;
            return (
              <Animated.View key={estado.id} entering={FadeIn}>
                <FilaArrastrable
                  desplazamiento={desplazamientoDe(indice)}
                  arrastrada={arrastre?.origen === indice}
                  dragY={dragY}
                  deshabilitada={ordenBloqueado}
                  compacta={!editando}
                  etiquetaArrastre={t.arrastrar}
                  onInicio={() => iniciarArrastre(indice)}
                  onMover={moverArrastre}
                  onSoltar={soltarArrastre}>
                  {editando ? (
                    <ThemedView style={styles.flexible}>
                      <ThemedView style={styles.cabeceraEdicion}>
                        <ThemedView style={[styles.punto, { backgroundColor: visual.color }]}>
                          <EstadoIcono clave={visual.icono} color={colorDeTexto(visual.color)} tamano={20} />
                        </ThemedView>
                        <ThemedView style={styles.flexible}>
                          <Campo
                            etiqueta={t.nuevo}
                            value={textoEdicion}
                            onChangeText={setTextoEdicion}
                            onSubmitEditing={() => guardarEdicion(estado)}
                            autoFocus
                          />
                        </ThemedView>
                      </ThemedView>
                      <ThemedText type="small" themeColor="textSecondary">{t.icono}</ThemedText>
                      <SelectorIcono valor={iconoEdicion} onCambiar={setIconoEdicion} />
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
                      <ThemedView style={[styles.punto, { backgroundColor: visual.color }]}>
                        <EstadoIcono clave={visual.icono} color={colorDeTexto(visual.color)} tamano={20} />
                      </ThemedView>
                      <ThemedText type="smallBold" numberOfLines={1} style={styles.flexible}>
                        {estado.nombre}
                      </ThemedText>
                      <View style={styles.flechas}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t.subir}
                          disabled={ordenBloqueado || indice === 0}
                          onPress={() => reordenar(indice, indice - 1)}
                          hitSlop={6}
                          style={({ pressed }) => [styles.flecha, { opacity: pressed ? 0.6 : 1 }]}>
                          <Ionicons name="chevron-up" size={22} color={indice === 0 ? '#B0B4BA' : '#60646C'} />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t.bajar}
                          disabled={ordenBloqueado || indice === estados.length - 1}
                          onPress={() => reordenar(indice, indice + 1)}
                          hitSlop={6}
                          style={({ pressed }) => [styles.flecha, { opacity: pressed ? 0.6 : 1 }]}>
                          <Ionicons name="chevron-down" size={22} color={indice === estados.length - 1 ? '#B0B4BA' : '#60646C'} />
                        </Pressable>
                      </View>
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
                </FilaArrastrable>
              </Animated.View>
            );
          })}
        </ThemedView>

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
        <ThemedText type="small" themeColor="textSecondary">{t.icono}</ThemedText>
        <SelectorIcono valor={iconoNuevo} onCambiar={setIconoNuevo} />
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
  lista: {
    gap: Spacing.two,
  },
  flechas: {
    justifyContent: 'center',
  },
  flecha: {
    alignItems: 'center',
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  cabeceraEdicion: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
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
