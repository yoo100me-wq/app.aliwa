// En dev, Vite proxy reenvía /api a localhost:8000 (mismo origen = cookies funcionan)
// En prod, se usa la URL completa del backend
const API_URL = import.meta.env.VITE_ENV === 'production'
  ? import.meta.env.VITE_API_URL
  : ''

// Para las URLs que NO pasan por apiFetch y las consume el navegador solo
// (un <img src>, un <video src>, un enlace de descarga). Sin esto, en
// producción quedan relativas y pegan contra app.aliwa.mx, que devuelve el
// index.html del SPA en vez del binario.
export function apiUrl(endpoint) {
  return `${API_URL}${endpoint}`
}

// Endpoints públicos (AllowAny): un 401 aquí es un error del propio flujo
// (p.ej. credenciales incorrectas en login), NO una sesión expirada — no redirige.
const ENDPOINTS_PUBLICOS = [
  '/api/auth/login/',
  '/api/auth/registro/',
  '/api/auth/enviar-codigo/',
  '/api/auth/verificar-codigo/',
  '/api/auth/confirmar-invitacion/',
  '/api/interesados/',
]

// Rutas del SPA que no requieren sesión (para no redirigir en bucle).
const RUTAS_PUBLICAS = ['/login', '/registro', '/confirmar-invitacion', '/openpay-callback', '/en']

// Si un endpoint PROTEGIDO responde 401 (no autenticado / sesión expirada),
// mandar a login. Solo 401 (no 403: ese es "autenticado pero sin permiso").
function redirigirSiNoAutorizado(endpoint, res) {
  if (res.status !== 401) return
  if (ENDPOINTS_PUBLICOS.some((p) => endpoint.startsWith(p))) return
  const path = window.location.pathname
  if (RUTAS_PUBLICAS.some((r) => path === r || path.startsWith(`${r}/`)) || path === '/' || path === '/en') return
  window.location.href = '/login'
}

// Header del negocio activo (seleccionado en el sidebar). El backend acota
// números/chats/plantillas a este negocio; si falta, usa el primero de la cuenta.
export const NEGOCIO_STORAGE_KEY = 'aliwa-negocio'
function headerNegocio() {
  try {
    const id = localStorage.getItem(NEGOCIO_STORAGE_KEY)
    return id ? { 'X-Aliwa-Negocio': id } : {}
  } catch {
    return {}
  }
}

/**
 * Fetch wrapper que envía cookies HttpOnly automáticamente.
 */
export async function apiFetch(endpoint, options = {}) {
  const config = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      // Header anti-CSRF: el backend exige esta cabecera en escrituras
      // autenticadas por cookie. Un sitio atacante no puede fijar headers
      // personalizados cross-site sin preflight CORS (restringido a nuestros
      // orígenes), así que su presencia prueba que la petición viene del SPA.
      'X-Aliwa-Client': '1',
      ...headerNegocio(),
      ...options.headers,
    },
  }

  const res = await fetch(`${API_URL}${endpoint}`, config)
  redirigirSiNoAutorizado(endpoint, res)
  const data = await res.json().catch(() => ({}))

  return { res, data }
}

/**
 * Igual que apiFetch pero para FormData (archivos): NO fija Content-Type
 * (el navegador pone el boundary de multipart) y conserva el header CSRF.
 */
export async function apiUpload(endpoint, formData) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Aliwa-Client': '1', ...headerNegocio() },
    body: formData,
  })
  redirigirSiNoAutorizado(endpoint, res)
  const data = await res.json().catch(() => ({}))
  return { res, data }
}
