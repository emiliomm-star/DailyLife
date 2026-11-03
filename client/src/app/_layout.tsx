import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import Head from 'expo-router/head';
import { ScrollViewStyleReset } from 'expo-router/html';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Boton, Mensaje, Pantalla } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { textos } from '@/lib/textos';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Head>
        <title>DailyLife</title>
        <meta name="theme-color" content="#208AEF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="DailyLife" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <ScrollViewStyleReset />
      <AuthProvider>
        <AnimatedSplashOverlay />
        <RootStack />
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * Las rutas protegidas solo existen mientras se cumple su condición (Stack.Protected):
 * sin sesión solo se ven login y registro; con sesión sin grupo, solo la pantalla de grupo;
 * y con grupo, la app.
 */
function RootStack() {
  const { estado, errorGrupo, cerrarSesion, recargarGrupo } = useAuth();

  useEffect(() => {
    if (estado !== 'cargando') {
      SplashScreen.hideAsync();
    }
  }, [estado]);

  if (estado === 'cargando') {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (estado === 'error') {
    return (
      <Pantalla>
        <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
          {textos.errorGrupo.titulo}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          {textos.errorGrupo.descripcion}
        </ThemedText>
        {errorGrupo && <Mensaje texto={errorGrupo.texto} detalle={errorGrupo.detalle} />}
        <Boton titulo={textos.general.reintentar} onPress={recargarGrupo} />
        <Boton titulo={textos.general.cerrarSesion} onPress={cerrarSesion} secundario />
      </Pantalla>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={estado === 'app'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={estado === 'sin-grupo'}>
        <Stack.Screen name="grupo" />
      </Stack.Protected>
      <Stack.Protected guard={estado === 'sin-sesion'}>
        <Stack.Screen name="login" />
        <Stack.Screen name="registro" />
      </Stack.Protected>
    </Stack>
  );
}
