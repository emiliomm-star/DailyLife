// DailyLife · widget de estado para Scriptable (iOS).
//
// Uso:
//   1. Instala Scriptable y crea un script nuevo llamado "DailyLife Estado" con este contenido.
//   2. Rellena SUPABASE_URL y PUBLISHABLE_KEY (son los de tu proyecto, en Settings → API).
//   3. La primera vez te pedirá el código de dispositivo que creaste en la app (Inicio → Widget de estado).
//   4. Añade widgets: uno "Estado" (parámetro: estado), otro "Siguiente" (parámetro: siguiente)
//      y otro "Anterior" (parámetro: anterior). Mantén pulsada la pantalla de inicio → + → Scriptable.
//
// Al tocar un widget de "Siguiente" o "Anterior", el script registra el cambio y te muestra una
// notificación con el estado actual y el siguiente.

const SUPABASE_URL = 'https://vesvgzrpuckmzjhkdkef.supabase.co';
const PUBLISHABLE_KEY = 'PEGA_AQUI_TU_PUBLISHABLE_KEY';
const CLAVE_TOKEN = 'dailylife_token';
const NOMBRE_SCRIPT = 'DailyLife Estado';

/** Llama a una función RPC de Supabase con el código de dispositivo. */
async function rpc(nombre, cuerpo) {
  const req = new Request(`${SUPABASE_URL}/rest/v1/rpc/${nombre}`);
  req.method = 'POST';
  req.headers = { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' };
  req.body = JSON.stringify(cuerpo);
  const json = await req.loadJSON();
  if (req.response.statusCode >= 400) {
    throw new Error(json.message || `Error HTTP ${req.response.statusCode}`);
  }
  return json;
}

/** Devuelve el código guardado en el Keychain o lo pide una vez. */
async function obtenerToken() {
  if (Keychain.contains(CLAVE_TOKEN)) return Keychain.get(CLAVE_TOKEN);

  const alerta = new Alert();
  alerta.title = 'Código de dispositivo';
  alerta.message = 'Pega el código que creaste en la app DailyLife.';
  alerta.addTextField('Código');
  alerta.addAction('Guardar');
  alerta.addCancelAction('Cancelar');
  const opcion = await alerta.presentAlert();
  if (opcion === -1) throw new Error('Sin código de dispositivo');

  const token = alerta.textFieldValue(0).trim();
  Keychain.set(CLAVE_TOKEN, token);
  return token;
}

function horaCorta(iso) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** Construye el widget según el parámetro: estado, siguiente o anterior. */
function construirWidget(modo, datos, error) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color('#1c1c1e');
  widget.setPadding(12, 14, 12, 14);
  widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

  const titulo = widget.addText('DailyLife');
  titulo.font = Font.semiboldSystemFont(12);
  titulo.textColor = Color.gray();
  widget.addSpacer(6);

  if (error) {
    const t = widget.addText('Sin conexión');
    t.font = Font.mediumSystemFont(14);
    t.textColor = Color.red();
    return widget;
  }

  if (modo === 'estado') {
    const actual = widget.addText(datos.actual || 'Sin registros hoy');
    actual.font = Font.boldSystemFont(18);
    actual.textColor = Color.white();
    actual.minimumScaleFactor = 0.6;
    if (datos.marcado_en) {
      const hora = widget.addText(horaCorta(datos.marcado_en));
      hora.font = Font.mediumSystemFont(13);
      hora.textColor = Color.gray();
    }
    widget.addSpacer();
    const siguiente = widget.addText(`Siguiente: ${datos.siguiente || '—'}`);
    siguiente.font = Font.systemFont(12);
    siguiente.textColor = Color.lightGray();
    siguiente.minimumScaleFactor = 0.7;
    return widget;
  }

  // Modos de acción: tocar el widget ejecuta el cambio.
  const etiqueta = modo === 'siguiente' ? 'Siguiente ›' : '‹ Anterior';
  const destino = modo === 'siguiente' ? datos.siguiente : datos.anterior;
  const boton = widget.addText(etiqueta);
  boton.font = Font.semiboldSystemFont(13);
  boton.textColor = Color.blue();
  widget.addSpacer(4);
  const nombre = widget.addText(destino || '—');
  nombre.font = Font.boldSystemFont(16);
  nombre.textColor = Color.white();
  nombre.minimumScaleFactor = 0.6;
  widget.url = `scriptable:///run/${encodeURIComponent(NOMBRE_SCRIPT)}?accion=${modo}`;
  return widget;
}

async function main() {
  const token = await obtenerToken();

  // Ejecución desde el widget de acción (o desde la URL): registrar el cambio.
  const accion = (args.queryParameters && args.queryParameters.accion) ||
    (['siguiente', 'anterior'].includes(args.widgetParameter) ? args.widgetParameter : null);

  if (accion === 'siguiente' || accion === 'anterior') {
    const cambio = await rpc('cambiar_estado_dispositivo', { p_token: token, p_direccion: accion });
    const estado = await rpc('estado_actual_dispositivo', { p_token: token });
    const aviso = new Notification();
    aviso.title = `Ahora: ${cambio.actual}`;
    aviso.body = `Siguiente: ${estado.siguiente || '—'}`;
    await aviso.schedule();
    Script.complete();
    return;
  }

  // Modo widget (o ejecución normal del script): mostrar el estado.
  const modo = ['siguiente', 'anterior'].includes(args.widgetParameter) ? args.widgetParameter : 'estado';
  let datos = null;
  let error = null;
  try {
    datos = await rpc('estado_actual_dispositivo', { p_token: token });
  } catch (e) {
    error = e.message;
  }

  if (config.runsInWidget) {
    Script.setWidget(construirWidget(modo, datos || {}, error));
  } else {
    const vista = construirWidget(modo, datos || {}, error);
    await vista.presentSmall();
  }
  Script.complete();
}

await main();
