import { apiFetch } from './api'

let fbInitialized = false
let metaConfig = null
let sdkPromesa = null

// El popup de Meta puede quedarse esperando indefinidamente: la pantalla del
// QR de coexistencia solo avanza cuando el cliente lo escanea desde su app de
// WhatsApp Business. Sin este tope la promesa nunca se resuelve y el botón se
// queda girando para siempre.
const TIMEOUT_MS = 10 * 60 * 1000

// Cuánto esperamos a que cargue el SDK de Facebook antes de rendirnos.
const TIMEOUT_SDK_MS = 15 * 1000

/**
 * Obtiene la config de Meta del backend y la cachea.
 */
async function getMetaConfig() {
  if (metaConfig) return metaConfig
  const { res, data } = await apiFetch('/api/whatsapp/config/')
  if (res.ok) {
    metaConfig = data
    return data
  }
  throw new Error('No se pudo obtener la configuración de Meta')
}

/**
 * Inicializa el Facebook SDK pidiendo el app_id al backend.
 *
 * Devuelve una promesa que SOLO resuelve cuando window.FB existe de verdad.
 * Antes esta función asignaba `fbAsyncInit` y devolvía de inmediato, así que
 * quien picara el botón antes de que cargara el SDK (red lenta, móvil) se
 * topaba con un "Facebook SDK no cargado" en seco.
 */
export function initFacebookSDK() {
  if (sdkPromesa) return sdkPromesa

  sdkPromesa = (async () => {
    const config = await getMetaConfig()

    const init = () => {
      window.FB.init({
        appId: config.app_id,
        cookie: true,
        xfbml: true,
        version: 'v22.0',
      })
      fbInitialized = true
    }

    if (window.FB) {
      init()
      return
    }

    await new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        // Se limpia la promesa cacheada para que un reintento vuelva a probar
        // en vez de quedar envenenada con el fallo de la primera carga.
        sdkPromesa = null
        reject(new Error('sdk_timeout'))
      }, TIMEOUT_SDK_MS)

      const anterior = window.fbAsyncInit
      window.fbAsyncInit = () => {
        if (typeof anterior === 'function') anterior()
        clearTimeout(t)
        init()
        resolve()
      }
    })
  })()

  return sdkPromesa
}

/**
 * Lanza el popup de Embedded Signup de WhatsApp.
 * Retorna una Promise con { code, wabaId, phoneNumberId, ... }.
 *
 * Rechaza con:
 *   'cancel'        — el cliente cerró el popup
 *   'timeout'       — el flujo se quedó a medias (típicamente el QR sin escanear)
 *   'sdk_timeout'   — no cargó el SDK de Facebook
 *   otro mensaje    — el error que reportó Meta (evento ERROR)
 */
export async function launchWhatsAppSignup() {
  const config = await getMetaConfig()

  await initFacebookSDK()

  return new Promise((resolve, reject) => {
    if (!window.FB || !fbInitialized) {
      reject(new Error('sdk_timeout'))
      return
    }

    let signupData = {}
    let coexistencia = false
    let terminado = false

    // Un solo punto de salida: garantiza que el listener y el temporizador se
    // limpien SIEMPRE. Antes solo se quitaban en el callback de FB.login y en
    // CANCEL, así que un flujo colgado dejaba el listener vivo y los reintentos
    // apilaban uno nuevo cada vez.
    const finalizar = (fn, valor) => {
      if (terminado) return
      terminado = true
      clearTimeout(temporizador)
      window.removeEventListener('message', messageHandler)
      fn(valor)
    }

    const temporizador = setTimeout(
      () => finalizar(reject, new Error('timeout')),
      TIMEOUT_MS,
    )

    const messageHandler = (event) => {
      // Aceptar cualquier subdominio de facebook.com (www, web, business, ...)
      let originHost
      try { originHost = new URL(event.origin).hostname } catch { return }
      if (!originHost.endsWith('facebook.com')) return
      try {
        const data = JSON.parse(event.data)
        if (data.type !== 'WA_EMBEDDED_SIGNUP') return

        if (data.event === 'FINISH') {
          signupData = data.data
        } else if (data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
          // Coexistencia: el cliente vinculó su app de WhatsApp Business
          // (escaneó el QR). El número sigue activo en su teléfono.
          // Meta manda SOLO waba_id aquí; el phone_number_id lo resuelve el
          // backend consultando los números del WABA.
          signupData = data.data || {}
          coexistencia = true
        } else if (data.event === 'FINISH_ONLY_WABA') {
          signupData = { waba_id: data.data?.waba_id }
        } else if (data.event === 'CANCEL') {
          finalizar(reject, new Error('cancel'))
        } else if (data.event === 'ERROR') {
          // Meta avisa aquí por qué falló el flujo. Antes este evento no se
          // atendía: el mensaje llegaba, se descartaba, y la promesa quedaba
          // colgada — el usuario veía la pantalla congelada y el motivo real
          // se perdía. Se conserva para poder diagnosticar.
          const detalle = data.data?.error_message
            || data.data?.error_id
            || 'error desconocido de Meta'
          console.error('[EmbeddedSignup] Meta reportó ERROR:', data)
          finalizar(reject, new Error(`meta: ${detalle}`))
        }
      } catch {
        // No es un mensaje de Facebook
      }
    }

    window.addEventListener('message', messageHandler)

    window.FB.login(
      function (response) {
        if (response?.authResponse) {
          finalizar(resolve, {
            code: response.authResponse.code,
            sessionData: signupData,
            origin: window.location.origin,
            href: window.location.href,
            wabaId: signupData.waba_id || null,
            phoneNumberId: signupData.phone_number_id || null,
            coexistencia,
          })
        } else {
          finalizar(reject, new Error('cancel'))
        }
      },
      {
        config_id: config.config_id,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          // Habilita la opción de COEXISTENCIA dentro del popup: el cliente
          // puede vincular su app de WhatsApp Business actual (QR) en lugar
          // de registrar un número nuevo. Si elige número nuevo, el flujo
          // termina con el evento FINISH normal.
          // OJO: esto es el estilo v2/v3, que Meta retira el 15-oct-2026. En
          // v4 la coexistencia se dispara sola al teclear un número que ya usa
          // la app de WhatsApp Business, y este featureType se quita.
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      }
    )
  })
}
