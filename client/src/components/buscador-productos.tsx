import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton, Campo, Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { DatosProducto } from '@/lib/compras';
import { buscarEnCatalogo, type ProductoCatalogo } from '@/lib/open-food-facts';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';

const t = textos.buscador;

type BuscadorProductosProps = {
  visible: boolean;
  color: string;
  onCerrar: () => void;
  onElegir: (datos: DatosProducto) => Promise<void>;
};

/**
 * Buscador de productos sobre Open Food Facts, con lista filtrable.
 * Espera a que dejes de escribir (350 ms) y cancela la búsqueda anterior, para no saturar la API.
 * Al elegir un resultado, se pide un precio opcional antes de añadirlo.
 */
export function BuscadorProductos({ visible, color, onCerrar, onElegir }: BuscadorProductosProps) {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<ProductoCatalogo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<ErrorDescrito | null>(null);
  const [elegido, setElegido] = useState<ProductoCatalogo | 'manual' | null>(null);
  const [nombreManual, setNombreManual] = useState('');
  const [precio, setPrecio] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Búsqueda con retardo y cancelación.
  useEffect(() => {
    if (!visible) return;
    const texto = termino.trim();
    if (texto.length < 2) {
      setResultados([]);
      setError(null);
      setCargando(false);
      return;
    }
    const controlador = new AbortController();
    setCargando(true);
    const temporizador = setTimeout(() => {
      buscarEnCatalogo(texto, controlador.signal)
        .then((lista) => {
          setResultados(lista);
          setError(null);
        })
        .catch((e) => {
          if (controlador.signal.aborted) return;
          setResultados([]);
          setError(describirError(e));
        })
        .finally(() => {
          if (!controlador.signal.aborted) setCargando(false);
        });
    }, 350);
    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [termino, visible]);

  function cerrar() {
    setTermino('');
    setResultados([]);
    setElegido(null);
    setPrecio('');
    setNombreManual('');
    setError(null);
    onCerrar();
  }

  function precioNumero(): number | null | 'error' {
    const texto = precio.trim().replace(',', '.');
    if (!texto) return null;
    const valor = Number(texto);
    return Number.isFinite(valor) && valor >= 0 ? valor : 'error';
  }

  async function confirmar() {
    if (!elegido) return;
    const valor = precioNumero();
    if (valor === 'error') {
      setError({ texto: t.precioNoValido, detalle: `Precio escrito: ${precio}` });
      return;
    }
    const datos: DatosProducto =
      elegido === 'manual'
        ? { nombre: nombreManual.trim(), precio: valor }
        : {
            nombre: elegido.nombre,
            marca: elegido.marca,
            imagenUrl: elegido.imagen,
            codigoBarras: /^[0-9]{6,14}$/.test(elegido.codigo) ? elegido.codigo : null,
            precio: valor,
          };
    if (!datos.nombre) {
      setError({ texto: t.nombreVacio, detalle: 'Nombre vacío' });
      return;
    }
    setGuardando(true);
    try {
      await onElegir(datos);
      cerrar();
    } catch (e) {
      setError(describirError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cerrar} presentationStyle="pageSheet">
      <SafeAreaView style={styles.contenedor} edges={['top', 'bottom']}>
        <View style={styles.cabecera}>
          <ThemedText type="subtitle">{t.titulo}</ThemedText>
          <Pressable accessibilityRole="button" onPress={cerrar} hitSlop={12}>
            <ThemedText type="smallBold">{t.cerrar}</ThemedText>
          </Pressable>
        </View>

        {elegido ? (
          <ThemedView style={styles.panel}>
            <ThemedText type="smallBold">
              {elegido === 'manual' ? t.sinCatalogo : (elegido as ProductoCatalogo).nombre}
            </ThemedText>
            {elegido === 'manual' && (
              <Campo etiqueta={t.nombre} value={nombreManual} onChangeText={setNombreManual} autoFocus />
            )}
            <Campo
              etiqueta={t.precio}
              value={precio}
              onChangeText={setPrecio}
              keyboardType="decimal-pad"
              placeholder="0,00"
            />
            <ThemedText type="small" themeColor="textSecondary">{t.precioAyuda}</ThemedText>
            {error && <Mensaje texto={error.texto} detalle={error.detalle} />}
            <Boton titulo={t.anadir} onPress={confirmar} cargando={guardando} colorFondo={color} />
            <Boton titulo={t.volver} onPress={() => setElegido(null)} secundario />
          </ThemedView>
        ) : (
          <>
            <Campo
              etiqueta={t.buscar}
              value={termino}
              onChangeText={setTermino}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
              placeholder={t.ejemplo}
            />

            {cargando && <ActivityIndicator style={styles.espacio} />}
            {error && <Mensaje texto={error.texto} detalle={error.detalle} />}

            <FlatList
              data={resultados}
              keyExtractor={(item) => item.codigo}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              windowSize={7}
              removeClippedSubviews
              ListHeaderComponent={
                termino.trim().length >= 2 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setNombreManual(termino.trim());
                      setElegido('manual');
                    }}
                    style={styles.fila}>
                    <ThemedText type="smallBold">{t.anadirSinCatalogo(termino.trim())}</ThemedText>
                  </Pressable>
                ) : undefined
              }
              ListEmptyComponent={
                termino.trim().length >= 2 && !cargando && !error ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
                    {t.sinResultados}
                  </ThemedText>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
                    {t.ayuda}
                  </ThemedText>
                )
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.nombre}${item.marca ? `, ${item.marca}` : ''}`}
                  onPress={() => setElegido(item)}
                  style={({ pressed }) => [styles.fila, { opacity: pressed ? 0.7 : 1 }]}>
                  {item.imagen ? (
                    <Image source={{ uri: item.imagen }} style={styles.imagen} contentFit="contain" transition={150} />
                  ) : (
                    <View style={[styles.imagen, { backgroundColor: color, opacity: 0.35 }]} />
                  )}
                  <View style={styles.textos}>
                    <ThemedText type="smallBold">{item.nombre}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {[item.marca, item.cantidad].filter(Boolean).join(' · ')}
                    </ThemedText>
                  </View>
                </Pressable>
              )}
              ListFooterComponent={
                <ThemedText type="small" themeColor="textSecondary" style={styles.atribucion}>
                  {t.atribucion}
                </ThemedText>
              }
            />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cabecera: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panel: {
    gap: Spacing.three,
  },
  espacio: {
    marginVertical: Spacing.two,
  },
  fila: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  imagen: {
    borderRadius: 8,
    height: 48,
    width: 48,
  },
  textos: {
    flex: 1,
  },
  centrado: {
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
  atribucion: {
    paddingVertical: Spacing.three,
    textAlign: 'center',
  },
});
