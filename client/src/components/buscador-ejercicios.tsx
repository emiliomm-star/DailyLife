import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Campo } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { buscarEjercicios, type EjercicioCatalogo } from '@/lib/catalogo-wger';
import type { DatosEjercicio } from '@/lib/gimnasio';
import { textos } from '@/lib/textos';

const t = textos.gimnasio.buscador;

type BuscadorEjerciciosProps = {
  visible: boolean;
  onCerrar: () => void;
  onElegir: (datos: DatosEjercicio) => Promise<void>;
};

/** Buscador del catálogo de wger, local y con lista filtrable al escribir (no usa la red). */
export function BuscadorEjercicios({ visible, onCerrar, onElegir }: BuscadorEjerciciosProps) {
  const [termino, setTermino] = useState('');
  const resultados = useMemo(() => buscarEjercicios(termino), [termino]);

  async function elegir(ejercicio: EjercicioCatalogo) {
    await onElegir({
      nombre: ejercicio.n,
      wger_id: ejercicio.id,
      categoria: ejercicio.c,
      musculos: ejercicio.m.join(', ') || null,
      imagen_url: ejercicio.i,
    });
    setTermino('');
    onCerrar();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar} presentationStyle="pageSheet">
      <SafeAreaView style={styles.contenedor} edges={['top', 'bottom']}>
        <View style={styles.cabecera}>
          <ThemedText type="subtitle">{t.titulo}</ThemedText>
          <Pressable accessibilityRole="button" onPress={onCerrar} hitSlop={12}>
            <ThemedText type="smallBold">{t.cerrar}</ThemedText>
          </Pressable>
        </View>

        <Campo
          etiqueta={t.buscar}
          value={termino}
          onChangeText={setTermino}
          autoFocus
          autoCorrect={false}
          placeholder={t.ejemplo}
        />

        <FlatList
          data={resultados}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={15}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
              {termino.trim().length < 2 ? t.ayuda : t.sinResultados}
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.n}
              onPress={() => elegir(item)}
              style={({ pressed }) => [styles.fila, { opacity: pressed ? 0.7 : 1 }]}>
              {item.i ? (
                <Image source={{ uri: item.i }} style={styles.imagen} contentFit="contain" transition={150} />
              ) : (
                <View style={[styles.imagen, styles.sinImagen]} />
              )}
              <View style={styles.textos}>
                <ThemedText type="smallBold">{item.n}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {[item.c, item.m.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
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
  fila: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  imagen: {
    borderRadius: 8,
    height: 52,
    width: 52,
  },
  sinImagen: {
    backgroundColor: 'rgba(128,128,128,0.2)',
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
