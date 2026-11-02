-- Esquema inicial de DailyLife.
--
-- Modelo de seguridad:
--   * Solo existen dos cuentas (el registro público está desactivado en Supabase Auth).
--   * Los datos son compartidos: ambos usuarios ven y editan todos los registros.
--   * RLS está activado en todas las tablas. Solo el rol "authenticated" tiene acceso;
--     el rol "anon" (sin sesión) no puede leer ni escribir nada.

-- ---------------------------------------------------------------------------
-- Gimnasio: rutinas de musculación
-- ---------------------------------------------------------------------------
create table public.rutinas (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (length(trim(nombre)) > 0),
  clasificacion   text not null check (clasificacion in ('masculina', 'femenina')),
  estado          text not null default 'borrador'
                  check (estado in ('borrador', 'activa', 'archivada')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) default auth.uid()
);

create index rutinas_clasificacion_estado_idx on public.rutinas (clasificacion, estado);

-- ---------------------------------------------------------------------------
-- Go To Work: catálogo de estados de trabajo (los que se marcan con un toque)
-- ---------------------------------------------------------------------------
create table public.estados_trabajo (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) > 0),
  orden       integer not null default 0,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) default auth.uid()
);

-- ---------------------------------------------------------------------------
-- Go To Work: registros (cada vez que se marca un estado)
-- ---------------------------------------------------------------------------
create table public.registros_trabajo (
  id           uuid primary key default gen_random_uuid(),
  -- restrict: no se puede borrar un estado que ya tiene historial.
  estado_id    uuid not null references public.estados_trabajo (id) on delete restrict,
  marcado_en   timestamptz not null default now(),
  created_by   uuid references auth.users (id) default auth.uid()
);

create index registros_trabajo_marcado_en_idx on public.registros_trabajo (marcado_en);

-- ---------------------------------------------------------------------------
-- Compras del mes: gastos
-- ---------------------------------------------------------------------------
create table public.gastos (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null,
  importe      numeric(12, 2) not null check (importe >= 0),
  categoria    text not null check (length(trim(categoria)) > 0),
  descripcion  text,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) default auth.uid()
);

create index gastos_fecha_idx on public.gastos (fecha);

-- ---------------------------------------------------------------------------
-- Permisos de tabla: explícitos, sin depender de los valores por defecto de Supabase.
-- ---------------------------------------------------------------------------
revoke all on public.rutinas, public.estados_trabajo, public.registros_trabajo, public.gastos
  from anon;
grant select, insert, update, delete on public.rutinas, public.estados_trabajo,
  public.registros_trabajo, public.gastos to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: solo usuarios autenticados, con acceso a todos los datos.
-- ---------------------------------------------------------------------------
alter table public.rutinas            enable row level security;
alter table public.estados_trabajo    enable row level security;
alter table public.registros_trabajo  enable row level security;
alter table public.gastos             enable row level security;

create policy "rutinas: lectura autenticada" on public.rutinas
  for select to authenticated using (true);
create policy "rutinas: escritura autenticada" on public.rutinas
  for insert to authenticated with check (true);
create policy "rutinas: edición autenticada" on public.rutinas
  for update to authenticated using (true) with check (true);
create policy "rutinas: borrado autenticado" on public.rutinas
  for delete to authenticated using (true);

create policy "estados_trabajo: lectura autenticada" on public.estados_trabajo
  for select to authenticated using (true);
create policy "estados_trabajo: escritura autenticada" on public.estados_trabajo
  for insert to authenticated with check (true);
create policy "estados_trabajo: edición autenticada" on public.estados_trabajo
  for update to authenticated using (true) with check (true);
create policy "estados_trabajo: borrado autenticado" on public.estados_trabajo
  for delete to authenticated using (true);

create policy "registros_trabajo: lectura autenticada" on public.registros_trabajo
  for select to authenticated using (true);
create policy "registros_trabajo: escritura autenticada" on public.registros_trabajo
  for insert to authenticated with check (true);
create policy "registros_trabajo: edición autenticada" on public.registros_trabajo
  for update to authenticated using (true) with check (true);
create policy "registros_trabajo: borrado autenticado" on public.registros_trabajo
  for delete to authenticated using (true);

create policy "gastos: lectura autenticada" on public.gastos
  for select to authenticated using (true);
create policy "gastos: escritura autenticada" on public.gastos
  for insert to authenticated with check (true);
create policy "gastos: edición autenticada" on public.gastos
  for update to authenticated using (true) with check (true);
create policy "gastos: borrado autenticado" on public.gastos
  for delete to authenticated using (true);
