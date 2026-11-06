import { Pressable, StyleSheet, View } from 'react-native';

import { EstadoIcono } from '@/components/estado-icono';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { colorDeTexto, ICONOS, PALETA } from '@/lib/estados-visual';

type SelectorVisualProps = {
  icono: string;
  color: string;
  onIcono: (clave: string) => void;
  onColor: (color: string) => void;
};

/** Elección de icono y color, con los mismos iconos y paleta que los estados. */
export function SelectorVisual({ icono, color, onIcono, onColor }: SelectorVisualProps) {
  return (
    <View style={styles.contenedor}>
      <ThemedText type="small" themeColor="textSecondary">Icono</ThemedText>
      <View style={styles.fila}>
        {ICONOS.map((opcion) => {
          const seleccionado = icono === opcion.clave;
          return (
            <Pressable
              key={opcion.clave}
              accessibilityRole="button"
              accessibilityLabel={opcion.etiqueta}
              accessibilityState={{ selected: seleccionado }}
              onPress={() => onIcono(opcion.clave)}
              style={[styles.icono, seleccionado && styles.seleccionado]}>
              <EstadoIcono clave={opcion.clave} color={seleccionado ? '#1A1A1A' : '#60646C'} tamano={22} />
            </Pressable>
          );
        })}
      </View>
      <ThemedText type="small" themeColor="textSecondary">Color</ThemedText>
      <View style={styles.fila}>
        {PALETA.map((opcion) => {
          const seleccionado = color === opcion;
          return (
            <Pressable
              key={opcion}
              accessibilityRole="button"
              accessibilityLabel={`Color ${opcion}`}
              accessibilityState={{ selected: seleccionado }}
              onPress={() => onColor(opcion)}
              style={[styles.muestra, { backgroundColor: opcion }, seleccionado && styles.seleccionado]}>
              <ThemedText style={{ color: colorDeTexto(opcion), fontWeight: '800' }}>
                {seleccionado ? '✓' : ''}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: Spacing.two,
  },
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  icono: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  muestra: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  seleccionado: {
    borderColor: '#1A1A1A',
    borderWidth: 3,
  },
});
