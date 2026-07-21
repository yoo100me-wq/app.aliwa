// Color de avatar estable por contacto (estilo WhatsApp).
// Meta NO expone la foto de perfil de los clientes por la Cloud API
// (privacidad), así que la bandeja usa iniciales con un color único
// derivado del teléfono: el mismo contacto siempre se ve igual.
export const COLORES_AVATAR = [
  'bg-purple/15 text-purple',
  'bg-tertiary/15 text-tertiary',
  'bg-primary/15 text-primary',
  'bg-accent/40 text-on-accent',
  'bg-purple-dim/15 text-purple-dim dark:text-purple-light',
  'bg-error/10 text-error',
]

export function colorAvatar(semilla) {
  let h = 0
  for (const c of String(semilla || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORES_AVATAR[h % COLORES_AVATAR.length]
}
