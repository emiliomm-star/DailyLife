import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton, Campo, Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { type DatosProducto, parsearPrecio } from '@/lib/compras';
import { buscarEnCatalogo, CatalogoNoDisponible, type ProductoCatalogo } from '@/lib/open-food-facts';
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
  // Término ya enviado: la búsqueda solo se lanza al pulsar Buscar, no mientras escribes.
  const [buscado, setBuscado] = useState('');
  const [resultados, setResultados] = useState<ProductoCatalogo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<ErrorDescrito | null>(null);
  const [elegido, setElegido] = useState<ProductoCatalogo | null>(null);
  const [precio, setPrecio] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Una búsqueda por cada envío: el servidor de Open Food Facts limita las búsquedas a 10 por minuto por IP.
  useEffect(() => {
    if (!visible) return;
    const texto = buscado.trim();
    if (texto.length < 3) {
      setResultados([]);
      setError(null);
      setCargando(false);
      return;
    }
    const controlador = new AbortController();
    setCargando(true);
    buscarEnCatalogo(texto, controlador.signal)
      .then((lista) => {
        setResultados(lista);
        setError(null);
      })
      .catch((e) => {
        if (controlador.signal.aborted) return;
        setResultados([]);
        setError(
          e instanceof CatalogoNoDisponible
            ? { texto: t.catalogoOcupado, detalle: e.message }
            : describirError(e),
        );
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });
    return () => controlador.abort();
  }, [buscado, visible]);

  function buscar() {
    const texto = termino.trim();
    if (texto.length < 3) {
      setError({ texto: t.ayuda, detalle: `Términos escritos: ${texto.length} caracteres` });
      return;
    }
    setError(null);
    setBuscado(texto);
  }

  function cerrar() {
    setTermino('');
    setBuscado('');
    setResultados([]);
    setElegido(null);
    setPrecio('');
    setError(null);
    onCerrar();
  }

  async function confirmar() {
    if (!elegido) return;
    const valor = parsearPrecio(precio);
    if (valor === 'error') {
      setError({ texto: t.precioNoValido, detalle: `Precio escrito: ${precio}` });
      return;
    }
    setGuardando(true);
    try {
      await onElegir({
        nombre: elegido.nombre,
        marca: elegido.marca,
        imagenUrl: elegido.imagen,
        codigoBarras: /^[0-9]{6,14}$/.test(elegido.codigo) ? elegido.codigo : null,
        precio: valor,
      });
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
            <ThemedText type="smallBold">{elegido.nombre}</ThemedText>
            {elegido.marca && <ThemedText type="small" themeColor="textSecondary">{elegido.marca}</ThemedText>}
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
              onSubmitEditing={buscar}
              placeholder={t.ejemplo}
            />
            <Boton titulo={t.buscarBoton} onPress={buscar} cargando={cargando} colorFondo={color} />

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
                undefined
              }
              ListEmptyComponent={
                buscado.trim().length >= 3 && !cargando && !error ? (
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
