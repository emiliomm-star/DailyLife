import { Stack, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { BuscadorProductos } from '@/components/buscador-productos';
import { Boton, Campo, Mensaje } from '@/components/formulario';
import { EstadoIcono } from '@/components/estado-icono';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import {
  Categoria,
  crearProducto,
  DatosProducto,
  listarProductos,
  marcarComprado,
  marcarPendiente,
  obtenerCategoria,
  parsearPrecio,
  Producto,
  quitarProducto,
  reiniciarCategoria,
} from '@/lib/compras';
import { colorDeTexto, visualDe } from '@/lib/estados-visual';
import { useVersionTabla } from '@/lib/sincronizacion';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';

const t = textos.productos;

type Seccion = { titulo: string; tipo: 'pendiente' | 'comprado'; data: Producto[] };

/** Productos de una categoría: pendientes arriba, comprados abajo. Tocar un producto cambia su estado. */
export default function CategoriaScreen() {
  const { categoria: categoriaId } = useLocalSearchParams<{ categoria: string }>();
  const { grupo } = useAuth();
  const grupoId = grupo?.id;
  const versionProductos = useVersionTabla('productos');
  const versionCategorias = useVersionTabla('categorias');

  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [nombrePropio, setNombrePropio] = useState('');
  const [precioPropio, setPrecioPropio] = useState('');
  const [guardandoPropio, setGuardandoPropio] = useState(false);
  const [errorPropio, setErrorPropio] = useState<ErrorDescrito | null>(null);
  const [importe, setImporte] = useState('');
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [confirmandoReinicio, setConfirmandoReinicio] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDescrito | null>(null);

  const cargar = useCallback(async () => {
    if (!grupoId || !categoriaId) return;
    try {
      const [cat, lista] = await Promise.all([obtenerCategoria(categoriaId), listarProductos(grupoId, categoriaId)]);
      setCategoria(cat);
      setProductos(lista);
      setError(null);
    } catch (e) {
      setError(describirError(e));
    } finally {
      setCargando(false);
    }
  }, [grupoId, categoriaId]);

  // Carga inicial y recarga al cambiar productos o la categoría (también si los cambia otro miembro).
  useEffect(() => {
    cargar();
  }, [cargar, versionProductos, versionCategorias]);

  const secciones = useMemo<Seccion[]>(() => {
    const pendientes = productos.filter((p) => !p.comprado);
    const comprados = productos
      .filter((p) => p.comprado)
      .sort((a, b) => (b.comprado_en ?? '').localeCompare(a.comprado_en ?? ''));
    return [
      { titulo: t.pendientes, tipo: 'pendiente', data: pendientes },
      { titulo: t.comprados, tipo: 'comprado', data: comprados },
    ];
  }, [productos]);

  const visual = categoria ? visualDe(categoria) : null;
  const color = visual?.color ?? '#4D96FF';
  const textoColor = colorDeTexto(color);

  /** Operación de escritura con estado de "ocupado" y recarga al terminar. */
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

  async function anadirProducto(datos: DatosProducto) {
    if (!grupoId || !categoriaId) return;
    await crearProducto(grupoId, categoriaId, datos);
    await cargar();
  }

  /** Producto propio: solo nombre obligatorio; precio opcional. */
  async function anadirPropio() {
    if (!grupoId || !categoriaId) return;
    const nombre = nombrePropio.trim();
    if (!nombre) {
      setErrorPropio({ texto: textos.propio.nombreVacio, detalle: 'Nombre vacío' });
      return;
    }
    const precio = parsearPrecio(precioPropio);
    if (precio === 'error') {
      setErrorPropio({ texto: textos.propio.precioNoValido, detalle: `Precio escrito: ${precioPropio}` });
      return;
    }
    setErrorPropio(null);
    setGuardandoPropio(true);
    try {
      await anadirProducto({ nombre, precio });
      setNombrePropio('');
      setPrecioPropio('');
    } catch (e) {
      setErrorPropio(describirError(e));
    } finally {
      setGuardandoPropio(false);
    }
  }

  /** Lee el importe escrito (acepta coma o punto). Devuelve null si no hay importe válido. */
  function importeEscrito(): number | null | 'error' {
    const texto = importe.trim().replace(',', '.');
    if (!texto) return null;
    const valor = Number(texto);
    return Number.isFinite(valor) && valor >= 0 ? valor : 'error';
  }

  const tocarProducto = useCallback(
    async (producto: Producto) => {
      setError(null);
      if (producto.comprado) {
        setOcupadoId(producto.id);
        try {
          await marcarPendiente(producto.id);
          await cargar();
        } catch (e) {
          setError(describirError(e));
        } finally {
          setOcupadoId(null);
        }
        return;
      }

      const valor = importeEscrito();
      if (valor === 'error') {
        setError({ texto: 'El importe no es válido.', detalle: `Importe escrito: ${importe}` });
        return;
      }
      setOcupadoId(producto.id);
      try {
        await marcarComprado(producto.id, valor);
        setImporte('');
        await cargar();
      } catch (e) {
        setError(describirError(e));
      } finally {
        setOcupadoId(null);
      }
    },
    // importeEscrito depende de importe; se recrea al cambiar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [importe, cargar],
  );

  function quitar(producto: Producto) {
    if (confirmandoId !== producto.id) {
      setConfirmandoId(producto.id);
      return;
    }
    setConfirmandoId(null);
    operar(() => quitarProducto(producto.id));
  }

  function reiniciar() {
    if (!confirmandoReinicio) {
      setConfirmandoReinicio(true);
      return;
    }
    setConfirmandoReinicio(false);
    if (!grupoId || !categoriaId) return;
    operar(() => reiniciarCategoria(grupoId, categoriaId));
  }

  if (!cargando && !categoria) {
    return (
      <ThemedView style={styles.centrado}>
        <Stack.Screen options={{ title: textos.compras.categorias }} />
        <ThemedText type="small" themeColor="textSecondary">{t.sinCategoria}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.contenedor}>
      <Stack.Screen options={{ title: categoria?.nombre ?? textos.compras.categorias }} />

      {cargando ? (
        <ActivityIndicator style={styles.espacio} />
      ) : (
        <SectionList
          sections={secciones}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.columna}>
              <View style={styles.bloque}>
                <ThemedText type="smallBold">{textos.propio.titulo}</ThemedText>
                <Campo
                  etiqueta={textos.propio.nombre}
                  value={nombrePropio}
                  onChangeText={setNombrePropio}
                  onSubmitEditing={anadirPropio}
                  returnKeyType="done"
                />
                <Campo
                  etiqueta={textos.propio.precio}
                  value={precioPropio}
                  onChangeText={setPrecioPropio}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                />
                {errorPropio && <Mensaje texto={errorPropio.texto} detalle={errorPropio.detalle} />}
                <Boton
                  titulo={textos.propio.anadir}
                  onPress={anadirPropio}
                  cargando={guardandoPropio}
                  colorFondo={color}
                />
              </View>

              <Boton titulo={textos.buscador.buscarOff} onPress={() => setBuscando(true)} secundario />
              <BuscadorProductos
                visible={buscando}
                color={color}
                onCerrar={() => setBuscando(false)}
                onElegir={anadirProducto}
              />
              <Campo
                etiqueta={t.importe}
                value={importe}
                onChangeText={setImporte}
                keyboardType="decimal-pad"
                placeholder="0,00"
              />
              <ThemedText type="small" themeColor="textSecondary">{t.importeAyuda}</ThemedText>
              {error && <Mensaje texto={error.texto} detalle={error.detalle} />}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" style={styles.cabeceraSeccion}>
              {`${section.titulo} (${section.data.length})`}
            </ThemedText>
          )}
          renderSectionFooter={({ section }) =>
            section.data.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.vacio}>
                {section.tipo === 'pendiente' ? t.vacioPendientes : t.vacioComprados}
              </ThemedText>
            ) : null
          }
          renderItem={({ item, section, index }) => (
            <FilaProducto
              producto={item}
              esComprado={section.tipo === 'comprado'}
              color={color}
              textoColor={textoColor}
              indice={index}
              ocupado={ocupadoId === item.id}
              confirmando={confirmandoId === item.id}
              deshabilitado={ocupadoId !== null}
              onTocar={tocarProducto}
              onQuitar={quitar}
            />
          )}
          ListFooterComponent={
            productos.some((p) => p.comprado) ? (
              <View style={styles.columna}>
                <Boton
                  titulo={confirmandoReinicio ? t.confirmarReiniciar : t.reiniciar}
                  onPress={reiniciar}
                  secundario
                  cargando={ocupado}
                />
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
}

const FilaProducto = memo(function FilaProducto({
  producto,
  esComprado,
  color,
  textoColor,
  indice,
  ocupado,
  confirmando,
  deshabilitado,
  onTocar,
  onQuitar,
}: {
  producto: Producto;
  esComprado: boolean;
  color: string;
  textoColor: string;
  indice: number;
  ocupado: boolean;
  confirmando: boolean;
  deshabilitado: boolean;
  onTocar: (producto: Producto) => void;
  onQuitar: (producto: Producto) => void;
}) {
  return (
    <Animated.View entering={FadeIn.delay(Math.min(indice, 10) * 30)} layout={LinearTransition}>
      <ThemedView type="backgroundElement" style={styles.fila}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: esComprado, disabled: deshabilitado }}
          accessibilityLabel={producto.nombre}
          disabled={deshabilitado}
          onPress={() => onTocar(producto)}
          style={styles.filaPrincipal}>
          <View style={[styles.check, esComprado ? { backgroundColor: color, borderColor: color } : { borderColor: color }]}>
            {ocupado ? (
              <ActivityIndicator size="small" color={esComprado ? textoColor : color} />
            ) : esComprado ? (
              <ThemedText style={{ color: textoColor, fontWeight: '800' }}>✓</ThemedText>
            ) : null}
          </View>
          <View style={styles.textos}>
            <ThemedText style={esComprado ? styles.nombreComprado : styles.nombre}>{producto.nombre}</ThemedText>
            {(producto.marca || producto.precio != null) && (
              <ThemedText type="small" themeColor="textSecondary">
                {[producto.marca, producto.precio != null ? `${producto.precio.toFixed(2).replace('.', ',')} €` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </ThemedText>
            )}
            {esComprado && producto.comprado_en && (
              <ThemedText type="small" themeColor="textSecondary">
                {new Date(producto.comprado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </ThemedText>
            )}
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onQuitar(producto)} hitSlop={8} disabled={deshabilitado}>
          <ThemedText type="small" style={styles.peligro}>
            {confirmando ? t.confirmarQuitar : t.quitar}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  contenido: {
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    width: '100%',
  },
  columna: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  bloque: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
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
  cabeceraSeccion: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  vacio: {
    paddingVertical: Spacing.two,
  },
  fila: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  filaPrincipal: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  check: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  textos: {
    flex: 1,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '600',
  },
  nombreComprado: {
    fontSize: 16,
    opacity: 0.6,
    textDecorationLine: 'line-through',
  },
  peligro: {
    color: '#D32F2F',
    marginLeft: Spacing.two,
  },
});
