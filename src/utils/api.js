// En dev, Vite proxy reenvía /api a localhost:8000 (mismo origen = cookies funcionan)
// En prod, se usa la URL completa del backend
const API_URL = import.meta.env.VITE_ENV === 'production'
  ? import.meta.env.VITE_API_URL
  : ''

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
      ...options.headers,
    },
  }

  const res = await fetch(`${API_URL}${endpoint}`, config)
  const data = await res.json()

  return { res, data }
}
