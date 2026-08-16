// Catálogo del editor de invitaciones.
//
// Espejo de `invitacion-aliwa/src/elementos/index.js`. Aquí no hay componentes
// de renderizado: la previa la pinta el iframe con el código real. Esto solo
// describe QUÉ se puede agregar y QUÉ campos tiene cada cosa, para que el
// editor arme los formularios solo en vez de tener uno escrito a mano por
// elemento.
//
// `campos` usa: texto | area | textoEstilado | soloEstilo | lista | personas |
//               imagen | url | select | switch | color
//
// CONVENCIÓN: el estilo (color, tamaño, tipografía, mayúsculas, negritas,
// cursiva) de un campo `k` se guarda en `kEstilo`. `textoEstilado` edita las
// dos llaves a la vez; `soloEstilo` edita nada más el estilo, para textos que
// no se escriben aquí (las etiquetas y nombres de la lista de anfitriones).
// `derivado: true` marca lo que se lee del evento y no se edita aquí — si el
// anfitrión cambia la fecha, el contador y el calendario se enteran solos.

// Los `id` NO se renombran aunque cambien las etiquetas: son los valores ya
// guardados en la base y renombrarlos dejaría invitaciones sin diseño.
export const VARIANTES_SOBRE = [
  // Clásico es UN diseño con dos orientaciones: en V en escritorio y por el
  // costado en móvil. No son dos opciones — la solapa solo gira según el ancho.
  { id: 'solapa', nombre: 'Clásico', desc: 'Sobre con solapa y sello de lacre' },
  { id: 'clasico', nombre: 'Cortina', desc: 'Dos mitades que suben y bajan' },
  { id: 'horizontal', nombre: 'Horizontal', desc: 'Dos mitades hacia los lados' },
]

export const VARIANTES_PORTADA = [
  { id: 'clasica', nombre: 'Clásica', desc: 'Con ornamentos arriba y abajo' },
  { id: 'minimal', nombre: 'Minimal', desc: 'Solo los nombres, sin adornos' },
  { id: 'marco', nombre: 'Con marco', desc: 'Encuadrada en una línea' },
]

export const TEMAS = [
  { id: 'dorado', nombre: 'Dorado', muestra: ['#f5ece6', '#c9a96e', '#5a5048'] },
  { id: 'verde', nombre: 'Verde', muestra: ['#f0f5f0', '#4a7c59', '#3d5a45'] },
]

// Las mismas tres familias que usan las invitaciones hechas a mano.
export const TIPOGRAFIAS = [
  { id: 'josefin', nombre: 'Josefin Sans', valor: "'Josefin Sans', sans-serif", uso: 'Títulos' },
  { id: 'cormorant', nombre: 'Cormorant', valor: "'Cormorant Garamond', serif", uso: 'Texto' },
  { id: 'pinyon', nombre: 'Pinyon Script', valor: "'Pinyon Script', cursive", uso: 'Decorativa' },
  { id: 'montserrat', nombre: 'Montserrat', valor: "'Montserrat', sans-serif", uso: 'Neutra' },
]

// Elementos del CONTENIDO. Sobre y portada no están aquí: tienen su propia
// pestaña porque son únicos y van siempre al principio.
export const ELEMENTOS = [
  {
    tipo: 'frase', nombre: 'Frase', icono: 'format_quote', repetible: true,
    campos: [
      { k: 'texto', label: 'Frase', tipo: 'textoEstilado', multilinea: true, placeholder: 'Hoy comienza el resto de nuestra historia.' },
      { k: 'autor', label: 'Autor', tipo: 'textoEstilado', placeholder: 'Opcional' },
      { k: 'estilo', label: 'Estilo', tipo: 'select', opciones: [
        { v: 'simple', n: 'Simple' }, { v: 'destacada', n: 'Destacada' }] },
    ],
  },
  {
    tipo: 'foto', nombre: 'Foto', icono: 'image', repetible: true,
    campos: [
      { k: 'url', label: 'Imagen', tipo: 'imagen' },
      { k: 'pie', label: 'Pie de foto', tipo: 'textoEstilado', placeholder: 'Opcional' },
      { k: 'tratamiento', label: 'Tratamiento', tipo: 'select', opciones: [
        { v: 'normal', n: 'Color' }, { v: 'suave', n: 'Desaturada' }, { v: 'bn', n: 'Blanco y negro' }] },
      { k: 'fundido', label: 'Fundir los bordes', tipo: 'switch' },
    ],
  },
  {
    tipo: 'anfitriones', nombre: 'Anfitriones', icono: 'group', repetible: true,
    ayuda: 'Sirve para novios, quinceañera, padres o padrinos: cada persona lleva su etiqueta.',
    campos: [
      { k: 'titulo', label: 'Título', tipo: 'textoEstilado', placeholder: 'Nuestros padres' },
      { k: 'personas', label: 'Personas', tipo: 'personas' },
      { k: 'etiqueta', label: 'Estilo de las etiquetas', tipo: 'soloEstilo' },
      { k: 'nombre', label: 'Estilo de los nombres', tipo: 'soloEstilo' },
      { k: 'columnas', label: 'Columnas', tipo: 'select', opciones: [
        { v: 1, n: 'Una' }, { v: 2, n: 'Dos' }] },
    ],
  },
  {
    tipo: 'contador', nombre: 'Cuenta regresiva', icono: 'timer', repetible: false,
    derivado: 'Usa la fecha del evento',
    campos: [{ k: 'titulo', label: 'Título', tipo: 'textoEstilado', placeholder: 'Falta poco' }],
  },
  {
    tipo: 'calendario', nombre: 'Calendario', icono: 'calendar_month', repetible: false,
    derivado: 'Usa la fecha del evento',
    campos: [{ k: 'titulo', label: 'Título', tipo: 'textoEstilado', placeholder: 'Aparta la fecha' }],
  },
  {
    tipo: 'itinerario', nombre: 'Itinerario', icono: 'schedule', repetible: false,
    ayuda: 'El horario del día: ceremonia, recepción, fiesta.',
    campos: [
      { k: 'titulo', label: 'Título', tipo: 'textoEstilado', placeholder: 'El día' },
      { k: 'hitos', label: 'Momentos', tipo: 'lista',
        subcampos: [{ k: 'hora', label: 'Hora', ancho: 'corto' },
                    { k: 'titulo', label: 'Qué pasa' },
                    { k: 'detalle', label: 'Detalle' }] },
    ],
  },
  {
    tipo: 'linea_tiempo', nombre: 'Línea del tiempo', icono: 'history', repetible: false,
    ayuda: 'La historia, no el horario: cuándo se conocieron, el anillo.',
    campos: [
      { k: 'titulo', label: 'Título', tipo: 'textoEstilado', placeholder: 'Nuestra historia' },
      { k: 'hitos', label: 'Momentos', tipo: 'lista',
        subcampos: [{ k: 'fecha', label: 'Cuándo', ancho: 'corto' },
                    { k: 'titulo', label: 'Qué pasó' },
                    { k: 'texto', label: 'Detalle' }] },
    ],
  },
  {
    tipo: 'ubicacion', nombre: 'Ubicación', icono: 'place', repetible: true,
    derivado: 'Sin datos usa el lugar del evento',
    ayuda: 'Se puede poner más de una: ceremonia y recepción suelen ser distintas.',
    campos: [
      { k: 'titulo', label: 'Título', tipo: 'textoEstilado', placeholder: 'Dónde' },
      { k: 'nombre', label: 'Lugar', tipo: 'textoEstilado' },
      { k: 'direccion', label: 'Dirección', tipo: 'textoEstilado' },
      { k: 'mapa_url', label: 'Liga del mapa', tipo: 'url' },
    ],
  },
  {
    tipo: 'vestimenta', nombre: 'Código de vestimenta', icono: 'checkroom', repetible: false,
    derivado: 'Sin dato usa el del evento',
    campos: [
      { k: 'codigo', label: 'Código', tipo: 'textoEstilado', placeholder: 'Formal' },
      { k: 'nota', label: 'Nota', tipo: 'textoEstilado', placeholder: 'Opcional' },
    ],
  },
  {
    tipo: 'regalos', nombre: 'Regalos', icono: 'redeem', repetible: false,
    campos: [
      { k: 'titulo', label: 'Título', tipo: 'textoEstilado', placeholder: 'Regalos' },
      { k: 'texto', label: 'Mensaje', tipo: 'textoEstilado', multilinea: true, placeholder: 'Su presencia es nuestro mejor regalo.' },
      { k: 'enlace', label: 'Liga', tipo: 'url' },
      { k: 'textoBoton', label: 'Texto del botón', tipo: 'texto', placeholder: 'Ver mesa de regalos' },
    ],
  },
  {
    tipo: 'cancion', nombre: 'Canción', icono: 'music_note', repetible: false,
    ayuda: 'Nunca arranca sola: la invitada decide si la pone.',
    campos: [
      { k: 'url', label: 'Liga del audio', tipo: 'url' },
      { k: 'titulo', label: 'Nombre', tipo: 'texto' },
    ],
  },
]

// Fondo compartido por TODOS los elementos de contenido. Se agrega solo en el
// editor en vez de repetirlo en cada elemento: son los mismos cuatro campos y
// el renderizador los resuelve en un envoltorio común.
export const CAMPOS_FONDO = [
  { k: 'fondo', label: 'Color de fondo', tipo: 'color', vacio: 'El del tema' },
  { k: 'textura', label: 'Textura', tipo: 'select', opciones: [
    { v: 'lisa', n: 'Lisa' }, { v: 'lino', n: 'Lino' }, { v: 'papel', n: 'Papel' },
    { v: 'rayas', n: 'Rayas' }, { v: 'puntos', n: 'Puntos' }] },
  { k: 'fondoUrl', label: 'Imagen de fondo', tipo: 'imagen' },
  { k: 'velo', label: 'Oscurecer la imagen', tipo: 'select', opciones: [
    { v: 'medio', n: 'Normal' }, { v: 'suave', n: 'Poco' },
    { v: 'fuerte', n: 'Mucho' }, { v: 'ninguno', n: 'Nada' }] },
]

export const porTipo = (tipo) => ELEMENTOS.find((e) => e.tipo === tipo)

let contador = 0
/** Id local para el `key` de React y para arrastrar. No se guarda en la base. */
export const nuevoId = () => `b${Date.now().toString(36)}${(contador++).toString(36)}`
