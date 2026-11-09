import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Boton } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { colorDeTexto } from '@/lib/estados-visual';
import { listarMiembros } from '@/lib/plan';
import { useVersionTabla } from '@/lib/sincronizacion';
import { TarjetaEstadoActual } from '@/components/tarjeta-estado-actual';
import { textos } from '@/lib/textos';

/** Módulos del dashboard (RF-03). Añadir uno nuevo es añadir una entrada aquí y su carpeta en src/app/(app). */
const modulos = [
  { ruta: '/gimnasio', icono: 'barbell' as const, color: '#6BCB77', ...textos.dashboard.modulos.gimnasio },
  { ruta: '/estados', icono: 'briefcase' as const, color: '#4D96FF', ...textos.dashboard.modulos.goToWork },
  { ruta: '/compras', icono: 'cart' as const, color: '#FFB347', ...textos.dashboard.modulos.compras },
] as const;

export default function DashboardScreen() {
  const { grupo, usuarioId, cerrarSesion } = useAuth();
  const grupoId = grupo?.id;
  const versionMiembros = useVersionTabla('miembros_grupo');
  const [miNombre, setMiNombre] = useState<string | null | undefined>(undefined);

  // Mi nombre dentro del grupo (miembros_grupo.nombre), para distinguirme del resto de miembros.
  useEffect(() => {
    if (!grupoId || !usuarioId) return;
    let activo = true;
    listarMiembros(grupoId)
      .then((miembros) => {
        if (!activo) return;
        setMiNombre(miembros.find((m) => m.user_id === usuarioId)?.nombre?.trim() || null);
      })
      .catch(() => {
        if (activo) setMiNombre(null);
      });
    return () => {
      activo = false;
    };
  }, [grupoId, usuarioId, versionMiembros]);

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Stack.Screen options={{ title: textos.dashboard.titulo, headerRight: () => null }} />

      <ThemedView style={styles.columna}>
        <ThemedView style={styles.saludo}>
          <ThemedText type="subtitle">
            {miNombre ? `${textos.inicio.bienvenida}, ${miNombre}` : textos.inicio.bienvenida}
          </ThemedText>
          {grupo && (
            <ThemedText type="small" themeColor="textSecondary">
              {textos.inicio.grupo}: {grupo.nombre}
            </ThemedText>
          )}
          {miNombre === null && (
            <ThemedText type="small" themeColor="textSecondary">
              {textos.inicio.sinNombre}
            </ThemedText>
          )}
        </ThemedView>

        <TarjetaEstadoActual />

        {modulos.map((modulo) => (
          <Pressable
            key={modulo.ruta}
            accessibilityRole="button"
            onPress={() => router.push(modulo.ruta)}
            style={({ pressed }) => [styles.tarjeta, { opacity: pressed ? 0.7 : 1 }]}>
            <ThemedView style={[styles.tarjetaInterior, { backgroundColor: modulo.color }]}>
              <Ionicons name={modulo.icono} size={30} color={colorDeTexto(modulo.color)} />
              <ThemedText type="smallBold" style={{ color: colorDeTexto(modulo.color) }}>
                {modulo.titulo}
              </ThemedText>
              <ThemedText type="small" style={{ color: colorDeTexto(modulo.color), opacity: 0.85 }}>
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

        <Boton
          titulo={textos.dashboard.privacidad}
          onPress={() => router.push('/privacidad')}
          secundario
        />
        <Boton
          titulo={textos.dashboard.widget}
          onPress={() => router.push('/dispositivos')}
          secundario
        />
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
  saludo: {
    gap: Spacing.one,
  },
  tarjeta: {
    borderRadius: Spacing.three,
  },
  tarjetaInterior: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  iconoModulo: {
    fontSize: 30,
  },
  codigo: {
    fontSize: 32,
    letterSpacing: 4,
    lineHeight: 40,
  },
});
