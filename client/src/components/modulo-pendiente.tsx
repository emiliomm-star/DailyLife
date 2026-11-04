import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { textos } from '@/lib/textos';

/** Pantalla provisional de un módulo que todavía no está implementado. */
export function ModuloPendiente({ titulo }: { titulo: string }) {
  return (
    <ThemedView style={styles.contenedor}>
      <Stack.Screen options={{ title: titulo }} />
      <ThemedText type="subtitle">{titulo}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.texto}>
        {textos.dashboard.proximamente}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  texto: {
    textAlign: 'center',
  },
});
