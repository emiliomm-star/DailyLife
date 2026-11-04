import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colorDeTexto } from '@/lib/estados-visual';

type EstadoTileProps = {
  nombre: string;
  icono: string;
  color: string;
  indice: number;
  cargando: boolean;
  deshabilitado: boolean;
  onPress: () => void;
};

/**
 * Botón grande de un estado: color vivo, icono y una pequeña animación al pulsar.
 * La animación corre en el hilo nativo de Reanimated, así que no bloquea la interfaz.
 * memo evita redibujar los botones que no cambian.
 */
function EstadoTileBase({ nombre, icono, color, indice, cargando, deshabilitado, onPress }: EstadoTileProps) {
  const escala = useSharedValue(1);
  const estiloAnimado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  const textoColor = colorDeTexto(color);

  return (
    <Animated.View entering={FadeInDown.delay(indice * 50).duration(260)} style={styles.contenedor}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nombre}
        disabled={deshabilitado}
        onPressIn={() => {
          escala.value = withSpring(0.94, { damping: 18, stiffness: 300 });
        }}
        onPressOut={() => {
          escala.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        onPress={onPress}>
        <Animated.View style={[styles.tile, { backgroundColor: color, opacity: deshabilitado && !cargando ? 0.6 : 1 }, estiloAnimado]}>
          {cargando ? (
            <ActivityIndicator color={textoColor} />
          ) : (
            <Text style={styles.icono} accessibilityElementsHidden importantForAccessibility="no">
              {icono}
            </Text>
          )}
          <Text style={[styles.nombre, { color: textoColor }]} numberOfLines={2}>
            {nombre}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export const EstadoTile = memo(EstadoTileBase);

const styles = StyleSheet.create({
  contenedor: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  tile: {
    alignItems: 'center',
    borderRadius: 20,
    gap: 6,
    justifyContent: 'center',
    minHeight: 110,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  icono: {
    fontSize: 34,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
