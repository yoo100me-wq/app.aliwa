// Shell del dashboard de Aliwa Eventos: sidebar, top bar y encabezados.
// Namespace aparte del de negocio (dash.js) a propósito: son dos vocabularios
// distintos sobre el mismo motor, y mezclarlos obligaría a leer claves de
// negocio desde el panel de eventos.
export const es = {
  menu: {
    dashboard: 'Panel',
    // Invitados
    guests: 'Invitados',
    confirmed: 'Confirmados',
    'survey-results': 'Encuestas',
    'import-export': 'Importar / Exportar',
    'gift-registry': 'Mesa de regalos',
    wishlist: 'Lista de deseos',
    // Invitación
    'invitation-builder': 'Crear invitación',
    'rsvp-form': 'Formulario de asistencia',
  },
  menuGrupos: { invitados: 'Invitados', invitacion: 'Invitación' },
  paginas: {
    dashboard: {
      title: null,
      description: 'Aquí verás el resumen de tu evento.',
      resumenEvento: (n) => `Aquí verás el resumen de ${n}.`,
    },
    guests: { title: 'Invitados', description: 'Quiénes recibieron la invitación y en qué estado va cada uno.' },
    confirmed: { title: 'Confirmados', description: 'Quiénes ya confirmaron su asistencia y cuántos pases ocupan.' },
    'survey-results': { title: 'Encuestas', description: 'Respuestas de tus invitados: menú, alergias y lo que preguntes.' },
    'import-export': { title: 'Importar / Exportar', description: 'Sube tu lista de invitados o descárgala con las confirmaciones.' },
    'gift-registry': { title: 'Mesa de regalos', description: 'Recibe el regalo de tus invitados a tu nombre.' },
    wishlist: { title: 'Lista de deseos', description: 'Los regalos que te gustaría recibir, para que tus invitados elijan.' },
    'invitation-builder': { title: 'Crear invitación', description: 'Arma la invitación que se enviará por WhatsApp.' },
    'rsvp-form': { title: 'Formulario de asistencia', description: 'Define qué se le pregunta a cada invitado al confirmar.' },
  },
  sidebar: {
    modoOscuro: 'Modo oscuro',
    modoClaro: 'Modo claro',
    idioma: 'Idioma',
    salir: 'Salir',
    configuracion: 'Configuración',
    configurarEvento: 'Configurar evento',
    aunNoTienes: 'Aún no tienes uno',
    miEvento: 'Mi evento',
    sinConfigurar: 'Sin configurar',
    misEventos: 'Mis eventos',
    agregarEvento: 'Agregar evento',
  },
  topbar: { configuracion: 'Configuración', dashboard: 'Panel' },
  bienvenida: (nombre) => `Bienvenida, ${nombre}!`,
  proximamente: 'Disponible pronto',
  proximamenteDesc: 'Esta sección se está construyendo. Te avisaremos en cuanto esté lista.',
}

export const en = {
  menu: {
    dashboard: 'Overview',
    guests: 'Guests',
    confirmed: 'Confirmed',
    'survey-results': 'Surveys',
    'import-export': 'Import / Export',
    'gift-registry': 'Gift registry',
    wishlist: 'Wishlist',
    'invitation-builder': 'Create invitation',
    'rsvp-form': 'RSVP form',
  },
  menuGrupos: { invitados: 'Guests', invitacion: 'Invitation' },
  paginas: {
    dashboard: {
      title: null,
      description: 'Your event summary will show up here.',
      resumenEvento: (n) => `The summary for ${n} will show up here.`,
    },
    guests: { title: 'Guests', description: 'Who received the invitation and where each one stands.' },
    confirmed: { title: 'Confirmed', description: 'Who has confirmed and how many seats they take.' },
    'survey-results': { title: 'Surveys', description: 'What your guests answered: meal, allergies and anything you ask.' },
    'import-export': { title: 'Import / Export', description: 'Upload your guest list or download it with the RSVPs.' },
    'gift-registry': { title: 'Gift registry', description: 'Receive gifts from your guests in your name.' },
    wishlist: { title: 'Wishlist', description: 'The gifts you would like to receive, so guests can pick one.' },
    'invitation-builder': { title: 'Create invitation', description: 'Build the invitation that goes out over WhatsApp.' },
    'rsvp-form': { title: 'RSVP form', description: 'Choose what each guest is asked when they confirm.' },
  },
  sidebar: {
    modoOscuro: 'Dark mode',
    modoClaro: 'Light mode',
    idioma: 'Language',
    salir: 'Log out',
    configuracion: 'Settings',
    configurarEvento: 'Set up event',
    aunNoTienes: "You don't have one yet",
    miEvento: 'My event',
    sinConfigurar: 'Not set up',
    misEventos: 'My events',
    agregarEvento: 'Add event',
  },
  topbar: { configuracion: 'Settings', dashboard: 'Overview' },
  bienvenida: (nombre) => `Welcome, ${nombre}!`,
  proximamente: 'Coming soon',
  proximamenteDesc: "This section is being built. We'll let you know as soon as it's ready.",
}
