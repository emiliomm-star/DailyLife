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
    sinNombre: 'Ponte un nombre en el plan del gimnasio para verlo aquí.',
    codigoInvitacion: 'Código de invitación',
    codigoAyuda: 'Compártelo con la otra persona para que entre en el grupo.',
  },
  goToWork: {
    titulo: 'Estados',
    yo: 'Yo',
    sinNombre: 'Sin nombre',
    sinEstadosVisibles: 'No hay estados que mostrar. Puede que no los comparta contigo.',
    marcar: 'Toca un estado para registrarlo',
    registrado: (nombre: string, hora: string) => `Registrado: ${nombre} (${hora})`,
    hoy: 'Hoy',
    anterior: 'Anterior',
    siguiente: 'Siguiente',
    historial: 'Historial',
    sinRegistros: 'No hay estados registrados este día.',
    gestionarEstados: 'Gestionar estados',
    sinEstados: 'No tienes estados. Añade uno en “Gestionar estados”.',
    soloLectura: 'Solo puedes ver estos estados. Quien los tiene decide si los comparte.',
    estados: {
      titulo: 'Mis estados',
      nuevo: 'Nombre del nuevo estado',
      anadir: 'Añadir estado',
      editar: 'Editar',
      guardar: 'Guardar',
      cancelar: 'Cancelar',
      quitar: 'Quitar',
      confirmarQuitar: '¿Seguro?',
      quitarAviso: 'Si ya tiene registros, se oculta de la lista, pero su historial se conserva.',
      nombreVacio: 'El nombre no puede estar vacío.',
      icono: 'Icono',
      ordenAyuda: 'Arrastra ≡ para cambiar el orden. Es el orden en que el widget pasa de un estado al siguiente.',
      arrastrar: 'Arrastrar para ordenar',
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
  buscador: {
    titulo: 'Añadir producto',
    cerrar: 'Cerrar',
    buscar: 'Buscar producto (nombre o marca)',
    ejemplo: 'Ej.: leche entera',
    ayuda: 'Escribe al menos tres letras y pulsa Buscar.',
    buscarBoton: 'Buscar',
    catalogoOcupado: 'El catálogo de productos no responde ahora mismo. Inténtalo en unos segundos, o añade el producto como propio.',
    sinResultados: 'No hay resultados. Prueba con otra palabra, o añade el producto con el formulario de producto propio.',
    precio: 'Precio (opcional)',
    precioAyuda: 'Si lo conoces, el precio de referencia. Puedes dejarlo vacío.',
    precioNoValido: 'El precio no es válido.',
    nombreVacio: 'El nombre no puede estar vacío.',
    anadir: 'Añadir a la lista',
    buscarOff: 'Buscar en Open Food Facts',
    volver: 'Volver a buscar',
    atribucion: 'Datos de productos: Open Food Facts (licencia ODbL).',
  },
  propio: {
    titulo: 'Producto propio',
    nombre: 'Nombre del producto',
    precio: 'Precio (opcional)',
    anadir: 'Añadir producto',
    nombreVacio: 'El nombre no puede estar vacío.',
    precioNoValido: 'El precio no es válido.',
  },
  gimnasio: {
    titulo: 'Gimnasio',
    tabHoy: 'Hoy',
    tabPlan: 'Plan semanal',
    tabBiblioteca: 'Biblioteca',
    dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    descanso: 'Descanso',
    hoyDescanso: 'Hoy toca descanso. Disfrútalo.',
    hoyRutinaVacia: 'Esta rutina aún no tiene ejercicios. Añádelos en Biblioteca.',
    progreso: (hechos: number, total: number) => `${hechos} de ${total} hechos`,
    resumenHoy: 'Hoy en el grupo',
    quienEres: '¿Quién entrena?',
    tuNombre: 'Tu nombre',
    guardarNombre: 'Guardar nombre',
    sinNombre: 'Sin nombre',
    soloLectura: 'Solo puedes cambiar tu propio plan y tus marcas.',
    sinRutinaVisible: 'Sin rutina hoy, o no la comparte contigo',
    elegirRutina: 'Elige la rutina de este día',
    planDe: (nombre: string) => `Plan de ${nombre}`,
    sinMiembros: 'Aún no hay miembros en el grupo.',
    nuevaRutina: 'Nueva rutina',
    nombre: 'Nombre de la rutina',
    clasificacion: 'Clasificación',
    estado: 'Estado',
    crear: 'Crear rutina',
    filtrar: 'Filtrar',
    todas: 'Todas',
    masculina: 'Masculina',
    femenina: 'Femenina',
    borrador: 'Borrador',
    activa: 'Activa',
    archivada: 'Archivada',
    vacio: 'No hay rutinas con este filtro.',
    nombreVacio: 'El nombre no puede estar vacío.',
    detalle: {
      ejercicios: 'Ejercicios',
      vacio: 'Esta rutina aún no tiene ejercicios.',
      anadirPropio: 'Añadir ejercicio propio',
      buscarWger: 'Buscar en wger',
      nombreEjercicio: 'Nombre del ejercicio',
      series: 'Series',
      repeticiones: 'Repeticiones (ej. 8-10)',
      peso: 'Peso (kg)',
      descanso: 'Descanso (segundos)',
      guardar: 'Guardar',
      cancelar: 'Cancelar',
      editar: 'Editar',
      quitar: 'Quitar',
      confirmarQuitar: '¿Seguro?',
      quitarRutina: 'Quitar rutina',
      confirmarQuitarRutina: 'Pulsa otra vez para borrar la rutina y sus ejercicios',
    },
    buscador: {
      titulo: 'Buscar ejercicio',
      cerrar: 'Cerrar',
      buscar: 'Buscar ejercicio',
      ejemplo: 'Ej.: press banca',
      ayuda: 'Escribe al menos dos letras.',
      sinResultados: 'No hay ejercicios con ese nombre. Puedes añadirlo como ejercicio propio.',
      atribucion: 'Ejercicios: wger (licencia CC-BY-SA). Imágenes y descripciones © sus autores.',
    },
  },
  resumen: {
    titulo: 'Resumen del mes',
    abrir: 'Ver resumen del mes',
    gastado: 'Gastado',
    ingresos: 'Ingresos del mes',
    misIngresos: 'Mis ingresos del mes',
    guardarIngresos: 'Guardar ingresos',
    ahorro: 'Ahorro',
    porCategoria: 'Gasto por categoría',
    sinGastos: 'Sin gastos este mes.',
    comparativa: 'Comparativa con el mes anterior',
    anterior: 'Mes anterior',
    ahorroUltimos: 'Ahorro de los últimos 6 meses',
    ingresoNoValido: 'El importe de ingresos no es válido.',
    vistaCategorias: 'Vista de categorías',
    vistaAhorro: 'Vista de ahorro',
    repartoMes: (mes: string) => `Reparto de tu ingreso de ${mes}: gastos por categoría y ahorro.`,
    sinIngresosReparto: 'Registra los ingresos del mes para ver cómo se reparten.',
    barras: 'Barras',
    tarta: 'Tarta',
    anillo: 'Anillo',
    lineas: 'Líneas',
    gastosDelMes: 'Gastos de este mes',
    nuevoGasto: 'Añadir gasto',
    importe: 'Importe',
    categoria: 'Categoría',
    fecha: 'Fecha (AAAA-MM-DD)',
    descripcion: 'Descripción (opcional)',
    anadirGasto: 'Añadir gasto',
    importeObligatorio: 'Escribe el importe del gasto.',
    fechaNoValida: 'La fecha debe tener el formato AAAA-MM-DD y ser una fecha real.',
    sinCategorias: 'Crea primero una categoría en Compras.',
    quitar: 'Quitar',
    confirmarQuitar: '¿Seguro?',
    ningunGasto: 'Aún no hay gastos este mes.',
  },
  productos: {
    pendientes: 'Pendientes',
    comprados: 'Comprados',
    nuevo: 'Nombre del producto',
    anadir: 'Añadir producto',
    importe: 'Importe (opcional)',
    importeAyuda: 'Escribe el importe antes de tocar un producto para registrarlo como gasto.',
    vacioPendientes: 'No hay productos pendientes. ¡Lista completa!',
    vacioComprados: 'Aún no has comprado nada en esta categoría.',
    quitar: 'Quitar',
    confirmarQuitar: '¿Seguro?',
    reiniciar: 'Volver todo a pendiente',
    confirmarReiniciar: 'Pulsa otra vez para confirmar',
    nombreVacio: 'El nombre no puede estar vacío.',
    sinCategoria: 'Esta categoría ya no existe.',
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
      goToWork: { titulo: 'Estados', descripcion: 'Estados del día de cada persona' },
      compras: { titulo: 'Compras del mes', descripcion: 'Gastos, gráficos y ahorro mensual' },
    },
    proximamente: 'Esta sección se construye en los siguientes pasos.',
    widget: 'Widget de estado',
    privacidad: 'Privacidad y compartir',
  },
  privacidad: {
    titulo: 'Privacidad y compartir',
    descripcion:
      'Por defecto, todas las personas del grupo ven tus datos de cada módulo. Desactiva un módulo para ocultárselo a alguien concreto. Solo tú puedes cambiarlo.',
    sinOtros: 'Aún no hay otras personas en el grupo.',
    modulos: {
      estados: 'Estados',
      gimnasio: 'Gimnasio',
      compras: 'Compras y gastos',
    },
    error: 'No se pudo guardar el cambio.',
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
  ['productos_grupo_id_categoria_id_nombre_key', 'Ya existe un producto con ese nombre en esta categoría.'],
  ['Producto no encontrado', 'Ese producto ya no existe.'],
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
