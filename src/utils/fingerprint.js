/**
 * Genera un fingerprint único del dispositivo.
 * No usa cookies — solo características del navegador/dispositivo.
 */
export async function generarFingerprint() {
  const datos = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || '',
    navigator.maxTouchPoints || 0,
  ].join('|')

  // Hash SHA-256 del string combinado
  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(datos))
  const hashArray = Array.from(new Uint8Array(buffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Genera un nombre legible del dispositivo para mostrar al usuario.
 * Ej: "Chrome en Windows", "Safari en iPhone"
 */
export function nombreDispositivo() {
  const ua = navigator.userAgent

  let navegador = 'Navegador'
  if (ua.includes('Chrome') && !ua.includes('Edg')) navegador = 'Chrome'
  else if (ua.includes('Firefox')) navegador = 'Firefox'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) navegador = 'Safari'
  else if (ua.includes('Edg')) navegador = 'Edge'

  let sistema = 'Desconocido'
  if (ua.includes('Windows')) sistema = 'Windows'
  else if (ua.includes('Mac OS')) sistema = 'Mac'
  else if (ua.includes('iPhone')) sistema = 'iPhone'
  else if (ua.includes('Android')) sistema = 'Android'
  else if (ua.includes('Linux')) sistema = 'Linux'

  return `${navegador} en ${sistema}`
}
