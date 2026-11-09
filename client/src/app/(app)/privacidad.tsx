import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Boton, Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import {
  claveOcultamiento,
  fijarVisibilidad,
  listarOcultos,
  MODULOS,
  type Modulo,
} from '@/lib/privacidad';
import { listarMiembros, type Miembro } from '@/lib/plan';
import {
  activarAvisos,
  avisosActivados,
  avisosSoportados,
  desactivarAvisos,
  PermisoDenegado,
} from '@/lib/notificaciones';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';
import { useVersionTabla } from '@/lib/sincronizacion';

const t = textos.privacidad;

/**
 * Qué ve cada persona de mis datos. Por defecto todo es visible; un interruptor apagado
 * oculta ese módulo a esa persona. Solo se cambian mis datos (lo impone la base de datos).
 */
export default function PrivacidadScreen() {
  const { grupo, usuarioId } = useAuth();
  const grupoId = grupo?.id;

  const [otros, setOtros] = useState<Miembro[] | null>(null);
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDescrito | null>(null);
  const [avisos, setAvisos] = useState<'cargando' | 'si' | 'no' | 'no-soportado'>('cargando');
  const [cambiandoAvisos, setCambiandoAvisos] = useState(false);

  useEffect(() => {
    if (!avisosSoportados()) {
      setAvisos('no-soportado');
      return;
    }
    avisosActivados()
      .then((activos) => setAvisos(activos ? 'si' : 'no'))
      .catch(() => setAvisos('no'));
  }, []);

  async function cambiarAvisos() {
    if (!grupoId || !usuarioId) return;
    setCambiandoAvisos(true);
    setError(null);
    try {
      if (avisos === 'si') {
        await desactivarAvisos();
        setAvisos('no');
      } else {
        await activarAvisos(grupoId, usuarioId);
        setAvisos('si');
      }
    } catch (e) {
      const texto = e instanceof PermisoDenegado ? t.avisos.permisoDenegado : t.avisos.error;
      setError({ texto, detalle: describirError(e).detalle });
    } finally {
      setCambiandoAvisos(false);
    }
  }

  const cargar = useCallback(async () => {
    if (!grupoId || !usuarioId) return;
    try {
      const [miembros, claves] = await Promise.all([listarMiembros(grupoId), listarOcultos(grupoId, usuarioId)]);
      setOtros(miembros.filter((m) => m.user_id !== usuarioId));
      setOcultos(claves);
      setError(null);
    } catch (e) {
      setError(describirError(e));
    }
  }, [grupoId, usuarioId]);

  const versionMiembros = useVersionTabla('miembros_grupo');
  useEffect(() => {
    cargar();
  }, [cargar, versionMiembros]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function cambiar(viewerId: string, modulo: Modulo, visible: boolean) {
    if (!grupoId || !usuarioId) return;
    const clave = claveOcultamiento(viewerId, modulo);
    setGuardando(clave);
    setError(null);
    try {
      await fijarVisibilidad(grupoId, usuarioId, viewerId, modulo, visible);
      setOcultos((anterior) => {
        const siguiente = new Set(anterior);
        if (visible) siguiente.delete(clave);
        else siguiente.add(clave);
        return siguiente;
      });
    } catch (e) {
      setError({ texto: t.error, detalle: describirError(e).detalle });
    } finally {
      setGuardando(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Stack.Screen options={{ title: t.titulo }} />

      <ThemedView style={styles.columna}>
        <ThemedText type="small" themeColor="textSecondary">
          {t.descripcion}
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.tarjeta}>
          <ThemedText type="smallBold">{t.avisos.titulo}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.avisos.descripcion}
          </ThemedText>
          {avisos === 'cargando' ? (
            <ActivityIndicator />
          ) : avisos === 'no-soportado' ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t.avisos.noSoportado}
            </ThemedText>
          ) : (
            <Boton
              titulo={avisos === 'si' ? t.avisos.desactivar : t.avisos.activar}
              onPress={cambiarAvisos}
              cargando={cambiandoAvisos}
              secundario={avisos === 'si'}
            />
          )}
        </ThemedView>

        {otros === null ? (
          <ActivityIndicator style={styles.espacio} />
        ) : otros.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t.sinOtros}
          </ThemedText>
        ) : (
          otros.map((miembro) => (
            <ThemedView key={miembro.user_id} type="backgroundElement" style={styles.tarjeta}>
              <ThemedText type="smallBold">{miembro.nombre?.trim() || textos.goToWork.sinNombre}</ThemedText>
              {MODULOS.map((modulo) => {
                const clave = claveOcultamiento(miembro.user_id, modulo);
                const visible = !ocultos.has(clave);
                return (
                  <View key={modulo} style={styles.fila}>
                    <ThemedText type="small" style={styles.flexible}>
                      {t.modulos[modulo]}
                    </ThemedText>
                    <Switch
                      accessibilityLabel={`${t.modulos[modulo]} visible para ${miembro.nombre ?? ''}`}
                      value={visible}
                      disabled={guardando === clave}
                      onValueChange={(valor) => cambiar(miembro.user_id, modulo, valor)}
                      trackColor={{ false: '#B8BCC4', true: '#4D96FF' }}
                    />
                  </View>
                );
              })}
            </ThemedView>
          ))
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
  espacio: {
    marginVertical: Spacing.three,
  },
  tarjeta: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  fila: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flexible: {
    flex: 1,
  },
});
