// Mapa de ladas por país. `prefijo` es lo que se antepone al número local
// para formar el formato de WhatsApp (México lleva el 1 extra: 521...).
export const LADAS = [
  { codigo: 'MX', nombre: 'México', bandera: '🇲🇽', lada: '+52', prefijo: '521' },
  { codigo: 'US', nombre: 'Estados Unidos', bandera: '🇺🇸', lada: '+1', prefijo: '1' },
  { codigo: 'GT', nombre: 'Guatemala', bandera: '🇬🇹', lada: '+502', prefijo: '502' },
  { codigo: 'CO', nombre: 'Colombia', bandera: '🇨🇴', lada: '+57', prefijo: '57' },
  { codigo: 'AR', nombre: 'Argentina', bandera: '🇦🇷', lada: '+54', prefijo: '54' },
  { codigo: 'PE', nombre: 'Perú', bandera: '🇵🇪', lada: '+51', prefijo: '51' },
  { codigo: 'CL', nombre: 'Chile', bandera: '🇨🇱', lada: '+56', prefijo: '56' },
  { codigo: 'ES', nombre: 'España', bandera: '🇪🇸', lada: '+34', prefijo: '34' },
]

// Devuelve el teléfono en formato WhatsApp (prefijo+local). Si el usuario ya
// escribió el número con lada (con o sin +), se respeta tal cual.
export function telefonoConLada(entrada, pais) {
  const digitos = String(entrada || '').replace(/\D/g, '')
  if (!digitos) return ''
  const ladaDigitos = pais.lada.replace('+', '')
  // Solo cuenta como "ya trae lada" si es MÁS largo que un número local
  // (10 díg.): un local que empiece en 52 no debe confundirse con la lada.
  if (digitos.length > 10 && (digitos.startsWith(pais.prefijo) || digitos.startsWith(ladaDigitos))) {
    return digitos
  }
  return pais.prefijo + digitos
}
