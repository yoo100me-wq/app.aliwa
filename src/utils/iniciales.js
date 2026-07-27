// Iniciales para los avatares: SIEMPRE la del nombre y la del primer apellido.
//
// Cuando el apellido viene en su propio campo no hay nada que adivinar. Cuando
// solo hay una cadena ("Jennifer Aracely Cortez Bautista") hay que ubicar dónde
// empiezan los apellidos: con 4 palabras o más son dos nombres + dos apellidos,
// así que el primer apellido es la 3ª palabra (JC, no JA, que es lo que daba el
// método viejo de "las dos primeras palabras").
export function iniciales(nombre, apellido = '') {
  const limpiar = (s) => String(s || '').trim().replace(/\s+/g, ' ')
  const n = limpiar(nombre)
  const a = limpiar(apellido)

  if (n && a) return (n[0] + a[0]).toUpperCase()

  // Solo se consideran palabras que empiezan con letra: así un contacto sin
  // nombre ("Lead 000100004") da "L" y no "L0".
  const partes = n.split(' ').filter((p) => /^\p{L}/u.test(p))
  if (!partes.length) return '?'
  if (partes.length === 1) return partes[0][0].toUpperCase()

  const iApellido = partes.length >= 4 ? 2 : 1
  return (partes[0][0] + partes[iApellido][0]).toUpperCase()
}
