import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Botón de la cabecera que vuelve a la pantalla principal (el dashboard). */
export function BotonInicio() {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ir a la pantalla principal"
      hitSlop={12}
      onPress={() => router.navigate('/')}
      style={({ pressed }) => ({ paddingHorizontal: 8, opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name="home-outline" size={24} color={theme.text} />
    </Pressable>
  );
}
