import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Boton } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { textos } from '@/lib/textos';

/** Módulos del dashboard (RF-03). Añadir uno nuevo es añadir una entrada aquí y su carpeta en src/app/(app). */
const modulos = [
  { ruta: '/gimnasio', ...textos.dashboard.modulos.gimnasio },
  { ruta: '/go-to-work', ...textos.dashboard.modulos.goToWork },
  { ruta: '/compras', ...textos.dashboard.modulos.compras },
] as const;

export default function DashboardScreen() {
  const { grupo, cerrarSesion } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Stack.Screen options={{ title: textos.dashboard.titulo }} />

      <ThemedView style={styles.columna}>
        <ThemedText type="subtitle">
          {textos.inicio.bienvenida}
          {grupo ? `, ${grupo.nombre}` : ''}
        </ThemedText>

        {modulos.map((modulo) => (
          <Pressable
            key={modulo.ruta}
            accessibilityRole="button"
            onPress={() => router.push(modulo.ruta)}
            style={({ pressed }) => [styles.tarjeta, { opacity: pressed ? 0.7 : 1 }]}>
            <ThemedView type="backgroundElement" style={styles.tarjetaInterior}>
              <ThemedText type="smallBold">{modulo.titulo}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {modulo.descripcion}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}

        {grupo && (
          <ThemedView type="backgroundElement" style={styles.tarjetaInterior}>
            <ThemedText type="smallBold">{textos.inicio.codigoInvitacion}</ThemedText>
            <ThemedText type="title" selectable style={styles.codigo}>
              {grupo.codigo_invitacion}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {textos.inicio.codigoAyuda}
            </ThemedText>
          </ThemedView>
        )}

        <Boton titulo={textos.general.cerrarSesion} onPress={cerrarSesion} secundario />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  columna: {
    alignSelf: 'center',
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  tarjeta: {
    borderRadius: Spacing.three,
  },
  tarjetaInterior: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  codigo: {
    fontSize: 32,
    letterSpacing: 4,
    lineHeight: 40,
  },
});
