import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Boton, Campo, Mensaje } from '@/components/formulario';
import { GraficoLineas, GraficoTarta, Porcion, SelectorGrafico } from '@/components/graficos';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { Categoria, listarCategorias, parsearPrecio } from '@/lib/compras';
import { colorDeTexto, PALETA, visualDe } from '@/lib/estados-visual';
import {
  ahorroPorMes,
  cargarGastos,
  cargarIngresos,
  claveMes,
  crearGasto,
  desplazarMes,
  gastoPorCategoria,
  GastoFila,
  guardarIngreso,
  Mes,
  mesActual,
  quitarGasto,
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

/** Fecha de hoy en formato AAAA-MM-DD, en hora local. */
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Valida 'AAAA-MM-DD' y que sea una fecha real (no 31 de febrero, etc.). */
function fechaValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [anio, mes, dia] = texto.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);
  return d.getFullYear() === anio && d.getMonth() === mes - 1 && d.getDate() === dia;
}

const TIPOS_CATEGORIA = [
  { clave: 'barras' as const, etiqueta: t.barras },
  { clave: 'tarta' as const, etiqueta: t.tarta },
  { clave: 'anillo' as const, etiqueta: t.anillo },
];
const TIPOS_AHORRO = [
  { clave: 'barras' as const, etiqueta: t.barras },
  { clave: 'lineas' as const, etiqueta: t.lineas },
  { clave: 'tarta' as const, etiqueta: t.tarta },
  { clave: 'anillo' as const, etiqueta: t.anillo },
];

/** Resumen del mes: gráficos cambiables, comparativa, ahorro y alta de gastos a mano. */
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
  const [error, setError] = useState<ErrorDescrito | null>(null);

  const [ingresoEscrito, setIngresoEscrito] = useState('');
  const [guardandoIngreso, setGuardandoIngreso] = useState(false);

  const [importeNuevo, setImporteNuevo] = useState('');
  const [categoriaNueva, setCategoriaNueva] = useState<string | null>(null);
  const [fechaNueva, setFechaNueva] = useState(hoyISO);
  const [descripcionNueva, setDescripcionNueva] = useState('');
  const [guardandoGasto, setGuardandoGasto] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  const [vistaCategorias, setVistaCategorias] = useState<'barras' | 'tarta' | 'anillo'>('barras');
  const [vistaAhorro, setVistaAhorro] = useState<'barras' | 'lineas' | 'tarta' | 'anillo'>('barras');

  const cargar = useCallback(async () => {
    if (!grupoId) return;
    try {
      const desde = desplazarMes(mes, -MESES_HISTORIAL);
      const [g, i, c] = await Promise.all([
        cargarGastos(grupoId, desde, mes),
        cargarIngresos(grupoId, desde, mes),
        listarCategorias(grupoId),
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

  // La categoría por defecto del formulario es la primera disponible.
  useEffect(() => {
    if (!categoriaNueva && categorias.length > 0) setCategoriaNueva(categorias[0].id);
  }, [categorias, categoriaNueva]);

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

  const categoriasOrdenadas = useMemo(() => Object.entries(gastoActual).sort((a, b) => b[1] - a[1]), [gastoActual]);
  const maxCategoria = categoriasOrdenadas[0]?.[1] ?? 1;
  const clavesComparativa = useMemo(
    () => Array.from(new Set([...Object.keys(gastoActual), ...Object.keys(gastoAnterior)])),
    [gastoActual, gastoAnterior],
  );

  const porciones: Porcion[] = useMemo(
    () =>
      categoriasOrdenadas.map(([id, valor], i) => {
        const cat = nombres.get(id);
        const color = cat ? visualDe(cat).color : PALETA[i % PALETA.length];
        return { id, etiqueta: cat?.nombre ?? '—', valor, color };
      }),
    [categoriasOrdenadas, nombres],
  );

  // Reparto del ingreso del mes: cada categoría de gasto más el ahorro, si queda algo.
  const repartoIngreso: Porcion[] = useMemo(() => {
    const porcionesGasto = porciones.map((p) => ({ ...p }));
    if (ahorroMes > 0) {
      porcionesGasto.push({ id: 'ahorro', etiqueta: t.ahorro, valor: ahorroMes, color: '#2E9E5B' });
    }
    return porcionesGasto;
  }, [porciones, ahorroMes]);

  const gastosDelMes = useMemo(
    () => gastos.filter((g) => g.fecha.slice(0, 7) === claveMes(mes)).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [gastos, mes],
  );

  async function guardarIngresoMes() {
    if (!grupoId) return;
    const valor = parsearPrecio(ingresoEscrito);
    if (valor === 'error' || valor === null) {
      setError({ texto: t.ingresoNoValido, detalle: `Ingresos escritos: ${ingresoEscrito}` });
      return;
    }
    setError(null);
    setGuardandoIngreso(true);
    try {
      await guardarIngreso(grupoId, mes, valor);
      await cargar();
    } catch (e) {
      setError(describirError(e));
    } finally {
      setGuardandoIngreso(false);
    }
  }

  async function anadirGasto() {
    if (!grupoId) return;
    if (!categoriaNueva) {
      setError({ texto: t.sinCategorias, detalle: 'Sin categorías activas' });
      return;
    }
    const importe = parsearPrecio(importeNuevo);
    if (importe === null || importe === 'error') {
      setError({ texto: t.importeObligatorio, detalle: `Importe escrito: ${importeNuevo}` });
      return;
    }
    if (!fechaValida(fechaNueva)) {
      setError({ texto: t.fechaNoValida, detalle: `Fecha escrita: ${fechaNueva}` });
      return;
    }
    setError(null);
    setGuardandoGasto(true);
    try {
      await crearGasto(grupoId, {
        fecha: fechaNueva,
        importe,
        categoriaId: categoriaNueva,
        descripcion: descripcionNueva.trim() || null,
      });
      setImporteNuevo('');
      setDescripcionNueva('');
      await cargar();
    } catch (e) {
      setError(describirError(e));
    } finally {
      setGuardandoGasto(false);
    }
  }

  function quitar(gasto: GastoFila) {
    if (confirmandoId !== gasto.id) {
      setConfirmandoId(gasto.id);
      return;
    }
    setConfirmandoId(null);
    quitarGasto(gasto.id).then(cargar).catch((e) => setError(describirError(e)));
  }

  const colorAhorro = (n: number) => (n >= 0 ? '#2E9E5B' : '#D32F2F');
  const colorCategoriaNueva = categoriaNueva ? visualDe(nombres.get(categoriaNueva) ?? { nombre: '', orden: 0 }).color : '#4D96FF';

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
                <ThemedText style={{ fontWeight: '800', color: colorAhorro(ahorroMes) }}>{euros(ahorroMes)}</ThemedText>
              </View>
              <Campo
                etiqueta={t.ingresos}
                value={ingresoEscrito}
                onChangeText={setIngresoEscrito}
                keyboardType="decimal-pad"
                placeholder="0,00"
              />
              <Boton titulo={t.guardarIngresos} onPress={guardarIngresoMes} cargando={guardandoIngreso} secundario />
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.tarjeta}>
              <ThemedText type="smallBold">{t.nuevoGasto}</ThemedText>
              {categorias.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">{t.sinCategorias}</ThemedText>
              ) : (
                <>
                  <Campo
                    etiqueta={t.importe}
                    value={importeNuevo}
                    onChangeText={setImporteNuevo}
                    keyboardType="decimal-pad"
                    placeholder="0,00"
                  />
                  <ThemedText type="small" themeColor="textSecondary">{t.categoria}</ThemedText>
                  <View style={styles.chips}>
                    {categorias.map((cat) => {
                      const visual = visualDe(cat);
                      const activa = cat.id === categoriaNueva;
                      return (
                        <Pressable
                          key={cat.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: activa }}
                          onPress={() => setCategoriaNueva(cat.id)}
                          style={[
                            styles.chip,
                            { backgroundColor: visual.color, opacity: activa ? 1 : 0.5 },
                            activa && styles.chipActivo,
                          ]}>
                          <ThemedText style={{ color: colorDeTexto(visual.color), fontWeight: '700' }}>{cat.nombre}</ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Campo etiqueta={t.fecha} value={fechaNueva} onChangeText={setFechaNueva} placeholder="2026-11-06" />
                  <Campo etiqueta={t.descripcion} value={descripcionNueva} onChangeText={setDescripcionNueva} />
                  <Boton titulo={t.anadirGasto} onPress={anadirGasto} cargando={guardandoGasto} colorFondo={colorCategoriaNueva} />
                </>
              )}
            </ThemedView>

            {error && <Mensaje texto={error.texto} detalle={error.detalle} />}

            <ThemedView type="backgroundElement" style={styles.tarjeta}>
              <ThemedText type="smallBold">{t.gastosDelMes}</ThemedText>
              {gastosDelMes.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">{t.ningunGasto}</ThemedText>
              ) : (
                gastosDelMes.map((g) => {
                  const cat = nombres.get(g.categoria_id);
                  return (
                    <View key={g.id} style={styles.gastoFila}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.fecha}>
                        {g.fecha.slice(8, 10)}/{g.fecha.slice(5, 7)}
                      </ThemedText>
                      <View style={styles.gastoTextos}>
                        <ThemedText type="small">{g.descripcion || cat?.nombre || '—'}</ThemedText>
                        {g.descripcion && <ThemedText type="small" themeColor="textSecondary">{cat?.nombre ?? ''}</ThemedText>}
                      </View>
                      <ThemedText type="smallBold">{euros(g.importe)}</ThemedText>
                      <Pressable accessibilityRole="button" onPress={() => quitar(g)} hitSlop={8}>
                        <ThemedText type="small" style={styles.peligro}>
                          {confirmandoId === g.id ? t.confirmarQuitar : t.quitar}
                        </ThemedText>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.tarjeta}>
              <ThemedText type="smallBold">{t.porCategoria}</ThemedText>
              <SelectorGrafico opciones={TIPOS_CATEGORIA} valor={vistaCategorias} onCambiar={setVistaCategorias} />
              {categoriasOrdenadas.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">{t.sinGastos}</ThemedText>
              ) : vistaCategorias === 'barras' ? (
                categoriasOrdenadas.map(([id, importe]) => {
                  const cat = nombres.get(id);
                  const visual = cat ? visualDe(cat) : { icono: 'estrella', color: '#9D7CFF' };
                  return (
                    <View key={id} style={styles.barraFila}>
                      <View style={styles.barraCabecera}>
                        <ThemedText type="small">{cat?.nombre ?? '—'}</ThemedText>
                        <ThemedText type="small">{`${euros(importe)} · ${Math.round((importe / totalActual) * 100)}%`}</ThemedText>
                      </View>
                      <View style={styles.barraFondo}>
                        <View style={[styles.barra, { width: `${(importe / maxCategoria) * 100}%`, backgroundColor: visual.color }]} />
                      </View>
                    </View>
                  );
                })
              ) : (
                <GraficoTarta porciones={porciones} anillo={vistaCategorias === 'anillo'} />
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
                return (
                  <View key={id} style={styles.fila}>
                    <ThemedText type="small">{nombres.get(id)?.nombre ?? '—'}</ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: diferencia > 0 ? '#D32F2F' : diferencia < 0 ? '#2E9E5B' : undefined }}>
                      {`${euros(actual)} (${diferencia >= 0 ? '+' : ''}${euros(diferencia)})`}
                    </ThemedText>
                  </View>
                );
              })}
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.tarjeta}>
              <ThemedText type="smallBold">{t.ahorroUltimos}</ThemedText>
              <SelectorGrafico opciones={TIPOS_AHORRO} valor={vistaAhorro} onCambiar={setVistaAhorro} />
              {(vistaAhorro === 'tarta' || vistaAhorro === 'anillo') && (
                <ThemedText type="small" themeColor="textSecondary">{t.repartoMes(nombreMes(mes))}</ThemedText>
              )}
              {vistaAhorro === 'tarta' || vistaAhorro === 'anillo' ? (
                ingresosMes <= 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">{t.sinIngresosReparto}</ThemedText>
                ) : repartoIngreso.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">{t.sinGastos}</ThemedText>
                ) : (
                  <GraficoTarta porciones={repartoIngreso} anillo={vistaAhorro === 'anillo'} />
                )
              ) : vistaAhorro === 'barras' ? (
                <View style={styles.columnas}>
                  {historial.map((punto) => {
                    const maximo = Math.max(1, ...historial.map((h) => Math.abs(h.ahorro)));
                    const altura = (Math.abs(punto.ahorro) / maximo) * 90;
                    return (
                      <View key={claveMes(punto.mes)} style={styles.columna1}>
                        <View style={styles.columnaArea}>
                          <View style={[styles.columnaBarra, { height: Math.max(altura, 2), backgroundColor: colorAhorro(punto.ahorro) }]} />
                        </View>
                        <ThemedText type="small" style={styles.centrado}>{mesCorto(punto.mes)}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>{`${Math.round(punto.ahorro)} €`}</ThemedText>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <GraficoLineas
                  puntos={historial.map((punto) => ({
                    etiqueta: mesCorto(punto.mes),
                    valor: punto.ahorro,
                    color: colorAhorro(punto.ahorro),
                  }))}
                />
              )}
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
  },
  chipActivo: {
    borderColor: '#1A1A1A',
    borderWidth: 2,
  },
  gastoFila: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: 4,
  },
  fecha: {
    width: 44,
  },
  gastoTextos: {
    flex: 1,
  },
  peligro: {
    color: '#D32F2F',
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
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: Spacing.two,
    height: 130,
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
