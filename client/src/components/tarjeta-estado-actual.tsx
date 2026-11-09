import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EstadoIcono } from '@/components/estado-icono';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { colorDeTexto, visualDe } from '@/lib/estados-visual';
import {
  EstadoTrabajo,
  limitesDelDia,
  listarEstados,
  listarRegistros,
  registrarEstado,
  sembrarEstadosIniciales,
} from '@/lib/go-to-work';
import { vecinosDeEstado } from '@/lib/estados-secuencia';
import { textos } from '@/lib/textos';
import { describirError, type ErrorDescrito } from '@/lib/textos';
import { useVersionTabla } from '@/lib/sincronizacion';
import { Mensaje } from '@/components/formulario';

type Actual = { estado: EstadoTrabajo | null; hora: string | null };

/**
 * Estado actual del día en el dashboard, con botones para pasar al siguiente o al anterior.
 * Se actualiza sola cuando cambia el grupo (también desde el widget o desde otro miembro).
 */
export function TarjetaEstadoActual() {
  const { grupo, usuarioId } = useAuth();
  const grupoId = grupo?.id;
  const versionRegistros = useVersionTabla('registros_trabajo');
  const versionEstados = useVersionTabla('estados_trabajo');

  const [activos, setActivos] = useState<EstadoTrabajo[]>([]);
  const [actual, setActual] = useState<Actual>({ estado: null, hora: null });
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState<'siguiente' | 'anterior' | null>(null);
  const [error, setError] = useState<ErrorDescrito | null>(null);

  const cargar = useCallback(async () => {
    if (!grupoId || !usuarioId) return;
    try {
      // Si es la primera vez, crea mis estados de ejemplo (idempotente).
      await sembrarEstadosIniciales(grupoId, usuarioId, textos.goToWork.estadosIniciales);
      const [todos, registros] = await Promise.all([
        listarEstados(grupoId, usuarioId, true),
        listarRegistros(grupoId, usuarioId, ...rangoHoy()),
      ]);
      const ultimoRegistro = registros[0] ?? null;
      const estadoUltimo = ultimoRegistro ? todos.find((e) => e.id === ultimoRegistro.estado_id) ?? null : null;
      setActivos(todos.filter((e) => e.activo));
      setActual({
        estado: estadoUltimo,
        hora: ultimoRegistro ? new Date(ultimoRegistro.marcado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null,
      });
      setError(null);
    } catch (e) {
      setError(describirError(e));
    } finally {
      setCargando(false);
    }
  }, [grupoId, usuarioId]);

  useEffect(() => {
    cargar();
  }, [cargar, versionRegistros, versionEstados]);

  const { siguiente, anterior } = vecinosDeEstado(activos, actual.estado);

  async function mover(direccion: 'siguiente' | 'anterior') {
    const destino = direccion === 'siguiente' ? siguiente : anterior;
    if (!grupoId || !usuarioId || !destino) return;
    setOcupado(direccion);
    try {
      await registrarEstado(grupoId, usuarioId, destino.id);
      await cargar();
    } catch (e) {
      setError(describirError(e));
    } finally {
      setOcupado(null);
    }
  }

  const visual = actual.estado ? visualDe(actual.estado) : null;
  const colorTexto = visual ? colorDeTexto(visual.color) : undefined;

  return (
    <View style={[styles.tarjeta, { backgroundColor: visual?.color ?? '#2A2D33' }]}>
      {cargando ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <ThemedText type="small" style={[styles.etiqueta, { color: colorTexto ?? '#FFFFFF' }]}>
            {actual.estado ? `Ahora · ${actual.hora}` : 'Sin registros hoy'}
          </ThemedText>
          <View style={styles.fila}>
            {visual && <EstadoIcono clave={visual.icono} color={colorTexto ?? '#FFFFFF'} tamano={34} />}
            <ThemedText style={[styles.nombre, { color: colorTexto ?? '#FFFFFF' }]} numberOfLines={2}>
              {actual.estado?.nombre ?? (siguiente ? siguiente.nombre : 'Sin estados')}
            </ThemedText>
          </View>
          <View style={styles.botones}>
            <Boton
              texto={`‹ ${anterior?.nombre ?? 'Anterior'}`}
              cargando={ocupado === 'anterior'}
              deshabilitado={!anterior || ocupado !== null}
              color={colorTexto ?? '#FFFFFF'}
              onPress={() => mover('anterior')}
            />
            <Boton
              texto={`${siguiente?.nombre ?? 'Siguiente'} ›`}
              cargando={ocupado === 'siguiente'}
              deshabilitado={!siguiente || ocupado !== null}
              color={colorTexto ?? '#FFFFFF'}
              onPress={() => mover('siguiente')}
            />
          </View>
          {error && <Mensaje texto={error.texto} detalle={error.detalle} />}
        </>
      )}
    </View>
  );
}

function rangoHoy(): [Date, Date] {
  const { desde, hasta } = limitesDelDia(new Date());
  return [desde, hasta];
}

function Boton({
  texto,
  onPress,
  cargando,
  deshabilitado,
  color,
}: {
  texto: string;
  onPress: () => void;
  cargando: boolean;
  deshabilitado: boolean;
  color: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        styles.boton,
        { borderColor: color, opacity: deshabilitado ? 0.5 : pressed ? 0.7 : 1 },
      ]}>
      {cargando ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text numberOfLines={1} style={[styles.botonTexto, { color }]}>
          {texto}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderRadius: 20,
    gap: Spacing.two,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  etiqueta: {
    fontWeight: '600',
    opacity: 0.9,
  },
  fila: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  nombre: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
  },
  botones: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  boton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.two,
  },
  botonTexto: {
    fontSize: 14,
    fontWeight: '700',
  },
});
