import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Boton, Campo, Mensaje } from '@/components/formulario';
import { EstadoIcono } from '@/components/estado-icono';
import { SelectorVisual } from '@/components/selector-visual';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import {
  actualizarCategoria,
  Categoria,
  crearCategoria,
  listarCategorias,
  quitarCategoria,
  ResumenCategoria,
  resumenPorCategoria,
  sembrarCategoriasIniciales,
} from '@/lib/compras';
import { colorDeTexto, PALETA, visualCategoria, visualDe } from '@/lib/estados-visual';
import { useVersionTabla } from '@/lib/sincronizacion';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';

const t = textos.compras;

/** Pantalla de categorías de compra: entrar en una muestra sus productos pendientes y comprados. */
export default function ComprasScreen() {
  const { grupo } = useAuth();
  const grupoId = grupo?.id;
  const versionCategorias = useVersionTabla('categorias');
  const versionProductos = useVersionTabla('productos');

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [resumen, setResumen] = useState<Record<string, ResumenCategoria>>({});
  const [cargando, setCargando] = useState(true);
  const [nueva, setNueva] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicion, setEdicion] = useState({ nombre: '', icono: '', color: '' });
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDescrito | null>(null);

  const cargar = useCallback(async () => {
    if (!grupoId) return;
    try {
      const [lista, cuentas] = await Promise.all([listarCategorias(grupoId), resumenPorCategoria(grupoId)]);
      setCategorias(lista);
      setResumen(cuentas);
      setError(null);
    } catch (e) {
      setError(describirError(e));
    } finally {
      setCargando(false);
    }
  }, [grupoId]);

  // Primera carga: crea las categorías de ejemplo si el grupo no tiene ninguna.
  useEffect(() => {
    if (!grupoId) return;
    sembrarCategoriasIniciales(grupoId, t.categoriasIniciales, visualCategoria)
      .catch((e) => setError(describirError(e)))
      .finally(cargar);
  }, [grupoId, cargar]);

  // Se recarga al cambiar categorías o productos (también si los cambia otro miembro).
  useEffect(() => {
    cargar();
  }, [cargar, versionCategorias, versionProductos]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  /** Operación de escritura: marca "ocupado", recarga al terminar y muestra el error si lo hay. */
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
    const nombre = nueva.trim();
    if (!nombre) {
      setError({ texto: t.nombreVacio, detalle: 'Nombre vacío' });
      return;
    }
    const orden = Math.max(0, ...categorias.map((c) => c.orden)) + 1;
    operar(async () => {
      await crearCategoria(grupoId, nombre, orden, visualCategoria(nombre, orden));
      setNueva('');
    });
  }

  function guardarEdicion(categoria: Categoria) {
    const nombre = edicion.nombre.trim();
    if (!nombre) {
      setError({ texto: t.nombreVacio, detalle: 'Nombre vacío' });
      return;
    }
    operar(async () => {
      await actualizarCategoria(categoria.id, { nombre, icono: edicion.icono, color: edicion.color });
      setEditandoId(null);
    });
  }

  function quitar(categoria: Categoria) {
    if (confirmandoId !== categoria.id) {
      setConfirmandoId(categoria.id);
      return;
    }
    setConfirmandoId(null);
    operar(() => quitarCategoria(categoria.id));
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t.titulo }} />

      <ThemedView style={styles.columna}>
        <ThemedText type="subtitle">{t.categorias}</ThemedText>

        {cargando ? (
          <ActivityIndicator style={styles.espacio} />
        ) : categorias.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">{t.vacio}</ThemedText>
        ) : (
          categorias.map((categoria, indice) => {
            const visual = visualDe(categoria);
            const cuenta = resumen[categoria.id] ?? { pendientes: 0, comprados: 0 };
            const textoColor = colorDeTexto(visual.color);

            if (editandoId === categoria.id) {
              return (
                <Animated.View key={categoria.id} layout={LinearTransition} style={styles.tarjetaEdicion}>
                  <Campo
                    etiqueta={t.nueva}
                    value={edicion.nombre}
                    onChangeText={(nombre) => setEdicion((e) => ({ ...e, nombre }))}
                    onSubmitEditing={() => guardarEdicion(categoria)}
                    autoFocus
                  />
                  <SelectorVisual
                    icono={edicion.icono}
                    color={edicion.color}
                    onIcono={(icono) => setEdicion((e) => ({ ...e, icono }))}
                    onColor={(color) => setEdicion((e) => ({ ...e, color }))}
                  />
                  <ThemedView style={styles.acciones}>
                    <Pressable accessibilityRole="button" onPress={() => guardarEdicion(categoria)} disabled={ocupado}>
                      <ThemedText type="smallBold">{t.guardar}</ThemedText>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => setEditandoId(null)}>
                      <ThemedText type="small" themeColor="textSecondary">{t.cancelar}</ThemedText>
                    </Pressable>
                  </ThemedView>
                </Animated.View>
              );
            }

            return (
              <Animated.View
                key={categoria.id}
                entering={FadeInDown.delay(indice * 40).duration(240)}
                layout={LinearTransition}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${categoria.nombre}: ${t.pendientes(cuenta.pendientes)}, ${t.comprados(cuenta.comprados)}`}
                  onPress={() => router.push({ pathname: '/compras/[categoria]', params: { categoria: categoria.id } })}
                  style={({ pressed }) => [styles.tarjeta, { backgroundColor: visual.color, opacity: pressed ? 0.85 : 1 }]}>
                  <View style={styles.icono}>
                    <EstadoIcono clave={visual.icono} color={textoColor} tamano={28} />
                  </View>
                  <ThemedView style={styles.textos}>
                    <ThemedText style={[styles.nombre, { color: textoColor }]}>{categoria.nombre}</ThemedText>
                    <ThemedText style={[styles.cuenta, { color: textoColor }]}>
                      {`${t.pendientes(cuenta.pendientes)} · ${t.comprados(cuenta.comprados)}`}
                    </ThemedText>
                  </ThemedView>
                </Pressable>

                <ThemedView style={styles.acciones}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setEditandoId(categoria.id);
                      setEdicion({ nombre: categoria.nombre, icono: visual.icono, color: visual.color });
                    }}
                    hitSlop={8}>
                    <ThemedText type="small">{t.editar}</ThemedText>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => quitar(categoria)} hitSlop={8} disabled={ocupado}>
                    <ThemedText type="small" style={styles.peligro}>
                      {confirmandoId === categoria.id ? t.confirmarQuitar : t.quitar}
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              </Animated.View>
            );
          })
        )}

        <ThemedText type="small" themeColor="textSecondary">{t.quitarAviso}</ThemedText>

        <Campo
          etiqueta={t.nueva}
          value={nueva}
          onChangeText={setNueva}
          onSubmitEditing={anadir}
          returnKeyType="done"
        />
        <Boton titulo={t.anadir} onPress={anadir} cargando={ocupado} colorFondo={PALETA[4]} />

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
  espacio: {
    marginVertical: Spacing.three,
  },
  tarjeta: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 84,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  icono: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  nombre: {
    fontSize: 18,
    fontWeight: '800',
  },
  cuenta: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },
  tarjetaEdicion: {
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  acciones: {
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.one,
  },
  peligro: {
    color: '#D32F2F',
  },
});
