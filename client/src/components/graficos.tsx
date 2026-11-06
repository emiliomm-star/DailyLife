import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type Porcion = { id: string; etiqueta: string; valor: number; color: string };

export type TipoGrafico = 'barras' | 'tarta' | 'anillo' | 'lineas';

/** Selector de vista de gráfico: pestañas pequeñas con el mismo estilo que el resto de la app. */
export function SelectorGrafico<T extends string>({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: ReadonlyArray<{ clave: T; etiqueta: string }>;
  valor: T;
  onCambiar: (clave: T) => void;
}) {
  return (
    <View style={styles.selector}>
      {opciones.map((opcion) => {
        const activo = opcion.clave === valor;
        return (
          <Pressable
            key={opcion.clave}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            onPress={() => onCambiar(opcion.clave)}
            style={[styles.opcion, activo && styles.opcionActiva]}>
            <ThemedText type="small" style={activo ? styles.opcionTextoActiva : undefined}>
              {opcion.etiqueta}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const TAMANO = 200;
const CENTRO = TAMANO / 2;
const RADIO = 92;

/** Trazo de un sector circular entre dos ángulos (en radianes). */
function sector(inicio: number, fin: number, radio: number, radioInterior: number): string {
  const punto = (r: number, a: number) => [CENTRO + r * Math.cos(a), CENTRO + r * Math.sin(a)] as const;
  const [x1, y1] = punto(radio, inicio);
  const [x2, y2] = punto(radio, fin);
  const grande = fin - inicio > Math.PI ? 1 : 0;
  if (radioInterior <= 0) {
    return `M ${CENTRO} ${CENTRO} L ${x1} ${y1} A ${radio} ${radio} 0 ${grande} 1 ${x2} ${y2} Z`;
  }
  const [xi2, yi2] = punto(radioInterior, fin);
  const [xi1, yi1] = punto(radioInterior, inicio);
  return `M ${x1} ${y1} A ${radio} ${radio} 0 ${grande} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${radioInterior} ${radioInterior} 0 ${grande} 0 ${xi1} ${yi1} Z`;
}

/** Tarta (o anillo, si anillo es true) con leyenda. Los porcentajes salen del total. */
export const GraficoTarta = memo(function GraficoTarta({ porciones, anillo = false }: { porciones: Porcion[]; anillo?: boolean }) {
  const total = porciones.reduce((suma, p) => suma + p.valor, 0);

  const trazos = useMemo(() => {
    let inicio = -Math.PI / 2;
    return porciones.map((p) => {
      const barrido = (p.valor / total) * Math.PI * 2;
      const fin = inicio + barrido;
      const trazo = sector(inicio, fin, RADIO, anillo ? RADIO * 0.58 : 0);
      inicio = fin;
      return { ...p, trazo, porcentaje: Math.round((p.valor / total) * 100) };
    });
  }, [porciones, total, anillo]);

  if (total <= 0) return null;
  const esUnica = porciones.length === 1;

  return (
    <View style={styles.graficoTarta}>
      <Svg width="100%" height={220} viewBox={`0 0 ${TAMANO} ${TAMANO}`}>
        {esUnica ? (
          anillo ? (
            <>
              <Circle cx={CENTRO} cy={CENTRO} r={RADIO} fill={porciones[0].color} />
              <Circle cx={CENTRO} cy={CENTRO} r={RADIO * 0.58} fill="#111" />
            </>
          ) : (
            <Circle cx={CENTRO} cy={CENTRO} r={RADIO} fill={porciones[0].color} />
          )
        ) : (
          trazos.map((t) => <Path key={t.id} d={t.trazo} fill={t.color} />)
        )}
      </Svg>
      <View style={styles.leyenda}>
        {trazos.map((t) => (
          <View key={t.id} style={styles.leyendaFila}>
            <View style={[styles.punto, { backgroundColor: t.color }]} />
            <ThemedText type="small" style={styles.leyendaTexto}>{t.etiqueta}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{`${t.porcentaje}%`}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
});

/** Líneas con puntos: útil para ver la evolución (p. ej., del ahorro). Valores negativos bajan de la línea base. */
export const GraficoLineas = memo(function GraficoLineas({
  puntos,
}: {
  puntos: Array<{ etiqueta: string; valor: number; color: string }>;
}) {
  const ANCHO = 300;
  const ALTO = 150;
  const MARGEN = 16;
  const maximo = Math.max(1, ...puntos.map((p) => Math.abs(p.valor)));
  const base = ALTO / 2;
  const escalaY = (ALTO / 2 - MARGEN) / maximo;
  const paso = puntos.length > 1 ? (ANCHO - MARGEN * 2) / (puntos.length - 1) : 0;

  const coordenadas = puntos.map((p, i) => ({
    x: MARGEN + i * paso,
    y: base - p.valor * escalaY,
    color: p.color,
  }));
  const trazo = coordenadas.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  return (
    <View>
      <Svg width="100%" height={170} viewBox={`0 0 ${ANCHO} ${ALTO}`}>
        <Line x1={MARGEN} y1={base} x2={ANCHO - MARGEN} y2={base} stroke="rgba(128,128,128,0.4)" strokeWidth={1} />
        {coordenadas.length > 1 && <Path d={trazo} fill="none" stroke="#4D96FF" strokeWidth={3} strokeLinejoin="round" />}
        {coordenadas.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={5} fill={c.color} />
        ))}
      </Svg>
      <View style={styles.etiquetasLinea}>
        {puntos.map((p) => (
          <View key={p.etiqueta} style={styles.etiquetaLinea}>
            <ThemedText type="small" style={styles.centrado}>{p.etiqueta}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centrado}>{`${Math.round(p.valor)} €`}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
});


const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    gap: Spacing.one,
    backgroundColor: 'rgba(128,128,128,0.15)',
    borderRadius: 12,
    padding: 3,
    alignSelf: 'flex-start',
  },
  opcion: {
    borderRadius: 9,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  opcionActiva: {
    backgroundColor: '#FFFFFF',
  },
  opcionTextoActiva: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
  graficoTarta: {
    gap: Spacing.two,
  },
  leyenda: {
    gap: Spacing.one,
  },
  leyendaFila: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  leyendaTexto: {
    flex: 1,
  },
  punto: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  etiquetasLinea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  etiquetaLinea: {
    alignItems: 'center',
    flex: 1,
  },
  centrado: {
    textAlign: 'center',
  },
});
