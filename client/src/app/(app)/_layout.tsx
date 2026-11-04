import { Stack } from 'expo-router';

/** Zona protegida de la app (solo con sesión y grupo). Navegación con pila: el dashboard y sus módulos. */
export default function AppLayout() {
  return <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }} />;
}
