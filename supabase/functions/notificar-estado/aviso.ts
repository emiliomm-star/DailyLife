/** Lógica pura del aviso de cambio de estado (sin base de datos ni red, para poder probarla). */

export type Miembro = { user_id: string; nombre: string | null };

export type Aviso = { title: string; body: string; url: string };

/** Texto del aviso: "Sindy cambió a Ya llegué al trabajo". */
export function construirAviso(nombreActor: string | null, nombreEstado: string | null): Aviso {
  const quien = nombreActor?.trim() || 'Alguien del grupo';
  const estado = nombreEstado?.trim() || 'otro estado';
  return { title: 'DailyLife', body: `${quien} cambió a ${estado}`, url: '/estados' };
}

/**
 * Personas a las que avisar: miembros del grupo distintos de quien cambia de estado,
 * excepto quienes tienen oculto el módulo 'estados' de esa persona.
 */
export function destinatariosDelAviso(
  miembros: ReadonlyArray<Miembro>,
  actorId: string,
  ocultadoA: ReadonlySet<string>,
): string[] {
  return miembros
    .filter((m) => m.user_id !== actorId && !ocultadoA.has(m.user_id))
    .map((m) => m.user_id);
}
