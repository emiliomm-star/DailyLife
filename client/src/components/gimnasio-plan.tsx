import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ChipsOpciones } from '@/components/chips-opciones';
import { Boton, Campo, Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { listarRutinas, Rutina } from '@/lib/gimnasio';
import { DiaPlan, fijarDiaPlan, guardarMiNombre, listarMiembros, listarPlan, Miembro } from '@/lib/plan';
import { useVersionTabla } from '@/lib/sincronizacion';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';

const t = textos.gimnasio;
const COLOR = '#4D96FF';
const DESCANSO = 'descanso';

/** Plan semanal: qué rutina hace cada persona cada día. Solo se edita el propio. */
export function GimnasioPlan() {
  const { grupo, usuarioId } = useAuth();
  const grupoId = grupo?.id;
  const vPlan = useVersionTabla('plan_semanal');
  const vRutinas = useVersionTabla('rutinas');
  const vMiembros = useVersionTabla('miembros_grupo');

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [plan, setPlan] = useState<DiaPlan[]>([]);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [diaAbierto, setDiaAbierto] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<ErrorDescrito | null>(null);

  const cargar = useCallback(async () => {
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
    cargar();
  }, [cargar, vPlan, vRutinas, vMiembros]);

  // Miembros ordenados: primero yo, luego los demás.
  const ordenados = useMemo(
    () => [...miembros].sort((a, b) => (a.user_id === usuarioId ? -1 : b.user_id === usuarioId ? 1 : 0)),
    [miembros, usuarioId],
  );

  const miNombre = miembros.find((m) => m.user_id === usuarioId)?.nombre ?? '';
  useEffect(() => {
    setNombre(miNombre);
  }, [miNombre]);

  async function guardarNombre() {
    if (!grupoId || !usuarioId) return;
    setGuardando(true);
    try {
      await guardarMiNombre(grupoId, usuarioId, nombre);
      await cargar();
    } catch (e) {
      setError(describirError(e));
    } finally {
      setGuardando(false);
    }
  }

  async function elegir(dia: number, valor: string) {
    if (!grupoId || !usuarioId) return;
    setDiaAbierto(null);
    setError(null);
    try {
      await fijarDiaPlan(grupoId, usuarioId, dia, valor === DESCANSO ? null : valor);
      await cargar();
    } catch (e) {
      setError(describirError(e));
    }
  }

  if (cargando) return <ActivityIndicator style={styles.espacio} />;

  const opcionesRutina = [
    ...rutinas.map((r) => ({ clave: r.id, etiqueta: r.nombre })),
    { clave: DESCANSO, etiqueta: t.descanso },
  ];

  return (
    <View style={styles.columna}>
      <ThemedView type="backgroundElement" style={styles.tarjeta}>
        <Campo etiqueta={t.tuNombre} value={nombre} onChangeText={setNombre} onSubmitEditing={guardarNombre} />
        <Boton titulo={t.guardarNombre} onPress={guardarNombre} cargando={guardando} secundario />
      </ThemedView>

      {ordenados.length === 0 && <ThemedText type="small" themeColor="textSecondary">{t.sinMiembros}</ThemedText>}

      {ordenados.map((miembro) => {
        const esMio = miembro.user_id === usuarioId;
        return (
          <ThemedView key={miembro.user_id} type="backgroundElement" style={styles.tarjeta}>
            <ThemedText type="smallBold">
              {esMio ? t.planDe(`${miembro.nombre?.trim() || t.sinNombre} (tú)`) : t.planDe(miembro.nombre?.trim() || t.sinNombre)}
            </ThemedText>

            {t.dias.map((nombreDia, dia) => {
              const entrada = plan.find((p) => p.user_id === miembro.user_id && p.dia === dia);
              const rutina = entrada ? rutinas.find((r) => r.id === entrada.rutina_id) : undefined;
              const abierto = esMio && diaAbierto === dia;
              return (
                <View key={dia} style={styles.dia}>
                  <Pressable
                    accessibilityRole={esMio ? 'button' : 'text'}
                    disabled={!esMio}
                    onPress={() => setDiaAbierto(abierto ? null : dia)}
                    style={styles.diaFila}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.diaNombre}>{nombreDia}</ThemedText>
                    <ThemedText type="small" style={rutina ? undefined : styles.descanso}>
                      {rutina ? rutina.nombre : t.descanso}
                    </ThemedText>
                  </Pressable>
                  {abierto && (
                    <ChipsOpciones
                      opciones={opcionesRutina}
                      valor={entrada?.rutina_id ?? DESCANSO}
                      onCambiar={(valor) => elegir(dia, valor)}
                      colorActivo={COLOR}
                    />
                  )}
                </View>
              );
            })}
          </ThemedView>
        );
      })}

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
  tarjeta: {
    borderRadius: 18,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  dia: {
    gap: Spacing.two,
  },
  diaFila: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 36,
  },
  diaNombre: {
    width: 84,
  },
  descanso: {
    opacity: 0.55,
    fontStyle: 'italic',
  },
});
