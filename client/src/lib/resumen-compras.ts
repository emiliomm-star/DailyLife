import { supabase } from '@/lib/supabase';

/** Mes de calendario. mes va de 0 (enero) a 11 (diciembre). */
export type Mes = { anio: number; mes: number };

/**
 * Gastos e ingresos: cada fila tiene una persona dueña (creadoPor / created_by). Las lecturas devuelven
 * lo que el usuario puede ver según la privacidad del módulo 'compras'; las escrituras son solo propias.
 */
export type GastoFila = {
  id: string;
  categoria_id: string;
  importe: number;
  fecha: string;
  descripcion: string | null;
  creadoPor: string;
};

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

/** Gastos visibles del grupo entre dos meses (incluidos), para los gráficos. */
export async function cargarGastos(grupoId: string, desde: Mes, hasta: Mes): Promise<GastoFila[]> {
  const siguienteAlHasta = desplazarMes(hasta, 1);
  const { data, error } = await supabase
    .from('gastos')
    .select('id, categoria_id, importe, fecha, descripcion, created_by')
    .eq('grupo_id', grupoId)
    .gte('fecha', primerDiaISO(desde))
    .lt('fecha', primerDiaISO(siguienteAlHasta));
  if (error) throw error;
  return (data ?? []).map((f) => ({
    id: f.id,
    categoria_id: f.categoria_id,
    importe: Number(f.importe),
    fecha: f.fecha,
    descripcion: f.descripcion,
    creadoPor: f.created_by,
  }));
}

/** Ingresos por mes ('YYYY-MM'): totales de todo lo visible y los propios, por separado. */
export async function cargarIngresos(
  grupoId: string,
  usuarioId: string,
  desde: Mes,
  hasta: Mes,
): Promise<{ totales: Record<string, number>; propios: Record<string, number> }> {
  const { data, error } = await supabase
    .from('ingresos')
    .select('mes, importe, created_by')
    .eq('grupo_id', grupoId)
    .gte('mes', primerDiaISO(desde))
    .lte('mes', primerDiaISO(hasta));
  if (error) throw error;
  const totales: Record<string, number> = {};
  const propios: Record<string, number> = {};
  for (const fila of data ?? []) {
    const clave = String(fila.mes).slice(0, 7);
    const importe = Number(fila.importe);
    totales[clave] = (totales[clave] ?? 0) + importe;
    if (fila.created_by === usuarioId) propios[clave] = (propios[clave] ?? 0) + importe;
  }
  return { totales, propios };
}

/** Guarda mi ingreso de un mes (crea o actualiza solo mi fila). */
export async function guardarIngreso(grupoId: string, usuarioId: string, mes: Mes, importe: number): Promise<void> {
  const { data, error } = await supabase
    .from('ingresos')
    .select('id')
    .eq('grupo_id', grupoId)
    .eq('created_by', usuarioId)
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

/** Registra un gasto a mano. La fecha va en formato 'YYYY-MM-DD'. */
export async function crearGasto(
  grupoId: string,
  datos: { fecha: string; importe: number; categoriaId: string; descripcion: string | null },
): Promise<void> {
  const { error } = await supabase.from('gastos').insert({
    grupo_id: grupoId,
    fecha: datos.fecha,
    importe: datos.importe,
    categoria_id: datos.categoriaId,
    descripcion: datos.descripcion,
  });
  if (error) throw error;
}

export async function quitarGasto(gastoId: string): Promise<void> {
  const { error } = await supabase.from('gastos').delete().eq('id', gastoId);
  if (error) throw error;
}
