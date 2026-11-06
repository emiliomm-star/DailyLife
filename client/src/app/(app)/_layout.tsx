import { Stack } from 'expo-router';

import { BotonInicio } from '@/components/boton-inicio';
import { SincronizacionProvider } from '@/lib/sincronizacion';

/** Zona protegida de la app (solo con sesión y grupo). Todas sus pantallas se sincronizan en tiempo real. */
export default function AppLayout() {
  return (
    <SincronizacionProvider>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerRight: () => <BotonInicio />,
        }}
      />
    </SincronizacionProvider>
  );
}
