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
  errorGrupo: {
    titulo: 'No se pudo cargar tu grupo',
    descripcion: 'Comprueba tu conexión e inténtalo de nuevo.',
  },
} as const;

/** Traduce los errores habituales de Supabase Auth y de las funciones de la base de datos. */
export function traducirError(mensaje: string): string {
  if (mensaje.includes('Invalid login credentials')) return textos.login.credencialesIncorrectas;
  if (mensaje.includes('already registered')) return textos.registro.emailEnUso;
  if (mensaje.includes('Código de invitación no válido')) return textos.grupo.codigoNoValido;
  return textos.general.errorGenerico;
}
