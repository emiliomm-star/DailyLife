import { supabase } from '@/lib/supabase';

/**
 * Avisos push de cambios de estado (solo web: PWA). El navegador crea la suscripción y la guardamos
 * en suscripciones_push; la función "notificar-estado" usa esas suscripciones para enviar los avisos.
 */

const CLAVE_PUBLICA = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/** ¿Puede este navegador recibir avisos push (y está configurada la clave del servidor)? */
export function avisosSoportados(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    CLAVE_PUBLICA !== ''
  );
}

/** La clave VAPID viene en base64url; el navegador la pide como bytes. */
function claveABytes(base64url: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

async function registroDelServicio(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

/** ¿Hay una suscripción activa en este dispositivo? */
export async function avisosActivados(): Promise<boolean> {
  if (!avisosSoportados()) return false;
  const registro = await navigator.serviceWorker.getRegistration('/');
  const suscripcion = await registro?.pushManager.getSubscription();
  return Boolean(suscripcion);
}

/**
 * Pide permiso, crea la suscripción en este dispositivo y la guarda para la persona indicada.
 * Lanza error si el usuario no concede el permiso.
 */
export async function activarAvisos(grupoId: string, usuarioId: string): Promise<void> {
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    throw new PermisoDenegado();
  }

  const registro = await registroDelServicio();
  const existente = await registro.pushManager.getSubscription();
  const suscripcion =
    existente ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: claveABytes(CLAVE_PUBLICA),
    }));

  const datos = suscripcion.toJSON();
  const { error } = await supabase.from('suscripciones_push').upsert(
    {
      grupo_id: grupoId,
      user_id: usuarioId,
      endpoint: datos.endpoint,
      p256dh: datos.keys?.p256dh,
      auth: datos.keys?.auth,
    },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
}

/** Quita la suscripción de este dispositivo: deja de recibir avisos. */
export async function desactivarAvisos(): Promise<void> {
  const registro = await navigator.serviceWorker.getRegistration('/');
  const suscripcion = await registro?.pushManager.getSubscription();
  if (!suscripcion) return;

  const { error } = await supabase.from('suscripciones_push').delete().eq('endpoint', suscripcion.endpoint);
  if (error) throw error;
  await suscripcion.unsubscribe();
}

export class PermisoDenegado extends Error {
  constructor() {
    super('Permiso de avisos denegado');
    this.name = 'PermisoDenegado';
  }
}
