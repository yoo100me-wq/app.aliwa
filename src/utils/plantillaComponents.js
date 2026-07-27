// Traduce el arreglo `components` que devuelve Meta a las props que consume
// PreviaPlantilla. Vive aparte de los componentes para no romper Fast Refresh.
export function previaDeComponents(components, copiarLabel) {
  const comp = (tipo) => (components || []).find((c) => c.type === tipo)
  const botones = (comp('BUTTONS')?.buttons || []).map((b) => ({
    texto: b.type === 'OTP' ? copiarLabel : b.text,
    tipo: b.type === 'URL' ? 'enlace' : 'rapida',
  }))
  return {
    // Solo el encabezado de TEXTO se puede previsualizar; los de imagen/video
    // /documento no traen contenido que dibujar aquí.
    encabezado: comp('HEADER')?.format === 'TEXT' ? comp('HEADER')?.text : '',
    cuerpo: comp('BODY')?.text || '',
    pie: comp('FOOTER')?.text || '',
    botones,
  }
}
