import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Altura fija de una fila y paso entre filas (altura + separación). Las filas de una lista ordenable lo comparten. */
export const ALTURA_FILA = 64;
export const PASO_FILA = ALTURA_FILA + Spacing.two;

type FilaArrastrableProps = PropsWithChildren<{
  /** Desplazamiento vertical mientras otra fila se arrastra: 0, +PASO_FILA o -PASO_FILA. */
  desplazamiento: number;
  /** Es la fila que el usuario está arrastrando: sigue al dedo con dragY. */
  arrastrada: boolean;
  /** Desplazamiento de la fila arrastrada, compartido por la lista (se actualiza en el hilo de la interfaz). */
  dragY: SharedValue<number>;
  /** Sin asa de arrastre (p. ej. mientras se edita la fila). */
  deshabilitada: boolean;
  /** Fila sin editar: altura fija para que el cálculo de posiciones sea exacto. */
  compacta: boolean;
  etiquetaArrastre: string;
  onInicio: () => void;
  onMover: (desplazamientoY: number) => void;
  onSoltar: () => void;
}>;

/**
 * Fila que se puede arrastrar con su asa (≡) para cambiar el orden de una lista.
 * El arrastre lo gestiona Reanimated/Gesture Handler en el hilo nativo; la lista solo recibe
 * el cambio de posición cuando la fila pasa a otro hueco.
 */
export function FilaArrastrable({
  desplazamiento,
  arrastrada,
  dragY,
  deshabilitada,
  compacta,
  etiquetaArrastre,
  onInicio,
  onMover,
  onSoltar,
  children,
}: FilaArrastrableProps) {
  const theme = useTheme();

  const gesto = Gesture.Pan()
    .enabled(!deshabilitada)
    .onStart(() => {
      runOnJS(onInicio)();
    })
    .onUpdate((evento) => {
      dragY.value = evento.translationY;
      runOnJS(onMover)(evento.translationY);
    })
    .onEnd(() => {
      runOnJS(onSoltar)();
    })
    .onFinalize(() => {
      dragY.value = 0;
    });

  const estiloMovimiento = useAnimatedStyle(() => ({
    transform: [{ translateY: arrastrada ? dragY.value : desplazamiento }],
  }));

  return (
    <Animated.View style={[estiloMovimiento, arrastrada && styles.elevada]}>
      <ThemedView type="backgroundElement" style={[styles.fila, compacta && styles.compacta]}>
        <GestureDetector gesture={gesto}>
          <View accessibilityLabel={etiquetaArrastre} style={[styles.asa, deshabilitada && styles.asaDeshabilitada]}>
            <Ionicons name="reorder-three" size={28} color={theme.textSecondary} />
          </View>
        </GestureDetector>
        {children}
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fila: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 48,
    padding: Spacing.three,
  },
  compacta: {
    height: ALTURA_FILA,
  },
  asa: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
  },
  asaDeshabilitada: {
    opacity: 0.3,
  },
  elevada: {
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 10,
  },
});
