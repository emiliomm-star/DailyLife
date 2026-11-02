-- Esquema inicial de DailyLife.
--
-- Modelo de seguridad:
--   * Un grupo es el espacio compartido de la app. Todos sus miembros ven y editan los mismos datos.
--   * Para entrar a un grupo se usa su código de invitación (función unirse_a_grupo).
--   * Sin ser miembro de un grupo no se ve ningún dato de ese grupo.
--   * RLS está activado en todas las tablas. El rol "anon" (sin sesión) no tiene acceso a nada.

-- ---------------------------------------------------------------------------
-- Grupos y miembros
-- ---------------------------------------------------------------------------
create table public.grupos (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null check (length(trim(nombre)) > 0),
  codigo_invitacion text not null unique
                    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id) default auth.uid()
);

create table public.miembros_grupo (
  grupo_id   uuid not null references public.grupos (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  rol        text not null default 'miembro' check (rol in ('admin', 'miembro')),
  unido_en   timestamptz not null default now(),
  primary key (grupo_id, user_id)
);

create index miembros_grupo_user_id_idx on public.miembros_grupo (user_id);

-- Comprueba si el usuario actual es miembro del grupo.
-- security definer: evita la recursión de RLS al consultar miembros_grupo desde sus propias políticas.
create function public.es_miembro(p_grupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros_grupo m
    where m.grupo_id = p_grupo and m.user_id = auth.uid()
  );
$$;

-- Crea un grupo nuevo y añade al usuario actual como administrador.
create function public.crear_grupo(p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para crear un grupo';
  end if;

  insert into public.grupos (nombre) values (trim(p_nombre))
  returning id into v_grupo;

  insert into public.miembros_grupo (grupo_id, user_id, rol)
  values (v_grupo, auth.uid(), 'admin');

  return v_grupo;
end;
$$;

-- Une al usuario actual a un grupo con su código de invitación.
create function public.unirse_a_grupo(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para unirte a un grupo';
  end if;

  select g.id into v_grupo
  from public.grupos g
  where g.codigo_invitacion = upper(trim(p_codigo));

  if v_grupo is null then
    raise exception 'Código de invitación no válido';
  end if;

  insert into public.miembros_grupo (grupo_id, user_id)
  values (v_grupo, auth.uid())
  on conflict do nothing;

  return v_grupo;
end;
$$;

-- Genera un código de invitación nuevo. Solo lo puede hacer un administrador del grupo.
create function public.regenerar_codigo_invitacion(p_grupo uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
begin
  if not exists (
    select 1 from public.miembros_grupo m
    where m.grupo_id = p_grupo and m.user_id = auth.uid() and m.rol = 'admin'
  ) then
    raise exception 'Solo un administrador del grupo puede regenerar el código';
  end if;

  update public.grupos g
  set codigo_invitacion = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  where g.id = p_grupo
  returning g.codigo_invitacion into v_codigo;

  return v_codigo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Gimnasio: rutinas de musculación
-- ---------------------------------------------------------------------------
create table public.rutinas (
  id              uuid primary key default gen_random_uuid(),
  grupo_id        uuid not null references public.grupos (id) on delete cascade,
  nombre          text not null check (length(trim(nombre)) > 0),
  clasificacion   text not null check (clasificacion in ('masculina', 'femenina')),
  estado          text not null default 'borrador'
                  check (estado in ('borrador', 'activa', 'archivada')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) default auth.uid()
);

create index rutinas_grupo_clasificacion_estado_idx
  on public.rutinas (grupo_id, clasificacion, estado);

-- ---------------------------------------------------------------------------
-- Go To Work: catálogo de estados de trabajo (los que se marcan con un toque)
-- ---------------------------------------------------------------------------
create table public.estados_trabajo (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid not null references public.grupos (id) on delete cascade,
  nombre      text not null check (length(trim(nombre)) > 0),
  orden       integer not null default 0,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) default auth.uid(),
  -- Necesario para que un registro solo pueda apuntar a un estado de su mismo grupo.
  unique (grupo_id, id),
  unique (grupo_id, nombre)
);

-- ---------------------------------------------------------------------------
-- Go To Work: registros (cada vez que se marca un estado)
-- ---------------------------------------------------------------------------
create table public.registros_trabajo (
  id           uuid primary key default gen_random_uuid(),
  grupo_id     uuid not null references public.grupos (id) on delete cascade,
  estado_id    uuid not null,
  marcado_en   timestamptz not null default now(),
  created_by   uuid references auth.users (id) default auth.uid(),
  -- restrict: no se puede borrar un estado que ya tiene historial.
  foreign key (grupo_id, estado_id)
    references public.estados_trabajo (grupo_id, id) on delete restrict
);

create index registros_trabajo_grupo_marcado_en_idx
  on public.registros_trabajo (grupo_id, marcado_en);

-- ---------------------------------------------------------------------------
-- Compras del mes: gastos
-- ---------------------------------------------------------------------------
create table public.gastos (
  id           uuid primary key default gen_random_uuid(),
  grupo_id     uuid not null references public.grupos (id) on delete cascade,
  fecha        date not null,
  importe      numeric(12, 2) not null check (importe >= 0),
  categoria    text not null check (length(trim(categoria)) > 0),
  descripcion  text,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) default auth.uid()
);

create index gastos_grupo_fecha_idx on public.gastos (grupo_id, fecha);

-- ---------------------------------------------------------------------------
-- Permisos de tabla: explícitos, sin depender de los valores por defecto de Supabase.
-- ---------------------------------------------------------------------------
revoke all on public.grupos, public.miembros_grupo, public.rutinas,
  public.estados_trabajo, public.registros_trabajo, public.gastos
  from anon;

-- Los grupos y sus miembros solo se leen directamente; las altas se hacen con las funciones.
grant select on public.grupos, public.miembros_grupo to authenticated;

grant select, insert, update, delete on public.rutinas, public.estados_trabajo,
  public.registros_trabajo, public.gastos to authenticated;

-- Funciones: por defecto PostgreSQL las concede a PUBLIC, así que se restringen.
revoke execute on function public.es_miembro(uuid), public.crear_grupo(text),
  public.unirse_a_grupo(text), public.regenerar_codigo_invitacion(uuid)
  from public, anon;
grant execute on function public.es_miembro(uuid), public.crear_grupo(text),
  public.unirse_a_grupo(text), public.regenerar_codigo_invitacion(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.grupos              enable row level security;
alter table public.miembros_grupo      enable row level security;
alter table public.rutinas             enable row level security;
alter table public.estados_trabajo     enable row level security;
alter table public.registros_trabajo   enable row level security;
alter table public.gastos              enable row level security;

-- Grupos y miembros: solo se ven los del propio usuario. Sin políticas de escritura.
create policy "grupos: lectura de mis grupos" on public.grupos
  for select to authenticated using (public.es_miembro(id));

create policy "miembros: lectura de mis grupos" on public.miembros_grupo
  for select to authenticated using (public.es_miembro(grupo_id));

-- Datos de la app: cualquier miembro del grupo puede leer, crear, editar y borrar.
create policy "rutinas: acceso de miembros" on public.rutinas
  for all to authenticated
  using (public.es_miembro(grupo_id)) with check (public.es_miembro(grupo_id));

create policy "estados_trabajo: acceso de miembros" on public.estados_trabajo
  for all to authenticated
  using (public.es_miembro(grupo_id)) with check (public.es_miembro(grupo_id));

create policy "registros_trabajo: acceso de miembros" on public.registros_trabajo
  for all to authenticated
  using (public.es_miembro(grupo_id)) with check (public.es_miembro(grupo_id));

create policy "gastos: acceso de miembros" on public.gastos
  for all to authenticated
  using (public.es_miembro(grupo_id)) with check (public.es_miembro(grupo_id));
