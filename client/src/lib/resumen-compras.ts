import { supabase } from '@/lib/supabase';

/** Mes de calendario. mes va de 0 (enero) a 11 (diciembre). */
export type Mes = { anio: number; mes: number };

export type GastoFila = { categoria_id: string; importe: number; fecha: string };

const pad = (n: number) => String(n).padStart(2, '0');

export const mesActual = (): Mes => {
  const hoy = new Date();
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() };
};

/** Desplaza un mes N meses hacia atrás (negativo) o adelante (positivo). */
export function desplazarMes(m: Mes, meses: number): Mes {
  const total = m.anio * 12 + m.mes + meses;
  return { anio: Math.floor(total / 12), mes: total % 12 };
}

/** Clave 'YYYY-MM' para agrupar. */
export const claveMes = (m: Mes) => `${m.anio}-${pad(m.mes + 1)}`;

/** Fecha 'YYYY-MM-01' del primer día del mes, en hora local (evita desfases de zona horaria). */
export const primerDiaISO = (m: Mes) => `${m.anio}-${pad(m.mes + 1)}-01`;

/** Gastos del grupo entre dos meses (incluidos), para los gráficos. */
export async function cargarGastos(grupoId: string, desde: Mes, hasta: Mes): Promise<GastoFila[]> {
  const siguienteAlHasta = desplazarMes(hasta, 1);
  const { data, error } = await supabase
    .from('gastos')
    .select('categoria_id, importe, fecha')
    .eq('grupo_id', grupoId)
    .gte('fecha', primerDiaISO(desde))
    .lt('fecha', primerDiaISO(siguienteAlHasta));
  if (error) throw error;
  return (data ?? []).map((f) => ({ categoria_id: f.categoria_id, importe: Number(f.importe), fecha: f.fecha }));
}

/** Ingresos del grupo por mes: mapa 'YYYY-MM' → importe. */
export async function cargarIngresos(grupoId: string, desde: Mes, hasta: Mes): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('ingresos')
    .select('mes, importe')
    .eq('grupo_id', grupoId)
    .gte('mes', primerDiaISO(desde))
    .lte('mes', primerDiaISO(hasta));
  if (error) throw error;
  const mapa: Record<string, number> = {};
  for (const fila of data ?? []) {
    const clave = String(fila.mes).slice(0, 7);
    mapa[clave] = (mapa[clave] ?? 0) + Number(fila.importe);
  }
  return mapa;
}

/** Guarda el ingreso de un mes (crea o actualiza). */
export async function guardarIngreso(grupoId: string, mes: Mes, importe: number): Promise<void> {
  const { data, error } = await supabase
    .from('ingresos')
    .select('id')
    .eq('grupo_id', grupoId)
    .eq('mes', primerDiaISO(mes))
    .limit(1);
  if (error) throw error;

  if (data && data.length > 0) {
    const { error: errorUpdate } = await supabase.from('ingresos').update({ importe }).eq('id', data[0].id);
    if (errorUpdate) throw errorUpdate;
  } else {
    const { error: errorInsert } = await supabase
      .from('ingresos')
      .insert({ grupo_id: grupoId, mes: primerDiaISO(mes), importe });
    if (errorInsert) throw errorInsert;
  }
}

/** Total gastado por categoría en un mes. */
export function gastoPorCategoria(gastos: GastoFila[], mes: Mes): Record<string, number> {
  const clave = claveMes(mes);
  const mapa: Record<string, number> = {};
  for (const g of gastos) {
    if (g.fecha.slice(0, 7) !== clave) continue;
    mapa[g.categoria_id] = (mapa[g.categoria_id] ?? 0) + g.importe;
  }
  return mapa;
}

export const totalDe = (mapa: Record<string, number>) => Object.values(mapa).reduce((a, b) => a + b, 0);

/** Ahorro de cada mes = ingresos − gastos, para los últimos meses hasta 'hasta' (incluido). */
export function ahorroPorMes(
  gastos: GastoFila[],
  ingresos: Record<string, number>,
  hasta: Mes,
  cantidad: number,
): Array<{ mes: Mes; ingresos: number; gastos: number; ahorro: number }> {
  const salida = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const mes = desplazarMes(hasta, -i);
    const clave = claveMes(mes);
    const g = totalDe(gastoPorCategoria(gastos, mes));
    const ing = ingresos[clave] ?? 0;
    salida.push({ mes, ingresos: ing, gastos: g, ahorro: ing - g });
  }
  return salida;
}
