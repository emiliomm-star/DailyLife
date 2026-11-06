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

/** Busca productos por texto. Cancelable con AbortSignal para no mostrar resultados antiguos. */
export async function buscarEnCatalogo(termino: string, senal?: AbortSignal): Promise<ProductoCatalogo[]> {
  const texto = termino.trim();
  if (texto.length < 2) return [];

  const params = new URLSearchParams({
    search_terms: texto,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '25',
    fields: 'code,product_name,product_name_es,brands,image_front_small_url,quantity',
    lc: 'es',
  });

  const respuesta = await fetch(`${URL_BUSQUEDA}?${params.toString()}`, { signal: senal });
  if (!respuesta.ok) throw new Error(`Open Food Facts respondió ${respuesta.status}`);
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
  return resultados;
}
