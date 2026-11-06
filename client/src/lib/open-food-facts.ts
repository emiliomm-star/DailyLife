/**
 * Búsqueda de productos en Open Food Facts (base de datos abierta, licencia ODbL).
 * Solo se usan nombre, marca, imagen y código de barras. OFF tiene pocos precios: el precio lo pone el usuario.
 */
export type ProductoCatalogo = {
  codigo: string;
  nombre: string;
  marca: string | null;
  imagen: string | null;
  cantidad: string | null;
};

type RespuestaOff = {
  products?: Array<{
    code?: string;
    product_name?: string;
    product_name_es?: string;
    brands?: string;
    image_front_small_url?: string;
    quantity?: string;
  }>;
};

const URL_BUSQUEDA = 'https://world.openfoodfacts.org/cgi/search.pl';

/** Error propio para que la interfaz muestre un mensaje claro en vez del código HTTP. */
export class CatalogoNoDisponible extends Error {
  constructor(public readonly estado: number) {
    super(`Open Food Facts respondió ${estado}`);
    this.name = 'CatalogoNoDisponible';
  }
}

const MINIMO_LETRAS = 3;
const REINTENTOS = 2;
/** Resultados ya pedidos en esta sesión: escribir, borrar y volver a escribir no vuelve a consultar. */
const cache = new Map<string, ProductoCatalogo[]>();

const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

/** Busca productos por texto. Cancelable con AbortSignal para no mostrar resultados antiguos. */
export async function buscarEnCatalogo(termino: string, senal?: AbortSignal): Promise<ProductoCatalogo[]> {
  const texto = termino.trim().toLowerCase();
  if (texto.length < MINIMO_LETRAS) return [];

  const enCache = cache.get(texto);
  if (enCache) return enCache;

  const params = new URLSearchParams({
    search_terms: texto,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '25',
    fields: 'code,product_name,product_name_es,brands,image_front_small_url,quantity',
    lc: 'es',
  });

  let respuesta: Response | null = null;
  for (let intento = 0; intento <= REINTENTOS; intento++) {
    respuesta = await fetch(`${URL_BUSQUEDA}?${params.toString()}`, { signal: senal });
    // 503 y 429 suelen ser saturación temporal: se reintenta con una pausa creciente.
    if (respuesta.status !== 503 && respuesta.status !== 429) break;
    if (intento < REINTENTOS) await esperar(1000 * (intento + 1));
  }
  if (!respuesta || !respuesta.ok) throw new CatalogoNoDisponible(respuesta?.status ?? 0);
  const json = (await respuesta.json()) as RespuestaOff;

  const resultados: ProductoCatalogo[] = [];
  for (const p of json.products ?? []) {
    const nombre = (p.product_name_es || p.product_name || '').trim();
    if (!nombre || !p.code) continue;
    resultados.push({
      codigo: p.code,
      nombre,
      marca: p.brands?.split(',')[0]?.trim() || null,
      imagen: p.image_front_small_url?.startsWith('https://') ? p.image_front_small_url : null,
      cantidad: p.quantity?.trim() || null,
    });
  }
  cache.set(texto, resultados);
  return resultados;
}
