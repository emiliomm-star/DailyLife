/**
 * Textos de la interfaz en español.
 * Todo el texto visible sale de aquí para poder añadir el inglés (RNF-06) sin tocar la lógica.
 */
export const textos = {
  general: {
    cargando: 'Cargando…',
    cerrarSesion: 'Cerrar sesión',
    reintentar: 'Reintentar',
    errorGenerico: 'Ha ocurrido un error. Inténtalo de nuevo.',
  },
  login: {
    titulo: 'Entrar',
    email: 'Email',
    contrasena: 'Contraseña',
    entrar: 'Entrar',
    sinCuenta: 'Crear cuenta con código de invitación',
    credencialesIncorrectas: 'Email o contraseña incorrectos.',
    emailNoConfirmado: 'Tu email todavía no está confirmado. Confírmalo desde el correo y vuelve a entrar.',
  },
  registro: {
    titulo: 'Crear cuenta',
    email: 'Email',
    contrasena: 'Contraseña (mínimo 6 caracteres)',
    crear: 'Crear cuenta',
    yaTengoCuenta: 'Ya tengo cuenta',
    revisaCorreo: 'Te hemos enviado un correo para confirmar la cuenta. Confírmala y luego entra.',
    emailEnUso: 'Ya existe una cuenta con ese email.',
  },
  grupo: {
    titulo: 'Tu espacio compartido',
    descripcion: 'Para usar la app necesitas formar parte de un grupo. Crea uno nuevo o únete con el código de invitación.',
    crearTitulo: 'Crear grupo',
    nombreGrupo: 'Nombre del grupo',
    crear: 'Crear grupo',
    unirseTitulo: 'Unirme con código',
    codigo: 'Código de invitación',
    unirme: 'Unirme',
    codigoNoValido: 'El código de invitación no es válido.',
  },
  inicio: {
    bienvenida: 'Hola',
    grupo: 'Grupo',
    codigoInvitacion: 'Código de invitación',
    codigoAyuda: 'Compártelo con la otra persona para que entre en el grupo.',
  },
  goToWork: {
    titulo: 'Go To Work',
    estadosIniciales: [
      'Ya tomé el metro',
      'Ya llegué al trabajo',
      'Voy a desayunar',
      'Salí del trabajo',
      'Ya estoy en casa',
    ],
    marcar: 'Toca un estado para registrarlo',
    registrado: (nombre: string, hora: string) => `Registrado: ${nombre} (${hora})`,
    hoy: 'Hoy',
    anterior: 'Anterior',
    siguiente: 'Siguiente',
    historial: 'Historial',
    sinRegistros: 'No hay estados registrados este día.',
    gestionarEstados: 'Gestionar estados',
    sinEstados: 'No tienes estados. Añade uno en “Gestionar estados”.',
    estados: {
      titulo: 'Estados',
      nuevo: 'Nombre del nuevo estado',
      anadir: 'Añadir estado',
      editar: 'Editar',
      guardar: 'Guardar',
      cancelar: 'Cancelar',
      quitar: 'Quitar',
      confirmarQuitar: '¿Seguro?',
      quitarAviso: 'Si ya tiene registros, se oculta de la lista, pero su historial se conserva.',
      nombreVacio: 'El nombre no puede estar vacío.',
    },
  },
  dispositivos: {
    titulo: 'Widget de estado',
    descripcion: 'Crea un código para que el widget de la pantalla de inicio del iPhone pueda cambiar de estado sin abrir la app. Se muestra una sola vez: cópialo y pégalo en el script de Scriptable.',
    nombre: 'Nombre del dispositivo (p. ej. iPhone de Emilio)',
    crear: 'Crear código',
    codigoTitulo: 'Tu código (cópialo ahora)',
    aviso: 'Guárdalo en un lugar seguro. Si lo pierdes, crea otro.',
  },
  compras: {
    titulo: 'Compras del mes',
    categorias: 'Categorías',
    categoriasIniciales: ['Supermercado', 'Transporte', 'Casa', 'Salud', 'Ocio', 'Ropa', 'Otros'],
    vacio: 'Aún no tienes categorías. Añade la primera abajo.',
    nueva: 'Nombre de la nueva categoría',
    anadir: 'Añadir categoría',
    pendientes: (n: number) => `${n} pendiente${n === 1 ? '' : 's'}`,
    comprados: (n: number) => `${n} comprado${n === 1 ? '' : 's'}`,
    editar: 'Editar',
    guardar: 'Guardar',
    cancelar: 'Cancelar',
    quitar: 'Quitar',
    confirmarQuitar: '¿Seguro?',
    quitarAviso: 'Si tiene productos o gastos, se oculta, pero su historial se conserva.',
    nombreVacio: 'El nombre no puede estar vacío.',
    proximamente: 'La lista de productos de esta categoría se construye en el siguiente paso.',
  },
  dashboard: {
    titulo: 'Inicio',
    modulos: {
      gimnasio: { titulo: 'Gimnasio', descripcion: 'Rutinas de musculación' },
      goToWork: { titulo: 'Go To Work', descripcion: 'Estados del trabajo del día' },
      compras: { titulo: 'Compras del mes', descripcion: 'Gastos, gráficos y ahorro mensual' },
    },
    proximamente: 'Esta sección se construye en los siguientes pasos.',
    widget: 'Widget de estado',
  },
  errorGrupo: {
    titulo: 'No se pudo cargar tu grupo',
    descripcion: 'Comprueba tu conexión e inténtalo de nuevo.',
  },
} as const;

export type ErrorDescrito = {
  /** Mensaje amable para el usuario. */
  texto: string;
  /** Datos técnicos (código, estado HTTP, mensaje original) para diagnosticar el problema. */
  detalle: string;
};

/** Mensajes de Supabase que tenemos traducidos. La comparación es por fragmento. */
const mensajesConocidos: ReadonlyArray<readonly [string, string]> = [
  ['Invalid login credentials', textos.login.credencialesIncorrectas],
  ['Email not confirmed', textos.login.emailNoConfirmado],
  ['already registered', textos.registro.emailEnUso],
  ['Código de invitación no válido', textos.grupo.codigoNoValido],
];

/**
 * Convierte cualquier error (de Supabase Auth, de PostgREST o de red) en un texto para el usuario
 * y un detalle técnico. El detalle se muestra siempre, para saber qué ha fallado.
 * Nunca incluye contraseñas ni tokens: solo código, estado, mensaje y pistas del error.
 */
export function describirError(error: unknown): ErrorDescrito {
  const e = (error ?? {}) as {
    message?: string;
    code?: string;
    status?: number;
    name?: string;
    details?: string;
    hint?: string;
  };
  const mensaje = e.message ?? (error instanceof Error ? error.message : String(error));

  // Se registra completo en la consola del navegador para poder inspeccionarlo.
  console.warn('[DailyLife] error:', error);

  const conocido = mensajesConocidos.find(([fragmento]) => mensaje.includes(fragmento));
  // Sin código propio, el nombre de la clase (TypeError, AuthRetryableFetchError…) ayuda a identificarlo.
  const nombre = !e.code && e.name && e.name !== 'Error' ? e.name : null;
  const partes = [
    nombre,
    e.code ?? (e.status ? `HTTP ${e.status}` : null),
    mensaje,
    e.details,
    e.hint ? `Pista: ${e.hint}` : null,
  ].filter((parte): parte is string => Boolean(parte));

  return {
    texto: conocido?.[1] ?? textos.general.errorGenerico,
    detalle: partes.join(' · ') || 'Sin detalles',
  };
}
