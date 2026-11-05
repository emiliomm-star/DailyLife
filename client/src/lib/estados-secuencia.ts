import type { EstadoTrabajo } from '@/lib/go-to-work';

/**
 * Estado siguiente y anterior de la secuencia, igual que en la base de datos:
 * siguiente = el de orden inmediatamente superior (o el primero al dar la vuelta);
 * anterior = el de orden inmediatamente inferior (o el último al dar la vuelta).
 * Sin ningún estado registrado hoy, el siguiente es el primero y el anterior el último.
 */
export function vecinosDeEstado(
  activos: readonly EstadoTrabajo[],
  ultimo: Pick<EstadoTrabajo, 'orden'> | null,
): { siguiente: EstadoTrabajo | null; anterior: EstadoTrabajo | null } {
  const secuencia = [...activos].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  if (secuencia.length === 0) return { siguiente: null, anterior: null };

  if (!ultimo) {
    return { siguiente: secuencia[0], anterior: secuencia[secuencia.length - 1] };
  }

  const siguiente = secuencia.find((e) => e.orden > ultimo.orden) ?? secuencia[0];
  const anterior = [...secuencia].reverse().find((e) => e.orden < ultimo.orden) ?? secuencia[secuencia.length - 1];
  return { siguiente, anterior };
}
