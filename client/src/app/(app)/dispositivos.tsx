import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Boton, Campo, Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';

const t = textos.dispositivos;

/** Crea un código de dispositivo para el widget. El código se muestra una sola vez. */
export default function DispositivosScreen() {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<ErrorDescrito | null>(null);

  async function crear() {
    setError(null);
    setCargando(true);
    try {
      const { data, error: errorRpc } = await supabase.rpc('crear_token_dispositivo', {
        p_nombre: nombre.trim() || 'Dispositivo',
      });
      if (errorRpc) {
        setError(describirError(errorRpc));
      } else {
        setCodigo(data as string);
        setNombre('');
      }
    } catch (e) {
      setError(describirError(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t.titulo }} />
      <ThemedView style={styles.columna}>
        <ThemedText type="small" themeColor="textSecondary">
          {t.descripcion}
        </ThemedText>

        <Campo etiqueta={t.nombre} value={nombre} onChangeText={setNombre} />
        <Boton titulo={t.crear} onPress={crear} cargando={cargando} />

        {codigo && (
          <ThemedView type="backgroundElement" style={styles.tarjeta}>
            <ThemedText type="smallBold">{t.codigoTitulo}</ThemedText>
            <ThemedText selectable style={styles.codigo}>
              {codigo}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t.aviso}
            </ThemedText>
          </ThemedView>
        )}

        {error && <Mensaje texto={error.texto} detalle={error.detalle} />}
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
    gap: Spacing.two,
    padding: Spacing.three,
  },
  codigo: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
});
