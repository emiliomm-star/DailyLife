import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/** Fila de opciones tipo chip: una activa y el resto apagadas. Sirve para filtros y para elegir valores. */
export function ChipsOpciones<T extends string>({
  opciones,
  valor,
  onCambiar,
  colorActivo = '#1A1A1A',
}: {
  opciones: ReadonlyArray<{ clave: T; etiqueta: string; icono?: ComponentProps<typeof Ionicons>['name'] }>;
  valor: T;
  onCambiar: (clave: T) => void;
  colorActivo?: string;
}) {
  return (
    <View style={styles.fila}>
      {opciones.map((opcion) => {
        const activa = opcion.clave === valor;
        return (
          <Pressable
            key={opcion.clave}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            onPress={() => onCambiar(opcion.clave)}
            style={[styles.chip, activa ? { backgroundColor: colorActivo } : styles.chipInactivo]}>
            {opcion.icono && (
              <Ionicons name={opcion.icono} size={15} color={activa ? '#FFFFFF' : undefined} />
            )}
            <ThemedText type="small" style={activa ? styles.textoActivo : undefined}>
              {opcion.etiqueta}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
  },
  chipInactivo: {
    backgroundColor: 'rgba(128,128,128,0.18)',
  },
  textoActivo: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
