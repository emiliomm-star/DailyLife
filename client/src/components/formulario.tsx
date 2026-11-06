import type { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { colorDeTexto } from '@/lib/estados-visual';

type CampoProps = TextInputProps & {
  etiqueta: string;
};

export function Campo({ etiqueta, style, ...resto }: CampoProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.campo}>
      <ThemedText type="small" themeColor="textSecondary">
        {etiqueta}
      </ThemedText>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { backgroundColor: theme.backgroundElement, color: theme.text },
          style,
        ]}
        {...resto}
      />
    </ThemedView>
  );
}

type BotonProps = {
  titulo: string;
  onPress: () => void;
  cargando?: boolean;
  secundario?: boolean;
  /** Color de fondo propio (p. ej. el de un módulo). El texto se elige para que se lea bien sobre él. */
  colorFondo?: string;
};

export function Boton({ titulo, onPress, cargando = false, secundario = false, colorFondo }: BotonProps) {
  const theme = useTheme();
  const fondo = colorFondo ?? (secundario ? theme.backgroundElement : theme.text);
  const color = colorFondo
    ? colorDeTexto(colorFondo)
    : secundario
      ? theme.text
      : theme.background;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={cargando}
      onPress={onPress}
      style={({ pressed }) => [
        styles.boton,
        { backgroundColor: fondo, opacity: pressed || cargando ? 0.7 : 1 },
      ]}>
      {cargando ? (
        <ActivityIndicator color={color} />
      ) : (
        <ThemedText type="smallBold" style={{ color }}>
          {titulo}
        </ThemedText>
      )}
    </Pressable>
  );
}

/** Contenedor de pantallas de formulario: centrado, con ancho máximo y margen lateral de 16px. */
export function Pantalla({ children }: PropsWithChildren) {
  return (
    <ThemedView style={styles.pantalla}>
      <SafeAreaView style={styles.pantallaInterior} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.columna}>{children}</ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Aviso de error: el texto para el usuario y, debajo, el detalle técnico (seleccionable para copiarlo). */
export function Mensaje({ texto, detalle }: { texto: string; detalle?: string }) {
  return (
    <ThemedView style={styles.mensajeContenedor} role="alert">
      <ThemedText type="smallBold" style={styles.mensaje}>
        {texto}
      </ThemedText>
      {detalle && (
        <ThemedText type="small" themeColor="textSecondary" selectable style={styles.detalle}>
          {detalle}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
  },
  pantallaInterior: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  columna: {
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  campo: {
    gap: Spacing.one,
    width: '100%',
  },
  input: {
    borderRadius: Spacing.two,
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    width: '100%',
  },
  boton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    width: '100%',
  },
  mensajeContenedor: {
    borderRadius: Spacing.two,
    gap: Spacing.one,
    padding: Spacing.three,
    width: '100%',
  },
  mensaje: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  detalle: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
