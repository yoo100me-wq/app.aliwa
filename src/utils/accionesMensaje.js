// Marcadores que el backend anexa al contenido del mensaje, porque en la BD
// el mensaje es una sola cadena:
//   "texto\n[[botones]]Sí | No"     → respuestas rápidas
//   "texto\n[[lista]]Ver opciones"  → lista (solo el título del botón; las
//                                     opciones viven en la hoja de WhatsApp)
const MARCA_BOTONES = '\n[[botones]]'
const MARCA_LISTA = '\n[[lista]]'

/** Separa el contenido en { texto, botones, tituloLista }. */
export function separarAcciones(contenido) {
  const bruto = contenido || ''

  const iLista = bruto.lastIndexOf(MARCA_LISTA)
  if (iLista !== -1) {
    return {
      texto: bruto.slice(0, iLista),
      botones: [],
      tituloLista: bruto.slice(iLista + MARCA_LISTA.length).trim(),
    }
  }

  const iBotones = bruto.lastIndexOf(MARCA_BOTONES)
  if (iBotones !== -1) {
    return {
      texto: bruto.slice(0, iBotones),
      botones: bruto
        .slice(iBotones + MARCA_BOTONES.length)
        .split('|')
        .map((b) => b.trim())
        .filter(Boolean),
      tituloLista: '',
    }
  }

  return { texto: bruto, botones: [], tituloLista: '' }
}
