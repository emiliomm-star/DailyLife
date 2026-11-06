import catalogo from '@/data/ejercicios-wger.json';

/** Ejercicio del catálogo de wger (copia compacta generada con scripts/generar_catalogo_wger.py). */
export type EjercicioCatalogo = {
  id: number;
  n: string;
  c: string | null;
  m: string[];
  e: string[];
  i: string | null;
};

const ejercicios = catalogo as EjercicioCatalogo[];

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Busca en el catálogo local por nombre. Cada palabra debe aparecer (sin tildes ni mayúsculas).
 * No usa red: es instantáneo y no consume la API de wger.
 */
export function buscarEjercicios(termino: string, limite = 40): EjercicioCatalogo[] {
  const consulta = normalizar(termino);
  if (consulta.length < 2) return [];
  const palabras = consulta.split(/\s+/);

  const resultados: EjercicioCatalogo[] = [];
  for (const ejercicio of ejercicios) {
    const nombre = normalizar(ejercicio.n);
    if (palabras.every((palabra) => nombre.includes(palabra))) {
      resultados.push(ejercicio);
      if (resultados.length >= limite) break;
    }
  }
  return resultados;
}
