-- Catálogo de productos: datos opcionales que llegan de Open Food Facts o que escribe el usuario.
alter table public.productos
  add column codigo_barras text check (codigo_barras is null or codigo_barras ~ '^[0-9]{6,14}$'),
  add column marca text check (marca is null or length(trim(marca)) > 0),
  add column imagen_url text check (imagen_url is null or imagen_url ~ '^https://'),
  add column precio numeric(12, 2) check (precio is null or precio >= 0);
