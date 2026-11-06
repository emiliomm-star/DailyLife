import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Boton, Campo, Mensaje } from '@/components/formulario';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { Categoria, listarCategorias, parsearPrecio } from '@/lib/compras';
import { colorDeTexto, visualDe } from '@/lib/estados-visual';
import {
  ahorroPorMes,
  cargarGastos,
  cargarIngresos,
  claveMes,
  desplazarMes,
  gastoPorCategoria,
  GastoFila,
  guardarIngreso,
  Mes,
  mesActual,
  totalDe,
} from '@/lib/resumen-compras';
import { useVersionTabla } from '@/lib/sincronizacion';
import { describirError, type ErrorDescrito, textos } from '@/lib/textos';

const t = textos.resumen;
const MESES_HISTORIAL = 6;

const euros = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const nombreMes = (m: Mes) => {
  const nombre = new Date(m.anio, m.mes, 1).toLocaleDateString('es-ES', { month: 'long' });
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${m.anio}`;
};
const mesCorto = (m: Mes) => new Date(m.anio, m.mes, 1).toLocaleDateString('es-ES', { month: 'short' });

/** Resumen del mes: gasto por categoría, comparativa con el mes anterior y ahorro de los últimos meses. */
export default function ResumenScreen() {
  const { grupo } = useAuth();
  const grupoId = grupo?.id;
  const versionGastos = useVersionTabla('gastos');
  const versionIngresos = useVersionTabla('ingresos');
  const versionCategorias = useVersionTabla('categorias');

  const [mes, setMes] = useState<Mes>(mesActual);
  const [gastos, setGastos] = useState<GastoFila[]>([]);
  const [ingresos, setIngresos] = useState<Record<string, number>>({});
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ingresoEscrito, setIngresoEscrito] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDescrito | null>(null);

  // Carga los meses necesarios: el seleccionado, el anterior y el historial de ahorro.
  const cargar = useCallback(async () => {
    if (!grupoId) return;
    try {
      const desde = desplazarMes(mes, -(MESES_HISTORIAL - 1) - 1);
      const [g, i, c] = await Promise.all([
        cargarGastos(grupoId, desde, mes),
        cargarIngresos(grupoId, desde, mes),
        listarCategorias(grupoId, true),
      ]);
      setGastos(g);
      setIngresos(i);
      setCategorias(c);
      setError(null);
    } catch (e) {
      setError(describirError(e));
    } finally {
      setCargando(false);
    }
  }, [grupoId, mes]);

  useEffect(() => {
    cargar();
  }, [cargar, versionGastos, versionIngresos, versionCategorias]);

  // Al cambiar de mes, el campo de ingresos muestra el valor de ese mes.
  useEffect(() => {
    const valor = ingresos[claveMes(mes)];
    setIngresoEscrito(valor != null ? String(valor).replace('.', ',') : '');
  }, [mes, ingresos]);

  const nombres = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);

  const gastoActual = useMemo(() => gastoPorCategoria(gastos, mes), [gastos, mes]);
  const gastoAnterior = useMemo(() => gastoPorCategoria(gastos, desplazarMes(mes, -1)), [gastos, mes]);
  const totalActual = totalDe(gastoActual);
  const totalAnterior = totalDe(gastoAnterior);
  const ingresosMes = ingresos[claveMes(mes)] ?? 0;
  const ahorroMes = ingresosMes - totalActual;
  const historial = useMemo(() => ahorroPorMes(gastos, ingresos, mes, MESES_HISTORIAL), [gastos, ingresos, mes]);

  const categoriasOrdenadas = useMemo(
    () => Object.entries(gastoActual).sort((a, b) => b[1] - a[1]),
    [gastoActual],
  );
  const maxCategoria = categoriasOrdenadas[0]?.[1] ?? 1;

  // Categorías con gasto en cualquiera de los dos meses, para la comparativa.
  const clavesComparativa = useMemo(
    () => Array.from(new Set([...Object.keys(gastoActual), ...Object.keys(gastoAnterior)])),
    [gastoActual, gastoAnterior],
  );

  async function guardarIngresoMes() {
    if (!grupoId) return;
    const valor = parsearPrecio(ingresoEscrito);
    if (valor === 'error' || valor === null) {
      setError({ texto: t.ingresoNoValido, detalle: `Ingresos escritos: ${ingresoEscrito}` });
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await guardarIngreso(grupoId, mes, valor);
      await cargar();
    } catch (e) {
      setError(describirError(e));
    } finally {
      setGuardando(false);
    }
  }

  const colorAhorro = (n: number) => (n >= 0 ? '#2E9E5B' : '#D32F2F');

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <Stack.Screen options={{ title: t.titulo }} />

      <View style={styles.columna}>
        <View style={styles.selectorMes}>
          <Pressable accessibilityRole="button" onPress={() => setMes((m) => desplazarMes(m, -1))} hitSlop={12}>
            <ThemedText type="smallBold">‹</ThemedText>
          </Pressable>
          <ThemedText type="smallBold" style={styles.mesTitulo}>{nombreMes(mes)}</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => setMes((m) => desplazarMes(m, 1))} hitSlop={12}>
            <ThemedText type="smallBold">›</ThemedText>
          </Pressable>
        </View>

        {cargando ? (
          <ActivityIndicator style={styles.espacio} />
        ) : (
          <>
            <ThemedView type="backgroundElement" style={styles.tarjeta}>
              <View style={styles.fila}>
                <ThemedText type="small" themeColor="textSecondary">{t.gastado}</ThemedText>
                <ThemedText type="smallBold">{euros(totalActual)}</ThemedText>
              </View>
              <View style={styles.fila}>
                <ThemedText type="small" themeColor="textSecondary">{t.ahorro}</ThemedText>
                <ThemedText style={{ fontWeight: '800', color: colorAhorro(ahorroMes) }}>
                  {euros(ahorroMes)}
                </ThemedText>
              </View>
              <Campo
                etiqueta={t.ingresos}
                value={ingresoEscrito}
                onChangeText={setIngresoEscrito}
                keyboardType="decimal-pad"
                placeholder="0,00"
              />
              <Boton titulo={t.guardarIngresos} onPress={guardarIngresoMes} cargando={guardando} secundario />
            </ThemedView>

            {error && <Mensaje texto={error.texto} detalle={error.detalle} />}

            <ThemedView type="backgroundElement" style={styles.tarjeta}>
              <ThemedText type="smallBold">{t.porCategoria}</ThemedText>
              {categoriasOrdenadas.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">{t.sinGastos}</ThemedText>
              ) : (
                categoriasOrdenadas.map(([id, importe]) => {
                  const cat = nombres.get(id);
                  const visual = cat ? visualDe(cat) : { icono: 'estrella', color: '#9D7CFF' };
                  return (
                    <View key={id} style={styles.barraFila}>
                      <View style={styles.barraCabecera}>
                        <ThemedText type="small">{cat?.nombre ?? '—'}</ThemedText>
                        <ThemedText type="small">
                          {`${euros(importe)} · ${Math.round((importe / totalActual) * 100)}%`}
                        </ThemedText>
                      </View>
                      <View style={styles.barraFondo}>
                        <View
                          style={[
                            styles.barra,
                            { width: `${(importe / maxCategoria) * 100}%`, backgroundColor: visual.color },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.tarjeta}>
              <ThemedText type="smallBold">{t.comparativa}</ThemedText>
              <View style={styles.fila}>
                <ThemedText type="small" themeColor="textSecondary">{t.anterior}</ThemedText>
                <ThemedText type="small">{euros(totalAnterior)}</ThemedText>
              </View>
              {clavesComparativa.map((id) => {
                const actual = gastoActual[id] ?? 0;
                const anterior = gastoAnterior[id] ?? 0;
                const diferencia = actual - anterior;
                const cat = nombres.get(id);
                return (
                  <View key={id} style={styles.fila}>
                    <ThemedText type="small">{cat?.nombre ?? '—'}</ThemedText>
                    <ThemedText type="small" style={{ color: diferencia > 0 ? '#D32F2F' : diferencia < 0 ? '#2E9E5B' : undefined }}>
                      {`${euros(actual)} (${diferencia >= 0 ? '+' : ''}${euros(diferencia)})`}
                    </ThemedText>
                  </View>
                );
              })}
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.tarjeta}>
              <ThemedText type="smallBold">{t.ahorroUltimos}</ThemedText>
              <View style={styles.columnas}>
                {historial.map((punto) => {
                  const maximo = Math.max(1, ...historial.map((h) => Math.abs(h.ahorro)));
                  const altura = (Math.abs(punto.ahorro) / maximo) * 90;
                  return (
                    <View key={claveMes(punto.mes)} style={styles.columna1}>
                      <View style={styles.columnaArea}>
                        <View
                          style={[
                            styles.columnaBarra,
                            { height: Math.max(altura, 2), backgroundColor: colorAhorro(punto.ahorro) },
                          ]}
                        />
                      </View>
                      <ThemedText type="small" style={styles.centrado}>{mesCorto(punto.mes)}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>
                        {Math.round(punto.ahorro)} €
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </ThemedView>
          </>
        )}
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
  selectorMes: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mesTitulo: {
    fontWeight: '700',
  },
  espacio: {
    marginTop: Spacing.four,
  },
  tarjeta: {
    borderRadius: 18,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  fila: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barraFila: {
    gap: Spacing.one,
  },
  barraCabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barraFondo: {
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden',
  },
  barra: {
    borderRadius: 999,
    height: '100%',
  },
  columnas: {
    flexDirection: 'row',
    gap: Spacing.two,
    height: 130,
    alignItems: 'flex-end',
  },
  columna1: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  columnaArea: {
    alignItems: 'center',
    height: 90,
    justifyContent: 'flex-end',
    width: '100%',
  },
  columnaBarra: {
    borderRadius: 6,
    width: '70%',
  },
  centrado: {
    textAlign: 'center',
  },
});
