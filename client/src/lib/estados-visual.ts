/** Paleta de colores vivos para los estados. Los hex tienen contraste suficiente con el texto que llevan encima. */
export const PALETA = ['#FF6B6B', '#FFB347', '#FFD93D', '#6BCB77', '#4D96FF', '#9D7CFF', '#FF8FC7', '#2EC4B6'] as const;

/** Iconos seleccionables (emojis: se ven bien en iOS y en la web, sin cargar librerías). */
export const ICONOS = ['🚇', '🚌', '🚗', '🏢', '☕', '🍳', '🚪', '🏠', '💪', '🛒', '💼', '🎯', '⭐', '🌙', '📚', '🧘'] as const;

const POR_PALABRA: ReadonlyArray<readonly [RegExp, string, string]> = [
  [/metro/i, '🚇', '#4D96FF'],
  [/bus/i, '🚌', '#FF6B6B'],
  [/coche|taxi/i, '🚗', '#9D7CFF'],
  [/trabaj|llegu/i, '🏢', '#4D96FF'],
  [/desayun|comida|almuerz|cen/i, '☕', '#FFB347'],
  [/sal[ií]/i, '🚪', '#FFD93D'],
  [/casa/i, '🏠', '#6BCB77'],
];

export type VisualEstado = { icono: string; color: string };

/** Icono y color del estado: los guardados, o los sugeridos por su nombre, o uno de la paleta. */
export function visualDe(estado: {
  nombre: string;
  orden: number;
  icono?: string | null;
  color?: string | null;
}): VisualEstado {
  const sugerido = POR_PALABRA.find(([patron]) => patron.test(estado.nombre));
  return {
    icono: estado.icono ?? sugerido?.[1] ?? '⭐',
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
