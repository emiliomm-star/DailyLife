import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Boton, Campo, Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import {
  crearEstado,
  EstadoTrabajo,
  listarEstados,
  quitarEstado,
  renombrarEstado,
} from '@/lib/go-to-work';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';

const t = textos.goToWork.estados;

export default function EstadosScreen() {
  const { grupo } = useAuth();
  const grupoId = grupo?.id;

  const [estados, setEstados] = useState<EstadoTrabajo[]>([]);
  const [nuevo, setNuevo] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicion, setTextoEdicion] = useState('');
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDescrito | null>(null);

  const cargar = useCallback(async () => {
    if (!grupoId) return;
    try {
      setEstados(await listarEstados(grupoId));
    } catch (e) {
      setError(describirError(e));
    }
  }, [grupoId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  /** Ejecuta una operación de escritura con el estado de "ocupado" y recarga la lista al terminar. */
  async function operar(accion: () => Promise<void>) {
    setError(null);
    setOcupado(true);
    try {
      await accion();
      await cargar();
    } catch (e) {
      setError(describirError(e));
    } finally {
      setOcupado(false);
    }
  }

  function anadir() {
    if (!grupoId) return;
    const nombre = nuevo.trim();
    if (!nombre) {
      setError({ texto: t.nombreVacio, detalle: 'Nombre vacío' });
      return;
    }
    const orden = Math.max(0, ...estados.map((estado) => estado.orden)) + 1;
    operar(async () => {
      await crearEstado(grupoId, nombre, orden);
      setNuevo('');
    });
  }

  function guardarEdicion(estado: EstadoTrabajo) {
    const nombre = textoEdicion.trim();
    if (!nombre) {
      setError({ texto: t.nombreVacio, detalle: 'Nombre vacío' });
      return;
    }
    operar(async () => {
      await renombrarEstado(estado.id, nombre);
      setEditandoId(null);
    });
  }

  function quitar(estado: EstadoTrabajo) {
    if (confirmandoId !== estado.id) {
      setConfirmandoId(estado.id);
      return;
    }
    setConfirmandoId(null);
    operar(() => quitarEstado(estado.id));
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t.titulo }} />

      <ThemedView style={styles.columna}>
        {estados.map((estado) => (
          <ThemedView key={estado.id} type="backgroundElement" style={styles.fila}>
            {editandoId === estado.id ? (
              <ThemedView style={styles.flexible}>
                <Campo
                  etiqueta={t.nuevo}
                  value={textoEdicion}
                  onChangeText={setTextoEdicion}
                  onSubmitEditing={() => guardarEdicion(estado)}
                  autoFocus
                />
                <ThemedView style={styles.acciones}>
                  <Pressable accessibilityRole="button" onPress={() => guardarEdicion(estado)} disabled={ocupado}>
                    <ThemedText type="smallBold">{t.guardar}</ThemedText>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => setEditandoId(null)}>
                    <ThemedText type="small" themeColor="textSecondary">{t.cancelar}</ThemedText>
                  </Pressable>
                </ThemedView>
              </ThemedView>
            ) : (
              <>
                <ThemedText type="smallBold" style={styles.flexible}>
                  {estado.nombre}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setEditandoId(estado.id);
                    setTextoEdicion(estado.nombre);
                  }}
                  hitSlop={8}>
                  <ThemedText type="small">{t.editar}</ThemedText>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => quitar(estado)} hitSlop={8} disabled={ocupado}>
                  <ThemedText type="small" style={styles.peligro}>
                    {confirmandoId === estado.id ? t.confirmarQuitar : t.quitar}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </ThemedView>
        ))}

        <ThemedText type="small" themeColor="textSecondary">
          {t.quitarAviso}
        </ThemedText>

        <Campo
          etiqueta={t.nuevo}
          value={nuevo}
          onChangeText={setNuevo}
          onSubmitEditing={anadir}
          returnKeyType="done"
        />
        <Boton titulo={t.anadir} onPress={anadir} cargando={ocupado} />

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
  fila: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 48,
    padding: Spacing.three,
  },
  flexible: {
    flex: 1,
    gap: Spacing.two,
  },
  acciones: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  peligro: {
    color: '#D32F2F',
  },
});
