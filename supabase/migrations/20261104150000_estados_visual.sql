-- Aspecto de los estados: icono (emoji) y color (hex). Si son null, la app calcula un valor por defecto.
alter table public.estados_trabajo
  add column icono text check (icono is null or length(icono) <= 8),
  add column color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');
