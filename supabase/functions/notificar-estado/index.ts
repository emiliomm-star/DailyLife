// Supabase Edge Function: envía un aviso push cuando alguien del grupo cambia de estado.
// La llama el trigger de la base de datos (migración 20261112100000) con el id del registro.
// Se despliega con --no-verify-jwt: la autorización es el secreto compartido NOTIFICAR_SECRETO.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import webpush from 'npm:web-push@3.6.7';

import { construirAviso, destinatariosDelAviso, type Miembro } from './aviso.ts';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const respuesta = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: JSON_HEADERS });

Deno.serve(async (peticion) => {
  if (peticion.method !== 'POST') {
    return respuesta({ error: 'Método no permitido' }, 405);
  }

  const secretoEsperado = Deno.env.get('NOTIFICAR_SECRETO');
  if (!secretoEsperado || peticion.headers.get('x-notificar-secreto') !== secretoEsperado) {
    return respuesta({ error: 'No autorizado' }, 401);
  }

  const cuerpo = await peticion.json().catch(() => null);
  const registroId = cuerpo?.registro_id;
  if (typeof registroId !== 'string') {
    return respuesta({ error: 'Falta registro_id' }, 400);
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: registro, error: errorRegistro } = await db
    .from('registros_trabajo')
    .select('grupo_id, created_by, estado_id')
    .eq('id', registroId)
    .maybeSingle();
  if (errorRegistro) return respuesta({ error: errorRegistro.message }, 500);
  if (!registro) return respuesta({ error: 'Registro no encontrado' }, 404);

  const [{ data: estado }, { data: miembros }, { data: ocultos }] = await Promise.all([
    db.from('estados_trabajo').select('nombre').eq('id', registro.estado_id).maybeSingle(),
    db.from('miembros_grupo').select('user_id, nombre').eq('grupo_id', registro.grupo_id),
    db
      .from('ocultamientos')
      .select('viewer_id')
      .eq('grupo_id', registro.grupo_id)
      .eq('owner_id', registro.created_by)
      .eq('modulo', 'estados'),
  ]);

  const listaMiembros = (miembros ?? []) as Miembro[];
  const actor = listaMiembros.find((m) => m.user_id === registro.created_by);
  const ocultadoA = new Set((ocultos ?? []).map((o) => o.viewer_id as string));
  const destinatarios = destinatariosDelAviso(listaMiembros, registro.created_by, ocultadoA);
  if (destinatarios.length === 0) return respuesta({ enviados: 0, fallidos: 0, caducadas: 0 });

  const { data: suscripciones, error: errorSuscripciones } = await db
    .from('suscripciones_push')
    .select('id, endpoint, p256dh, auth')
    .eq('grupo_id', registro.grupo_id)
    .in('user_id', destinatarios);
  if (errorSuscripciones) return respuesta({ error: errorSuscripciones.message }, 500);

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );
  const carga = JSON.stringify(construirAviso(actor?.nombre ?? null, estado?.nombre ?? null));

  const envios = await Promise.allSettled(
    (suscripciones ?? []).map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, {
        TTL: 3600,
      }),
    ),
  );

  // Las suscripciones que el navegador ya no reconoce (404/410) se borran para no volver a intentarlo.
  const caducadas: string[] = [];
  let enviados = 0;
  envios.forEach((resultado, indice) => {
    if (resultado.status === 'fulfilled') {
      enviados++;
      return;
    }
    const codigo = (resultado.reason as { statusCode?: number })?.statusCode;
    if (codigo === 404 || codigo === 410) caducadas.push(suscripciones![indice].id as string);
  });
  if (caducadas.length > 0) {
    await db.from('suscripciones_push').delete().in('id', caducadas);
  }

  return respuesta({
    enviados,
    fallidos: envios.length - enviados,
    caducadas: caducadas.length,
  });
});
