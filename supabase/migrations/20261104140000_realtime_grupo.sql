-- Realtime: la app recibe los cambios de estados y registros del grupo y se actualiza sola.
-- Supabase Realtime respeta RLS: cada usuario solo recibe cambios de su propio grupo.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'registros_trabajo') then
      alter publication supabase_realtime add table public.registros_trabajo;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'estados_trabajo') then
      alter publication supabase_realtime add table public.estados_trabajo;
    end if;
  end if;
end $$;
