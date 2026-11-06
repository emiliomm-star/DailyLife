import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Boton, Campo, Mensaje } from '@/components/formulario';
import { ChipsOpciones } from '@/components/chips-opciones';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { colorDeTexto } from '@/lib/estados-visual';
import {
  Clasificacion,
  crearRutina,
  EstadoRutina,
  FiltrosRutinas,
  ICONO_CAMPO,
  ICONO_CLASIFICACION,
  ICONO_ESTADO,
  listarRutinas,
  Rutina,
} from '@/lib/gimnasio';
import { useVersionTabla } from '@/lib/sincronizacion';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';

const t = textos.gimnasio;

const COLOR_CLASIFICACION: Record<Clasificacion, string> = {
  masculina: '#4D96FF',
  femenina: '#FF8FC7',
};

const OPCIONES_CLASIFICACION = [
  { clave: 'masculina' as const, etiqueta: t.masculina, icono: ICONO_CLASIFICACION.masculina },
  { clave: 'femenina' as const, etiqueta: t.femenina, icono: ICONO_CLASIFICACION.femenina },
];
const OPCIONES_ESTADO = [
  { clave: 'borrador' as const, etiqueta: t.borrador, icono: ICONO_ESTADO.borrador },
  { clave: 'activa' as const, etiqueta: t.activa, icono: ICONO_ESTADO.activa },
  { clave: 'archivada' as const, etiqueta: t.archivada, icono: ICONO_ESTADO.archivada },
];

/** Biblioteca de rutinas: lista con filtros por clasificación y estado, y alta de rutinas. */
export function BibliotecaRutinas() {
  const { grupo } = useAuth();
  const grupoId = grupo?.id;
  const versionRutinas = useVersionTabla('rutinas');

  const [filtros, setFiltros] = useState<FiltrosRutinas>({ clasificacion: 'todas', estado: 'todas' });
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<ErrorDescrito | null>(null);

  const [nombreNueva, setNombreNueva] = useState('');
  const [clasificacionNueva, setClasificacionNueva] = useState<Clasificacion>('masculina');
  const [estadoNuevo, setEstadoNuevo] = useState<EstadoRutina>('borrador');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!grupoId) return;
    try {
      setRutinas(await listarRutinas(grupoId, filtros));
      setError(null);
    } catch (e) {
      setError(describirError(e));
    } finally {
      setCargando(false);
    }
  }, [grupoId, filtros]);

  useEffect(() => {
    cargar();
  }, [cargar, versionRutinas]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function nuevaRutina() {
    if (!grupoId) return;
    if (!nombreNueva.trim()) {
      setError({ texto: t.nombreVacio, detalle: 'Nombre vacío' });
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await crearRutina(grupoId, { nombre: nombreNueva, clasificacion: clasificacionNueva, estado: estadoNuevo });
      setNombreNueva('');
      await cargar();
    } catch (e) {
      setError(describirError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <View style={styles.columna}>
        <ChipsOpciones
          opciones={[{ clave: 'todas' as const, etiqueta: t.todas, icono: 'apps' as const }, ...OPCIONES_CLASIFICACION]}
          valor={filtros.clasificacion}
          onCambiar={(clasificacion) => setFiltros((f) => ({ ...f, clasificacion }))}
        />
        <ChipsOpciones
          opciones={[
            { clave: 'todas' as const, etiqueta: t.todas, icono: 'apps' as const },
            ...OPCIONES_ESTADO,
          ]}
          valor={filtros.estado}
          onCambiar={(estado) => setFiltros((f) => ({ ...f, estado }))}
        />

        {cargando ? (
          <ActivityIndicator style={styles.espacio} />
        ) : rutinas.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">{t.vacio}</ThemedText>
        ) : (
          rutinas.map((rutina, indice) => {
            const color = COLOR_CLASIFICACION[rutina.clasificacion];
            const textoColor = colorDeTexto(color);
            return (
              <Animated.View
                key={rutina.id}
                entering={FadeInDown.delay(Math.min(indice, 10) * 40).duration(240)}
                layout={LinearTransition}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={rutina.nombre}
                  onPress={() => router.push({ pathname: '/gimnasio/[rutina]', params: { rutina: rutina.id } })}
                  style={({ pressed }) => [styles.tarjeta, { backgroundColor: color, opacity: pressed ? 0.85 : 1 }]}>
                  <ThemedText style={[styles.nombre, { color: textoColor }]}>{rutina.nombre}</ThemedText>
                  <View style={styles.subtituloFila}>
                    <Ionicons name={ICONO_CLASIFICACION[rutina.clasificacion]} size={14} color={textoColor} />
                    <ThemedText style={[styles.subtitulo, { color: textoColor }]}>
                      {`${t[rutina.clasificacion]}`}
                    </ThemedText>
                    <Ionicons name={ICONO_ESTADO[rutina.estado]} size={14} color={textoColor} />
                    <ThemedText style={[styles.subtitulo, { color: textoColor }]}>{t[rutina.estado]}</ThemedText>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })
        )}

        <ThemedText type="smallBold" style={styles.cabecera}>{t.nuevaRutina}</ThemedText>
        <Campo etiqueta={t.nombre} icono={ICONO_CAMPO.rutina} value={nombreNueva} onChangeText={setNombreNueva} returnKeyType="done" />
        <ThemedText type="small" themeColor="textSecondary">{t.clasificacion}</ThemedText>
        <ChipsOpciones opciones={OPCIONES_CLASIFICACION} valor={clasificacionNueva} onCambiar={setClasificacionNueva} />
        <ThemedText type="small" themeColor="textSecondary">{t.estado}</ThemedText>
        <ChipsOpciones opciones={OPCIONES_ESTADO} valor={estadoNuevo} onCambiar={setEstadoNuevo} />
        <Boton
          titulo={t.crear}
          onPress={nuevaRutina}
          cargando={guardando}
          colorFondo={COLOR_CLASIFICACION[clasificacionNueva]}
        />

        {error && <Mensaje texto={error.texto} detalle={error.detalle} />}
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
  espacio: {
    marginTop: Spacing.three,
  },
  cabecera: {
    marginTop: Spacing.four,
  },
  tarjeta: {
    borderRadius: 18,
    gap: 4,
    padding: Spacing.three,
  },
  nombre: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtituloFila: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  subtitulo: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },
});
