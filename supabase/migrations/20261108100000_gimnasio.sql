-- Gimnasio: ejercicios de cada rutina (series, repeticiones, peso y descanso son opcionales).
-- Los ejercicios pueden venir del catálogo de wger (wger_id, categoría, músculos e imagen) o ser propios.

alter table public.rutinas add constraint rutinas_grupo_id_key unique (grupo_id, id);

create table public.ejercicios_rutina (
  id              uuid primary key default gen_random_uuid(),
  grupo_id        uuid not null references public.grupos (id) on delete cascade,
  rutina_id       uuid not null,
  nombre          text not null check (length(trim(nombre)) > 0),
  orden           integer not null default 0,
  series          integer check (series is null or series > 0),
  repeticiones    text check (repeticiones is null or length(trim(repeticiones)) > 0),
  peso_kg         numeric(6, 2) check (peso_kg is null or peso_kg >= 0),
  descanso_seg    integer check (descanso_seg is null or descanso_seg >= 0),
  wger_id         integer check (wger_id is null or wger_id > 0),
  categoria       text,
  musculos        text,
  imagen_url      text check (imagen_url is null or imagen_url ~ '^https://'),
  notas           text,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) default auth.uid(),
  foreign key (grupo_id, rutina_id) references public.rutinas (grupo_id, id) on delete cascade
);

create index ejercicios_rutina_rutina_orden_idx on public.ejercicios_rutina (grupo_id, rutina_id, orden);

revoke all on public.ejercicios_rutina from anon;
grant select, insert, update, delete on public.ejercicios_rutina to authenticated;

alter table public.ejercicios_rutina enable row level security;
create policy "ejercicios_rutina: acceso de miembros" on public.ejercicios_rutina
  for all to authenticated
  using (public.es_miembro(grupo_id)) with check (public.es_miembro(grupo_id));

-- Realtime: rutinas y ejercicios se sincronizan con el grupo (idempotente).
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['rutinas', 'ejercicios_rutina'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
