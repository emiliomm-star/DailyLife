-- Go To Work: los estados se pueden "desactivar" en lugar de borrarse.
-- Un estado con historial no puede borrarse (on delete restrict), así que al quitarlo de la lista
-- se marca como inactivo: deja de aparecer en los botones, pero su historial se conserva.

alter table public.estados_trabajo
  add column activo boolean not null default true;

create index estados_trabajo_grupo_activo_orden_idx
  on public.estados_trabajo (grupo_id, activo, orden);
