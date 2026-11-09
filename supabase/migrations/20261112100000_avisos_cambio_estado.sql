-- Avisos push cuando alguien cambia de estado.
-- 1) Cada dispositivo de una persona guarda su suscripción push (endpoint y claves) en su grupo.
-- 2) Cada registro nuevo de estado llama a la función Edge "notificar-estado" (vía pg_net).
--    La función decide a quién avisar según la privacidad del módulo 'estados' y envía los avisos.
-- Configuración (fuera de este archivo, no se guarda en el repositorio):
--   alter database postgres set app.notificar_url = 'https://<proyecto>.supabase.co/functions/v1/notificar-estado';
--   alter database postgres set app.notificar_secreto = '<mismo valor que NOTIFICAR_SECRETO en la función>';
-- Mientras no estén configuradas, el registro se guarda igual y no se envía ningún aviso.

create extension if not exists pg_net;

-- 1) Suscripciones push
create table public.suscripciones_push (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid not null references public.grupos (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  creado_en   timestamptz not null default now()
);

create index suscripciones_push_grupo_usuario_idx on public.suscripciones_push (grupo_id, user_id);

revoke all on public.suscripciones_push from anon;
grant select, insert, update, delete on public.suscripciones_push to authenticated;
alter table public.suscripciones_push enable row level security;

create policy "suscripciones: ver propias" on public.suscripciones_push
  for select to authenticated using (user_id = auth.uid());
create policy "suscripciones: crear propias" on public.suscripciones_push
  for insert to authenticated with check (user_id = auth.uid() and public.es_miembro(grupo_id));
create policy "suscripciones: editar propias" on public.suscripciones_push
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.es_miembro(grupo_id));
create policy "suscripciones: borrar propias" on public.suscripciones_push
  for delete to authenticated using (user_id = auth.uid());

-- 2) Aviso al registrar un cambio de estado. Nunca impide guardar el cambio.
create function public.avisar_cambio_estado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := nullif(current_setting('app.notificar_url', true), '');
  v_secreto text := nullif(current_setting('app.notificar_secreto', true), '');
begin
  if v_url is null or v_secreto is null then
    return new;
  end if;

  begin
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('registro_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notificar-secreto', v_secreto)
    );
  exception when others then
    raise warning 'No se pudo enviar el aviso de estado: %', sqlerrm;
  end;

  return new;
end;
$$;

revoke execute on function public.avisar_cambio_estado() from public, anon, authenticated;

create trigger registros_trabajo_avisar_cambio
  after insert on public.registros_trabajo
  for each row execute function public.avisar_cambio_estado();
