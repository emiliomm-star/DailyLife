import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Boton, Mensaje } from '@/components/formulario';
import { ChipsOpciones } from '@/components/chips-opciones';
import { EstadosDePersona } from '@/components/estados-de-persona';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { listarMiembros, type Miembro } from '@/lib/plan';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';
import { useVersionTabla } from '@/lib/sincronizacion';

const t = textos.goToWork;

/**
 * Estados del grupo: una pestaña por persona. La mía se puede editar y marcar;
 * las de los demás se ven solo si la persona las comparte contigo.
 */
export default function EstadosScreen() {
  const { grupo, usuarioId } = useAuth();
  const grupoId = grupo?.id;

  const [miembros, setMiembros] = useState<Miembro[] | null>(null);
  const [pestana, setPestana] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDescrito | null>(null);

  const cargarMiembros = useCallback(async () => {
    if (!grupoId) return;
    try {
      setMiembros(await listarMiembros(grupoId));
      setError(null);
    } catch (e) {
      setError(describirError(e));
    }
  }, [grupoId]);

  const versionMiembros = useVersionTabla('miembros_grupo');
  useEffect(() => {
    cargarMiembros();
  }, [cargarMiembros, versionMiembros]);

  // Al volver de "Privacidad" o de "Gestionar", se recarga por si cambió algo.
  useFocusEffect(
    useCallback(() => {
      cargarMiembros();
    }, [cargarMiembros]),
  );

  // Mi pestaña siempre primero; el resto, en el orden en que se unieron al grupo.
  const ordenados = miembros
    ? [...miembros].sort((a, b) => Number(b.user_id === usuarioId) - Number(a.user_id === usuarioId))
    : [];
  const opciones = ordenados.map((m) => ({
    clave: m.user_id,
    etiqueta: m.user_id === usuarioId ? t.yo : m.nombre?.trim() || t.sinNombre,
  }));
  const seleccionada = pestana && opciones.some((o) => o.clave === pestana) ? pestana : usuarioId;

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Stack.Screen options={{ title: t.titulo }} />
      <View style={styles.columna}>
        {miembros === null ? (
          <ActivityIndicator style={styles.espacio} />
        ) : (
          <>
            {opciones.length > 1 && (
              <ChipsOpciones opciones={opciones} valor={seleccionada ?? ''} onCambiar={setPestana} colorActivo="#4D96FF" />
            )}

            {seleccionada && (
              <EstadosDePersona
                key={seleccionada}
                duenoId={seleccionada}
                propio={seleccionada === usuarioId}
              />
            )}

            {seleccionada && seleccionada !== usuarioId && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
                {t.soloLectura}
              </ThemedText>
            )}
          </>
        )}

        {error && <Mensaje texto={error.texto} detalle={error.detalle} />}

        {seleccionada === usuarioId && (
          <Boton titulo={t.gestionarEstados} onPress={() => router.push('/estados/gestion')} secundario />
        )}
        <Boton titulo={textos.dashboard.privacidad} onPress={() => router.push('/privacidad')} secundario />
      </View>
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
  centrado: {
    textAlign: 'center',
  },
  espacio: {
    marginVertical: Spacing.three,
  },
});
