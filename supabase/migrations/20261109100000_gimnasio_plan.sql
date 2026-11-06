-- Gimnasio por días: nombre de cada miembro, plan semanal por persona y marcado de ejercicios por día.
-- Cada miembro solo puede cambiar su propio plan y sus propias marcas; todos ven las del grupo.

-- 1) Nombre visible de cada miembro (lo edita él mismo).
alter table public.miembros_grupo
  add column nombre text check (nombre is null or (length(trim(nombre)) > 0 and length(nombre) <= 40));

grant update (nombre) on public.miembros_grupo to authenticated;
create policy "miembros: editar mi propio nombre" on public.miembros_grupo
  for update to authenticated
  using (user_id = auth.uid() and public.es_miembro(grupo_id))
  with check (user_id = auth.uid() and public.es_miembro(grupo_id));

-- 2) Ejercicios: clave compuesta por grupo para poder referenciarlos de forma segura.
alter table public.ejercicios_rutina add constraint ejercicios_rutina_grupo_id_key unique (grupo_id, id);

-- 3) Plan semanal: qué rutina hace cada persona cada día (0 = lunes ... 6 = domingo).
--    Sin rutina (rutina_id null) = día de descanso.
create table public.plan_semanal (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid not null references public.grupos (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  dia         smallint not null check (dia between 0 and 6),
  rutina_id   uuid,
  updated_at  timestamptz not null default now(),
  unique (grupo_id, user_id, dia),
  foreign key (grupo_id, rutina_id) references public.rutinas (grupo_id, id) on delete cascade
);

-- 4) Marcas: qué ejercicio ha hecho cada persona en cada fecha.
create table public.sesion_ejercicios (
  id            uuid primary key default gen_random_uuid(),
  grupo_id      uuid not null references public.grupos (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  fecha         date not null,
  ejercicio_id  uuid not null,
  hecho_en      timestamptz not null default now(),
  unique (grupo_id, user_id, fecha, ejercicio_id),
  foreign key (grupo_id, ejercicio_id) references public.ejercicios_rutina (grupo_id, id) on delete cascade
);

create index sesion_ejercicios_grupo_fecha_idx on public.sesion_ejercicios (grupo_id, fecha);

-- Permisos y RLS
revoke all on public.plan_semanal, public.sesion_ejercicios from anon;
grant select, insert, update, delete on public.plan_semanal, public.sesion_ejercicios to authenticated;

alter table public.plan_semanal enable row level security;
alter table public.sesion_ejercicios enable row level security;

create policy "plan: lectura de miembros" on public.plan_semanal
  for select to authenticated using (public.es_miembro(grupo_id));
create policy "plan: escribir solo lo propio" on public.plan_semanal
  for all to authenticated
  using (user_id = auth.uid() and public.es_miembro(grupo_id))
  with check (user_id = auth.uid() and public.es_miembro(grupo_id));

create policy "marcas: lectura de miembros" on public.sesion_ejercicios
  for select to authenticated using (public.es_miembro(grupo_id));
create policy "marcas: escribir solo las propias" on public.sesion_ejercicios
  for all to authenticated
  using (user_id = auth.uid() and public.es_miembro(grupo_id))
  with check (user_id = auth.uid() and public.es_miembro(grupo_id));

-- Realtime (idempotente)
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['plan_semanal', 'sesion_ejercicios', 'miembros_grupo'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
