import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type NombreIcono = ComponentProps<typeof Ionicons>['name'];

/**
 * Iconos seleccionables. La clave es la que se guarda en la base de datos (máx. 8 caracteres);
 * el nombre es el icono vectorial de Ionicons. Cada icono aparece una sola vez.
 */
export const ICONOS: ReadonlyArray<{ clave: string; nombre: NombreIcono; etiqueta: string }> = [
  { clave: 'metro', nombre: 'train', etiqueta: 'Metro' },
  { clave: 'bus', nombre: 'bus', etiqueta: 'Bus' },
  { clave: 'coche', nombre: 'car', etiqueta: 'Coche' },
  { clave: 'bici', nombre: 'bicycle', etiqueta: 'Bici' },
  { clave: 'andar', nombre: 'walk', etiqueta: 'Andar' },
  { clave: 'trabajo', nombre: 'briefcase', etiqueta: 'Trabajo' },
  { clave: 'cafe', nombre: 'cafe', etiqueta: 'Café' },
  { clave: 'comida', nombre: 'restaurant', etiqueta: 'Comida' },
  { clave: 'salida', nombre: 'log-out', etiqueta: 'Salida' },
  { clave: 'casa', nombre: 'home', etiqueta: 'Casa' },
  { clave: 'gym', nombre: 'barbell', etiqueta: 'Gimnasio' },
  { clave: 'compra', nombre: 'cart', etiqueta: 'Compra' },
  { clave: 'libro', nombre: 'book', etiqueta: 'Estudio' },
  { clave: 'dormir', nombre: 'bed', etiqueta: 'Dormir' },
  { clave: 'sol', nombre: 'sunny', etiqueta: 'Mañana' },
  { clave: 'luna', nombre: 'moon', etiqueta: 'Noche' },
  { clave: 'medico', nombre: 'medkit', etiqueta: 'Salud' },
  { clave: 'musica', nombre: 'musical-notes', etiqueta: 'Música' },
  { clave: 'estrella', nombre: 'star', etiqueta: 'Destacado' },
  { clave: 'corazon', nombre: 'heart', etiqueta: 'Favorito' },
  { clave: 'ropa', nombre: 'shirt', etiqueta: 'Ropa' },
  { clave: 'tech', nombre: 'desktop', etiqueta: 'Tecnología' },
  { clave: 'mascota', nombre: 'paw', etiqueta: 'Mascota' },
  { clave: 'regalo', nombre: 'gift', etiqueta: 'Regalo' },
];

/** Paleta de colores vivos para los estados. */
export const PALETA = ['#FF6B6B', '#FFB347', '#FFD93D', '#6BCB77', '#4D96FF', '#9D7CFF', '#FF8FC7', '#2EC4B6'] as const;

const NOMBRE_POR_CLAVE = new Map(ICONOS.map((icono) => [icono.clave, icono.nombre]));

/** Nombre del icono vectorial para una clave, o null si la clave no es de la lista (p. ej. un emoji antiguo). */
export function nombreIcono(clave: string): NombreIcono | null {
  return NOMBRE_POR_CLAVE.get(clave) ?? null;
}

// Sugerencias según el nombre del estado: se usan si el estado no tiene icono ni color guardados.
const SUGERIDOS: ReadonlyArray<readonly [RegExp, string, string]> = [
  [/metro/i, 'metro', '#4D96FF'],
  [/bus/i, 'bus', '#FF6B6B'],
  [/coche|taxi/i, 'coche', '#9D7CFF'],
  [/bici/i, 'bici', '#2EC4B6'],
  [/desayun|cafe|café/i, 'cafe', '#FFB347'],
  [/comida|almuerz|cena/i, 'comida', '#FF8FC7'],
  [/sal[ií]/i, 'salida', '#FFD93D'],
  [/trabaj|llegu/i, 'trabajo', '#4D96FF'],
  [/casa/i, 'casa', '#6BCB77'],
  [/gym|gimnasio|pesas/i, 'gym', '#FF6B6B'],
  [/compr/i, 'compra', '#FFB347'],
];

export type VisualEstado = { icono: string; color: string };

/** Icono y color del estado: los guardados, o los sugeridos por su nombre, o uno de la paleta. */
export function visualDe(estado: {
  nombre: string;
  orden: number;
  icono?: string | null;
  color?: string | null;
}): VisualEstado {
  const sugerido = SUGERIDOS.find(([patron]) => patron.test(estado.nombre));
  return {
    icono: estado.icono ?? sugerido?.[1] ?? 'estrella',
    color: estado.color ?? sugerido?.[2] ?? PALETA[estado.orden % PALETA.length],
  };
}

/** Texto oscuro sobre colores claros y blanco sobre los oscuros (luminancia relativa). */
export function colorDeTexto(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.62 ? '#1A1A1A' : '#FFFFFF';
}

// Sugerencias para las categorías de compra según su nombre.
const SUGERIDOS_CATEGORIA: ReadonlyArray<readonly [RegExp, string, string]> = [
  [/super|aliment|compra/i, 'compra', '#4D96FF'],
  [/transporte|gasolina|coche/i, 'coche', '#FFB347'],
  [/casa|hogar|alquiler|luz|agua|gas/i, 'casa', '#6BCB77'],
  [/salud|farmacia|medic/i, 'medico', '#FF6B6B'],
  [/ocio|cine|salida/i, 'musica', '#9D7CFF'],
  [/ropa/i, 'ropa', '#FF8FC7'],
  [/tecno|movil|móvil|tech/i, 'tech', '#2EC4B6'],
  [/mascota/i, 'mascota', '#FFD93D'],
  [/regalo/i, 'regalo', '#FF6B6B'],
];

/** Icono y color sugeridos para una categoría nueva, según su nombre. */
export function visualCategoria(nombre: string, orden: number): VisualEstado {
  const sugerido = SUGERIDOS_CATEGORIA.find(([patron]) => patron.test(nombre));
  return {
    icono: sugerido?.[1] ?? 'estrella',
    color: sugerido?.[2] ?? PALETA[orden % PALETA.length],
  };
}
