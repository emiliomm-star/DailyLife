-- Compras del mes: categorías, lista de productos (pendientes y comprados), historial de compras e ingresos.
-- Modelo: todo pertenece a un grupo y lo ven y editan sus miembros (mismas políticas que el resto).

-- ---------------------------------------------------------------------------
-- Categorías de gasto
-- ---------------------------------------------------------------------------
create table public.categorias (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid not null references public.grupos (id) on delete cascade,
  nombre      text not null check (length(trim(nombre)) > 0),
  icono       text check (icono is null or length(icono) <= 8),
  color       text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  orden       integer not null default 0,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) default auth.uid(),
  unique (grupo_id, id),
  unique (grupo_id, nombre)
);

-- ---------------------------------------------------------------------------
-- Productos de la lista (pendientes o comprados), dentro de una categoría
-- ---------------------------------------------------------------------------
create table public.productos (
  id           uuid primary key default gen_random_uuid(),
  grupo_id     uuid not null references public.grupos (id) on delete cascade,
  categoria_id uuid not null,
  nombre       text not null check (length(trim(nombre)) > 0),
  comprado     boolean not null default false,
  comprado_en  timestamptz,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) default auth.uid(),
  foreign key (grupo_id, categoria_id) references public.categorias (grupo_id, id) on delete cascade,
  unique (grupo_id, id),
  unique (grupo_id, categoria_id, nombre),
  check (comprado = (comprado_en is not null))
);

create index productos_categoria_estado_idx on public.productos (grupo_id, categoria_id, comprado);

-- ---------------------------------------------------------------------------
-- Gastos: ahora apuntan a una categoría real
-- ---------------------------------------------------------------------------
-- La tabla no tiene datos todavía (la app aún no la usa), así que el cambio es seguro.
alter table public.gastos drop column categoria;
alter table public.gastos add column categoria_id uuid;
alter table public.gastos
  add constraint gastos_categoria_fk foreign key (grupo_id, categoria_id)
  references public.categorias (grupo_id, id) on delete restrict;
alter table public.gastos alter column categoria_id set not null;

-- ---------------------------------------------------------------------------
-- Historial de compras: cada vez que un producto se marca como comprado
-- ---------------------------------------------------------------------------
create table public.compras (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid not null references public.grupos (id) on delete cascade,
  producto_id uuid not null,
  gasto_id    uuid references public.gastos (id) on delete set null,
  comprado_en timestamptz not null default now(),
  created_by  uuid references auth.users (id) default auth.uid(),
  foreign key (grupo_id, producto_id) references public.productos (grupo_id, id) on delete cascade
);

create index compras_grupo_fecha_idx on public.compras (grupo_id, comprado_en);

-- ---------------------------------------------------------------------------
-- Ingresos mensuales (para calcular el ahorro)
-- ---------------------------------------------------------------------------
create table public.ingresos (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid not null references public.grupos (id) on delete cascade,
  mes         date not null check (mes = date_trunc('month', mes)::date),
  importe     numeric(12, 2) not null check (importe >= 0),
  concepto    text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) default auth.uid()
);

create index ingresos_grupo_mes_idx on public.ingresos (grupo_id, mes);

-- ---------------------------------------------------------------------------
-- Permisos y RLS
-- ---------------------------------------------------------------------------
revoke all on public.categorias, public.productos, public.compras, public.ingresos from anon;
grant select, insert, update, delete on public.categorias, public.productos, public.compras, public.ingresos
  to authenticated;

alter table public.categorias enable row level security;
alter table public.productos  enable row level security;
alter table public.compras    enable row level security;
alter table public.ingresos   enable row level security;

create policy "categorias: acceso de miembros" on public.categorias
  for all to authenticated
  using (public.es_miembro(grupo_id)) with check (public.es_miembro(grupo_id));
create policy "productos: acceso de miembros" on public.productos
  for all to authenticated
  using (public.es_miembro(grupo_id)) with check (public.es_miembro(grupo_id));
create policy "compras: acceso de miembros" on public.compras
  for all to authenticated
  using (public.es_miembro(grupo_id)) with check (public.es_miembro(grupo_id));
create policy "ingresos: acceso de miembros" on public.ingresos
  for all to authenticated
  using (public.es_miembro(grupo_id)) with check (public.es_miembro(grupo_id));

-- ---------------------------------------------------------------------------
-- Realtime: los cambios llegan a todos los miembros (idempotente).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['categorias', 'productos', 'compras', 'gastos', 'ingresos'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
