import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { textos } from '@/lib/textos';

/**
 * Pantalla de inicio provisional: muestra el grupo y permite cerrar sesión.
 * El dashboard con los módulos (Gimnasio, Go To Work, Compras) llega en el paso 6.
 */
export default function InicioScreen() {
  const { grupo, cerrarSesion } = useAuth();

  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.interior} edges={['top']}>
        <ThemedView style={styles.columna}>
          <ThemedText type="subtitle">
            {textos.inicio.bienvenida}
            {grupo ? `, ${grupo.nombre}` : ''}
          </ThemedText>

          {grupo && (
            <ThemedView type="backgroundElement" style={styles.tarjeta}>
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
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  interior: {
    flex: 1,
  },
  columna: {
    alignSelf: 'center',
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset,
    paddingHorizontal: Spacing.three,
    // En web, la barra de pestañas va arriba y tapa el contenido: se deja hueco para ella.
    paddingTop: Platform.OS === 'web' ? Spacing.six + Spacing.two : Spacing.four,
    width: '100%',
  },
  tarjeta: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  codigo: {
    fontSize: 32,
    letterSpacing: 4,
    lineHeight: 40,
  },
});
