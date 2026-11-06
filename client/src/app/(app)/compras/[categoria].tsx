import { Stack, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { textos } from '@/lib/textos';

/** Productos de una categoría. Se construye en el siguiente paso; de momento solo muestra el marcador. */
export default function CategoriaScreen() {
  const { categoria } = useLocalSearchParams<{ categoria: string }>();

  return (
    <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four }}>
      <Stack.Screen options={{ title: textos.compras.categorias }} />
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        {textos.compras.proximamente}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" selectable>{categoria}</ThemedText>
    </ThemedView>
  );
}
