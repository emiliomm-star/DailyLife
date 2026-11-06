import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ChipsOpciones } from '@/components/chips-opciones';
import { Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { EjercicioRutina, listarEjercicios, listarRutinas, Rutina } from '@/lib/gimnasio';
import { DiaPlan, diaSemana, fechaISO, listarMarcas, listarMiembros, listarPlan, marcarEjercicio, Miembro } from '@/lib/plan';
import { useVersionTabla } from '@/lib/sincronizacion';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';

const t = textos.gimnasio;
const COLOR = '#4D96FF';

const nombreDe = (m: Miembro) => m.nombre?.trim() || t.sinNombre;

/** Vista del día: la rutina que toca hoy a la persona elegida, con casillas por ejercicio. */
export function GimnasioHoy() {
  const { grupo, usuarioId } = useAuth();
  const grupoId = grupo?.id;
  const vPlan = useVersionTabla('plan_semanal');
  const vMarcas = useVersionTabla('sesion_ejercicios');
  const vEjercicios = useVersionTabla('ejercicios_rutina');
  const vRutinas = useVersionTabla('rutinas');
  const vMiembros = useVersionTabla('miembros_grupo');

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [plan, setPlan] = useState<DiaPlan[]>([]);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [ejercicios, setEjercicios] = useState<EjercicioRutina[]>([]);
  const [marcas, setMarcas] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDescrito | null>(null);

  const hoy = useMemo(() => new Date(), []);
  const dia = diaSemana(hoy);
  const fecha = fechaISO(hoy);
  const persona = seleccion ?? usuarioId;
  const esMio = persona !== null && persona === usuarioId;

  const cargarBase = useCallback(async () => {
    if (!grupoId) return;
    try {
      const [m, p, r] = await Promise.all([
        listarMiembros(grupoId),
        listarPlan(grupoId),
        listarRutinas(grupoId, { clasificacion: 'todas', estado: 'todas' }),
      ]);
      setMiembros(m);
      setPlan(p);
      setRutinas(r);
      setError(null);
    } catch (e) {
      setError(describirError(e));
    } finally {
      setCargando(false);
    }
  }, [grupoId]);

  useEffect(() => {
    cargarBase();
  }, [cargarBase, vPlan, vRutinas, vMiembros]);

  useEffect(() => {
    if (!seleccion && usuarioId) setSeleccion(usuarioId);
  }, [seleccion, usuarioId]);

  const rutinaId = persona ? plan.find((p) => p.user_id === persona && p.dia === dia)?.rutina_id ?? null : null;
  const rutina = rutinaId ? rutinas.find((r) => r.id === rutinaId) ?? null : null;

  // Ejercicios de la rutina de hoy y marcas de la persona elegida.
  useEffect(() => {
    if (!grupoId || !persona) return;
    let activo = true;
    if (!rutinaId) {
      setEjercicios([]);
      setMarcas(new Set());
      return;
    }
    Promise.all([listarEjercicios(rutinaId), listarMarcas(grupoId, persona, fecha)])
      .then(([lista, marcadas]) => {
        if (!activo) return;
        setEjercicios(lista);
        setMarcas(marcadas);
      })
      .catch((e) => activo && setError(describirError(e)));
    return () => {
      activo = false;
    };
  }, [grupoId, persona, rutinaId, fecha, vMarcas, vEjercicios]);

  async function alternar(ejercicio: EjercicioRutina) {
    if (!grupoId || !usuarioId || !esMio) return;
    const hecho = !marcas.has(ejercicio.id);
    setError(null);
    setOcupadoId(ejercicio.id);
    setMarcas((actuales) => {
      const siguiente = new Set(actuales);
      if (hecho) siguiente.add(ejercicio.id);
      else siguiente.delete(ejercicio.id);
      return siguiente;
    });
    try {
      await marcarEjercicio(grupoId, usuarioId, fecha, ejercicio.id, hecho);
    } catch (e) {
      setError(describirError(e));
      // Revierte la marca si la base no la aceptó.
      setMarcas((actuales) => {
        const siguiente = new Set(actuales);
        if (hecho) siguiente.delete(ejercicio.id);
        else siguiente.add(ejercicio.id);
        return siguiente;
      });
    } finally {
      setOcupadoId(null);
    }
  }

  if (cargando) return <ActivityIndicator style={styles.espacio} />;

  const opcionesPersonas = miembros.map((m) => ({
    clave: m.user_id,
    etiqueta: m.user_id === usuarioId ? `${nombreDe(m)} (tú)` : nombreDe(m),
  }));
  const hechos = ejercicios.filter((e) => marcas.has(e.id)).length;
  const porcentaje = ejercicios.length ? Math.round((hechos / ejercicios.length) * 100) : 0;
  const fechaBruta = hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const fechaTexto = `${fechaBruta.charAt(0).toUpperCase()}${fechaBruta.slice(1)}`;

  return (
    <View style={styles.columna}>
      {opcionesPersonas.length > 1 && (
        <>
          <ThemedText type="small" themeColor="textSecondary">{t.quienEres}</ThemedText>
          <ChipsOpciones opciones={opcionesPersonas} valor={persona ?? ''} onCambiar={setSeleccion} colorActivo={COLOR} />
        </>
      )}

      <ThemedText type="smallBold" style={styles.fecha}>
        {fechaTexto}
      </ThemedText>

      {!rutinaId || !rutina ? (
        <ThemedView type="backgroundElement" style={styles.tarjeta}>
          <Ionicons name="moon-outline" size={28} color={COLOR} />
          <ThemedText type="smallBold">{t.descanso}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{t.hoyDescanso}</ThemedText>
        </ThemedView>
      ) : (
        <>
          <ThemedView type="backgroundElement" style={styles.tarjeta}>
            <ThemedText type="subtitle">{rutina.nombre}</ThemedText>
            <View style={styles.barraFondo}>
              <View style={[styles.barra, { width: `${porcentaje}%` }]} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">{t.progreso(hechos, ejercicios.length)}</ThemedText>
            {!esMio && <ThemedText type="small" themeColor="textSecondary">{t.soloLectura}</ThemedText>}
          </ThemedView>

          {ejercicios.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">{t.hoyRutinaVacia}</ThemedText>
          ) : (
            ejercicios.map((ejercicio) => {
              const marcado = marcas.has(ejercicio.id);
              const detalle = [
                ejercicio.series != null && ejercicio.repeticiones
                  ? `${ejercicio.series} × ${ejercicio.repeticiones}`
                  : ejercicio.series != null
                    ? `${ejercicio.series} series`
                    : ejercicio.repeticiones,
                ejercicio.peso_kg != null ? `${String(ejercicio.peso_kg).replace('.', ',')} kg` : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <Pressable
                  key={ejercicio.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: marcado, disabled: !esMio || ocupadoId !== null }}
                  accessibilityLabel={ejercicio.nombre}
                  disabled={!esMio || ocupadoId !== null}
                  onPress={() => alternar(ejercicio)}
                  style={({ pressed }) => [styles.fila, { opacity: pressed ? 0.8 : 1 }]}>
                  <ThemedView type="backgroundElement" style={styles.filaInterior}>
                    <View style={[styles.check, marcado ? { backgroundColor: COLOR, borderColor: COLOR } : { borderColor: COLOR }]}>
                      {ocupadoId === ejercicio.id ? (
                        <ActivityIndicator size="small" color={marcado ? '#FFFFFF' : COLOR} />
                      ) : marcado ? (
                        <ThemedText style={styles.checkTexto}>✓</ThemedText>
                      ) : null}
                    </View>
                    <View style={styles.textos}>
                      <ThemedText style={marcado ? styles.nombreHecho : styles.nombre}>{ejercicio.nombre}</ThemedText>
                      {detalle !== '' && <ThemedText type="small" themeColor="textSecondary">{detalle}</ThemedText>}
                    </View>
                  </ThemedView>
                </Pressable>
              );
            })
          )}
        </>
      )}

      {error && <Mensaje texto={error.texto} detalle={error.detalle} />}
    </View>
  );
}

const styles = StyleSheet.create({
  columna: {
    gap: Spacing.three,
  },
  espacio: {
    marginTop: Spacing.four,
  },
  fecha: {
    fontSize: 15,
  },
  tarjeta: {
    borderRadius: 18,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  barraFondo: {
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden',
  },
  barra: {
    backgroundColor: COLOR,
    borderRadius: 999,
    height: '100%',
  },
  fila: {
    borderRadius: 14,
  },
  filaInterior: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  check: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  checkTexto: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  textos: {
    flex: 1,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '600',
  },
  nombreHecho: {
    fontSize: 16,
    opacity: 0.6,
    textDecorationLine: 'line-through',
  },
});
