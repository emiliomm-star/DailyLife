import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BuscadorEjercicios } from '@/components/buscador-ejercicios';
import { ChipsOpciones } from '@/components/chips-opciones';
import { Boton, Campo, Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { PALETA } from '@/lib/estados-visual';
import {
  actualizarEjercicio,
  actualizarRutina,
  Clasificacion,
  crearEjercicio,
  DatosEjercicio,
  EjercicioRutina,
  EstadoRutina,
  ICONO_CAMPO,
  ICONO_CATEGORIA,
  ICONO_CLASIFICACION,
  ICONO_ESTADO,
  listarEjercicios,
  obtenerRutina,
  quitarEjercicio,
  quitarRutina,
  Rutina,
} from '@/lib/gimnasio';
import { useVersionTabla } from '@/lib/sincronizacion';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';
import { parsearPrecio } from '@/lib/compras';

const t = textos.gimnasio;
const td = textos.gimnasio.detalle;

const COLOR_CLASIFICACION: Record<Clasificacion, string> = { masculina: '#4D96FF', femenina: '#FF8FC7' };
const OPCIONES_CLASIFICACION = [
  { clave: 'masculina' as const, etiqueta: t.masculina, icono: ICONO_CLASIFICACION.masculina },
  { clave: 'femenina' as const, etiqueta: t.femenina, icono: ICONO_CLASIFICACION.femenina },
];
const OPCIONES_ESTADO = [
  { clave: 'borrador' as const, etiqueta: t.borrador, icono: ICONO_ESTADO.borrador },
  { clave: 'activa' as const, etiqueta: t.activa, icono: ICONO_ESTADO.activa },
  { clave: 'archivada' as const, etiqueta: t.archivada, icono: ICONO_ESTADO.archivada },
];

/** Una rutina: cambiar su clasificación y estado, y gestionar sus ejercicios (catálogo wger o propios). */
export default function RutinaScreen() {
  const { rutina: rutinaId } = useLocalSearchParams<{ rutina: string }>();
  const { grupo } = useAuth();
  const grupoId = grupo?.id;
  const versionEjercicios = useVersionTabla('ejercicios_rutina');
  const versionRutinas = useVersionTabla('rutinas');

  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [ejercicios, setEjercicios] = useState<EjercicioRutina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<ErrorDescrito | null>(null);
  const [buscando, setBuscando] = useState(false);

  const [nombrePropio, setNombrePropio] = useState('');
  const [guardandoPropio, setGuardandoPropio] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicion, setEdicion] = useState({ series: '', repeticiones: '', peso: '', descanso: '' });
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [confirmandoRutina, setConfirmandoRutina] = useState(false);

  const cargar = useCallback(async () => {
    if (!rutinaId) return;
    try {
      const [r, lista] = await Promise.all([obtenerRutina(rutinaId), listarEjercicios(rutinaId)]);
      setRutina(r);
      setEjercicios(lista);
      setError(null);
    } catch (e) {
      setError(describirError(e));
    } finally {
      setCargando(false);
    }
  }, [rutinaId]);

  useEffect(() => {
    cargar();
  }, [cargar, versionEjercicios, versionRutinas]);

  async function operar(accion: () => Promise<void>) {
    setError(null);
    try {
      await accion();
      await cargar();
    } catch (e) {
      setError(describirError(e));
    }
  }

  function cambiarRutina(cambios: Partial<{ clasificacion: Clasificacion; estado: EstadoRutina }>) {
    if (!rutinaId) return;
    operar(() => actualizarRutina(rutinaId, cambios));
  }

  /** Añade un ejercicio al final de la rutina. */
  async function anadir(datos: DatosEjercicio) {
    if (!grupoId || !rutinaId) return;
    const orden = Math.max(0, ...ejercicios.map((e) => e.orden)) + 1;
    await crearEjercicio(grupoId, rutinaId, datos, orden);
    await cargar();
  }

  async function anadirPropio() {
    const nombre = nombrePropio.trim();
    if (!nombre) {
      setError({ texto: t.nombreVacio, detalle: 'Nombre vacío' });
      return;
    }
    setGuardandoPropio(true);
    try {
      await anadir({ nombre });
      setNombrePropio('');
    } catch (e) {
      setError(describirError(e));
    } finally {
      setGuardandoPropio(false);
    }
  }

  function abrirEdicion(ejercicio: EjercicioRutina) {
    setEditandoId(ejercicio.id);
    setEdicion({
      series: ejercicio.series?.toString() ?? '',
      repeticiones: ejercicio.repeticiones ?? '',
      peso: ejercicio.peso_kg != null ? String(ejercicio.peso_kg).replace('.', ',') : '',
      descanso: ejercicio.descanso_seg?.toString() ?? '',
    });
  }

  function guardarEdicion(ejercicio: EjercicioRutina) {
    const series = edicion.series.trim() ? Number(edicion.series) : null;
    const peso = parsearPrecio(edicion.peso);
    const descanso = edicion.descanso.trim() ? Number(edicion.descanso) : null;
    if (series !== null && (!Number.isInteger(series) || series <= 0)) {
      setError({ texto: 'Las series deben ser un número entero mayor que cero.', detalle: `Series: ${edicion.series}` });
      return;
    }
    if (peso === 'error' || (descanso !== null && (!Number.isInteger(descanso) || descanso < 0))) {
      setError({ texto: 'Revisa el peso y el descanso.', detalle: `Peso: ${edicion.peso} · Descanso: ${edicion.descanso}` });
      return;
    }
    operar(async () => {
      await actualizarEjercicio(ejercicio.id, {
        series,
        repeticiones: edicion.repeticiones.trim() || null,
        peso_kg: peso,
        descanso_seg: descanso,
      });
      setEditandoId(null);
    });
  }

  function quitar(ejercicio: EjercicioRutina) {
    if (confirmandoId !== ejercicio.id) {
      setConfirmandoId(ejercicio.id);
      return;
    }
    setConfirmandoId(null);
    operar(() => quitarEjercicio(ejercicio.id));
  }

  function quitarTodaLaRutina() {
    if (!confirmandoRutina) {
      setConfirmandoRutina(true);
      return;
    }
    if (!rutinaId) return;
    quitarRutina(rutinaId)
      .then(() => router.back())
      .catch((e) => setError(describirError(e)));
  }

  if (cargando) {
    return <ActivityIndicator style={styles.espacio} />;
  }
  if (!rutina) {
    return (
      <ThemedView style={styles.centrado}>
        <Stack.Screen options={{ title: t.titulo }} />
        <ThemedText type="small" themeColor="textSecondary">{t.vacio}</ThemedText>
      </ThemedView>
    );
  }

  const color = COLOR_CLASIFICACION[rutina.clasificacion] ?? PALETA[0];

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: rutina.nombre }} />

      <View style={styles.columna}>
        <ThemedView type="backgroundElement" style={styles.tarjeta}>
          <ThemedText type="smallBold">{t.clasificacion}</ThemedText>
          <ChipsOpciones
            opciones={OPCIONES_CLASIFICACION}
            valor={rutina.clasificacion}
            onCambiar={(clasificacion) => cambiarRutina({ clasificacion })}
            colorActivo={color}
          />
          <ThemedText type="smallBold">{t.estado}</ThemedText>
          <ChipsOpciones
            opciones={OPCIONES_ESTADO}
            valor={rutina.estado}
            onCambiar={(estado) => cambiarRutina({ estado })}
            colorActivo={color}
          />
        </ThemedView>

        <ThemedText type="subtitle">{td.ejercicios}</ThemedText>

        {ejercicios.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">{td.vacio}</ThemedText>
        ) : (
          ejercicios.map((ejercicio) => {
            const resumen = [
              ejercicio.series != null && ejercicio.repeticiones
                ? `${ejercicio.series} × ${ejercicio.repeticiones}`
                : ejercicio.series != null
                  ? `${ejercicio.series} series`
                  : ejercicio.repeticiones,
              ejercicio.peso_kg != null ? `${String(ejercicio.peso_kg).replace('.', ',')} kg` : null,
              ejercicio.descanso_seg != null ? `${ejercicio.descanso_seg} s` : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <ThemedView key={ejercicio.id} type="backgroundElement" style={styles.ejercicio}>
                <View style={styles.ejercicioCabecera}>
                  {ejercicio.imagen_url ? (
                    <Image source={{ uri: ejercicio.imagen_url }} style={styles.miniatura} />
                  ) : (
                    <View style={[styles.miniatura, { backgroundColor: color, opacity: 0.4 }]} />
                  )}
                  <View style={styles.ejercicioTextos}>
                    <ThemedText type="smallBold">{ejercicio.nombre}</ThemedText>
                    {(ejercicio.categoria || ejercicio.musculos) && (
                      <View style={styles.subtituloFila}>
                        {ejercicio.categoria && ICONO_CATEGORIA[ejercicio.categoria] && (
                          <Ionicons name={ICONO_CATEGORIA[ejercicio.categoria]} size={13} color={color} />
                        )}
                        <ThemedText type="small" themeColor="textSecondary">
                          {[ejercicio.categoria, ejercicio.musculos].filter(Boolean).join(' · ')}
                        </ThemedText>
                      </View>
                    )}
                    {resumen !== '' && <ThemedText type="small">{resumen}</ThemedText>}
                  </View>
                </View>

                {editandoId === ejercicio.id ? (
                  <View style={styles.edicion}>
                    <View style={styles.dosColumnas}>
                      <View style={styles.mitad}>
                        <Campo icono={ICONO_CAMPO.series} etiqueta={td.series} value={edicion.series} onChangeText={(series) => setEdicion((e) => ({ ...e, series }))} keyboardType="number-pad" />
                      </View>
                      <View style={styles.mitad}>
                        <Campo icono={ICONO_CAMPO.repeticiones} etiqueta={td.repeticiones} value={edicion.repeticiones} onChangeText={(repeticiones) => setEdicion((e) => ({ ...e, repeticiones }))} />
                      </View>
                    </View>
                    <View style={styles.dosColumnas}>
                      <View style={styles.mitad}>
                        <Campo icono={ICONO_CAMPO.peso} etiqueta={td.peso} value={edicion.peso} onChangeText={(peso) => setEdicion((e) => ({ ...e, peso }))} keyboardType="decimal-pad" />
                      </View>
                      <View style={styles.mitad}>
                        <Campo icono={ICONO_CAMPO.descanso} etiqueta={td.descanso} value={edicion.descanso} onChangeText={(descanso) => setEdicion((e) => ({ ...e, descanso }))} keyboardType="number-pad" />
                      </View>
                    </View>
                    <View style={styles.acciones}>
                      <Pressable accessibilityRole="button" onPress={() => guardarEdicion(ejercicio)}>
                        <ThemedText type="smallBold">{td.guardar}</ThemedText>
                      </Pressable>
                      <Pressable accessibilityRole="button" onPress={() => setEditandoId(null)}>
                        <ThemedText type="small" themeColor="textSecondary">{td.cancelar}</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.acciones}>
                    <Pressable accessibilityRole="button" onPress={() => abrirEdicion(ejercicio)} hitSlop={8}>
                      <ThemedText type="small">{td.editar}</ThemedText>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => quitar(ejercicio)} hitSlop={8}>
                      <ThemedText type="small" style={styles.peligro}>
                        {confirmandoId === ejercicio.id ? td.confirmarQuitar : td.quitar}
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </ThemedView>
            );
          })
        )}

        <Boton titulo={td.buscarWger} onPress={() => setBuscando(true)} colorFondo={color} />
        <BuscadorEjercicios visible={buscando} onCerrar={() => setBuscando(false)} onElegir={anadir} />

        <ThemedText type="smallBold">{td.anadirPropio}</ThemedText>
        <Campo icono={ICONO_CAMPO.ejercicio} etiqueta={td.nombreEjercicio} value={nombrePropio} onChangeText={setNombrePropio} onSubmitEditing={anadirPropio} returnKeyType="done" />
        <Boton titulo={td.anadirPropio} onPress={anadirPropio} cargando={guardandoPropio} secundario />

        {error && <Mensaje texto={error.texto} detalle={error.detalle} />}

        <Boton
          titulo={confirmandoRutina ? td.confirmarQuitarRutina : td.quitarRutina}
          onPress={quitarTodaLaRutina}
          secundario
        />
      </View>
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
  espacio: {
    marginTop: Spacing.four,
  },
  centrado: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  tarjeta: {
    borderRadius: 18,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  ejercicio: {
    borderRadius: 16,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  ejercicioCabecera: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  miniatura: {
    borderRadius: 10,
    height: 56,
    width: 56,
  },
  ejercicioTextos: {
    flex: 1,
    gap: 2,
  },
  acciones: {
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'flex-end',
  },
  edicion: {
    gap: Spacing.two,
  },
  dosColumnas: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  mitad: {
    flex: 1,
  },
  peligro: {
    color: '#D32F2F',
  },
  subtituloFila: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
});
