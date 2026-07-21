// Textos de PlantillasSection (gestión de plantillas de WhatsApp)
export const es = {
  estados: {
    APPROVED: 'Aprobada',
    PENDING: 'En revisión',
    IN_APPEAL: 'En apelación',
    REJECTED: 'Rechazada',
    PAUSED: 'Pausada',
    DISABLED: 'Deshabilitada',
  },
  categorias: {
    UTILITY: 'Utilidad',
    MARKETING: 'Marketing',
    AUTHENTICATION: 'Autenticación',
  },
  idiomas: {
    es_MX: 'Español (México)',
    es: 'Español',
    en_US: 'Inglés (EE. UU.)',
  },

  // Vista previa
  previaEjemplo: (n) => `[ejemplo ${n}]`,
  previaCuerpoVacio: 'Escribe el cuerpo del mensaje...',
  copiarCodigo: 'Copiar código',
  vistaPrevia: 'Vista previa',
  vistaPreviaNota: 'Así verá tu cliente el mensaje en WhatsApp.',
  authPreviaCuerpo: '«123456» es tu código de verificación. Por tu seguridad, no lo compartas.',
  authPreviaPie: (min) => `Este código caduca en ${min} minutos.`,

  // Sin número conectado
  sinNumeroTitulo: 'Conecta tu WhatsApp primero',
  sinNumeroTexto: 'Las plantillas se crean sobre tu número de WhatsApp Business. Conéctalo desde la guía de inicio.',

  // Encabezado de la sección
  titulo: 'Plantillas de mensajes',
  subtitulo: 'Mensajes pre-aprobados por Meta para iniciar conversaciones fuera de la ventana de 24 horas.',
  nuevaPlantilla: 'Nueva plantilla',
  cancelar: 'Cancelar',

  // Avisos y errores
  avisoEnviada: (nombre) => `Plantilla "${nombre}" enviada a revisión de Meta.`,
  avisoEliminada: (nombre) => `Plantilla "${nombre}" eliminada.`,
  errCrear: 'No se pudo crear la plantilla',
  errEliminar: 'No se pudo eliminar la plantilla',
  errConexion: 'Error de conexión',

  // Formulario
  labelNombre: 'Nombre',
  phNombre: 'recordatorio_cita',
  labelIdioma: 'Idioma',
  labelCategoria: 'Categoría',
  authInfo: 'Meta genera el texto de las plantillas de autenticación (código de un solo uso con botón para copiar). Solo elige cuántos minutos es válido el código.',
  labelExpiracion: 'Expiración (minutos)',
  labelEncabezado: 'Encabezado (opcional)',
  phEncabezado: 'Recordatorio de tu cita',
  labelCuerpo: 'Cuerpo',
  phCuerpo: 'Hola {{1}}, te recordamos tu cita el {{2}}. ¡Te esperamos!',
  ayudaVariables: 'Usa {{1}}, {{2}}… para datos que cambian (nombre, fecha, monto).',
  labelEjemplos: 'Ejemplos para revisión de Meta',
  phEjemplo: (v) => `Ejemplo para {{${v}}}`,
  labelPie: 'Pie (opcional)',
  phPie: 'Responde STOP para no recibir más',
  labelBotones: 'Botones (opcional, separa con coma)',
  phBotones: 'Confirmar, Reagendar',
  enviando: 'Enviando...',
  enviarRevision: 'Enviar a revisión',

  // Lista
  cargando: 'Cargando plantillas...',
  vacio: 'Aún no tienes plantillas. Crea la primera para poder escribirle a tus clientes fuera de la ventana de 24 horas.',
  eliminar: 'Eliminar',
  eliminarTitulo: 'Eliminar plantilla',

  // Envío de plantillas (individual desde el chat y masivo)
  envio: {
    titulo: 'Enviar plantilla',
    tituloMasivo: 'Envío masivo de plantilla',
    enviarTitulo: 'Enviar esta plantilla a clientes',
    seleccionaPlantilla: 'Plantilla (solo aprobadas)',
    sinAprobadas: 'No tienes plantillas aprobadas todavía. Meta debe aprobarlas antes de poder enviarlas.',
    variablesLabel: 'Variables del mensaje',
    varPh: (n) => `Valor para {{${n}}}`,
    destinatarios: 'Destinatarios',
    buscarCliente: 'Buscar cliente...',
    seleccionarTodos: 'Seleccionar todos',
    limpiarSeleccion: 'Limpiar',
    seleccionados: (n) => `${n} seleccionado${n === 1 ? '' : 's'}`,
    sinClientes: 'No hay clientes aún.',
    avisoCosto: 'Cada plantilla enviada se cobra con Meta según su categoría. Máximo 100 por envío.',
    enviar: 'Enviar',
    enviarA: (n) => `Enviar a ${n} cliente${n === 1 ? '' : 's'}`,
    enviando: 'Enviando...',
    resultado: (ok, fail) => `Enviadas: ${ok} · Fallidas: ${fail}`,
    errEnviar: 'No se pudo enviar la plantilla',
    cargandoClientes: 'Cargando clientes...',
  },
}

export const en = {
  estados: {
    APPROVED: 'Approved',
    PENDING: 'In review',
    IN_APPEAL: 'In appeal',
    REJECTED: 'Rejected',
    PAUSED: 'Paused',
    DISABLED: 'Disabled',
  },
  categorias: {
    UTILITY: 'Utility',
    MARKETING: 'Marketing',
    AUTHENTICATION: 'Authentication',
  },
  idiomas: {
    es_MX: 'Spanish (Mexico)',
    es: 'Spanish',
    en_US: 'English (US)',
  },

  // Preview
  previaEjemplo: (n) => `[example ${n}]`,
  previaCuerpoVacio: 'Write the message body...',
  copiarCodigo: 'Copy code',
  vistaPrevia: 'Preview',
  vistaPreviaNota: 'This is how your customer will see the message on WhatsApp.',
  authPreviaCuerpo: '"123456" is your verification code. For your security, do not share it.',
  authPreviaPie: (min) => `This code expires in ${min} minutes.`,

  // No number connected
  sinNumeroTitulo: 'Connect your WhatsApp first',
  sinNumeroTexto: 'Templates are created on your WhatsApp Business number. Connect it from the getting-started guide.',

  // Section header
  titulo: 'Message templates',
  subtitulo: 'Meta pre-approved messages to start conversations outside the 24-hour window.',
  nuevaPlantilla: 'New template',
  cancelar: 'Cancel',

  // Notices and errors
  avisoEnviada: (nombre) => `Template "${nombre}" submitted for Meta review.`,
  avisoEliminada: (nombre) => `Template "${nombre}" deleted.`,
  errCrear: 'Could not create the template',
  errEliminar: 'Could not delete the template',
  errConexion: 'Connection error',

  // Form
  labelNombre: 'Name',
  phNombre: 'appointment_reminder',
  labelIdioma: 'Language',
  labelCategoria: 'Category',
  authInfo: 'Meta generates the text for authentication templates (one-time code with a copy button). Just choose how many minutes the code stays valid.',
  labelExpiracion: 'Expiration (minutes)',
  labelEncabezado: 'Header (optional)',
  phEncabezado: 'Your appointment reminder',
  labelCuerpo: 'Body',
  phCuerpo: 'Hi {{1}}, this is a reminder of your appointment on {{2}}. See you soon!',
  ayudaVariables: 'Use {{1}}, {{2}}… for data that changes (name, date, amount).',
  labelEjemplos: 'Examples for Meta review',
  phEjemplo: (v) => `Example for {{${v}}}`,
  labelPie: 'Footer (optional)',
  phPie: 'Reply STOP to opt out',
  labelBotones: 'Buttons (optional, comma-separated)',
  phBotones: 'Confirm, Reschedule',
  enviando: 'Submitting...',
  enviarRevision: 'Submit for review',

  // List
  cargando: 'Loading templates...',
  vacio: "You don't have templates yet. Create your first one to message customers outside the 24-hour window.",
  eliminar: 'Delete',
  eliminarTitulo: 'Delete template',

  // Template sending (individual from chat and bulk)
  envio: {
    titulo: 'Send template',
    tituloMasivo: 'Bulk template send',
    enviarTitulo: 'Send this template to customers',
    seleccionaPlantilla: 'Template (approved only)',
    sinAprobadas: "You don't have approved templates yet. Meta must approve them before you can send.",
    variablesLabel: 'Message variables',
    varPh: (n) => `Value for {{${n}}}`,
    destinatarios: 'Recipients',
    buscarCliente: 'Search customer...',
    seleccionarTodos: 'Select all',
    limpiarSeleccion: 'Clear',
    seleccionados: (n) => `${n} selected`,
    sinClientes: 'No customers yet.',
    avisoCosto: 'Each sent template is billed by Meta according to its category. Maximum 100 per batch.',
    enviar: 'Send',
    enviarA: (n) => `Send to ${n} customer${n === 1 ? '' : 's'}`,
    enviando: 'Sending...',
    resultado: (ok, fail) => `Sent: ${ok} · Failed: ${fail}`,
    errEnviar: 'The template could not be sent',
    cargandoClientes: 'Loading customers...',
  },
}
