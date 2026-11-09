import { Pressable, StyleSheet } from 'react-native';

import { EstadoIcono } from '@/components/estado-icono';
import { ThemedView } from '@/components/themed-view';
import { ICONOS } from '@/lib/estados-visual';
import { Spacing } from '@/constants/theme';

/** Rejilla de iconos para elegir el de un estado. Guarda la clave del icono (ver ICONOS). */
export function SelectorIcono({ valor, onCambiar }: { valor: string; onCambiar: (clave: string) => void }) {
  return (
    <ThemedView style={styles.rejilla}>
      {ICONOS.map((icono) => {
        const seleccionado = valor === icono.clave;
        return (
          <Pressable
            key={icono.clave}
            accessibilityRole="button"
            accessibilityLabel={icono.etiqueta}
            accessibilityState={{ selected: seleccionado }}
            onPress={() => onCambiar(icono.clave)}
            style={[styles.opcion, seleccionado && styles.seleccionado]}>
            <EstadoIcono clave={icono.clave} color={seleccionado ? '#1A1A1A' : '#60646C'} tamano={22} />
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  rejilla: {
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
  seleccionado: {
    borderWidth: 3,
    borderColor: '#1A1A1A',
  },
});
