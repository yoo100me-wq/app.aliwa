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
    // Motivo registrado por un CANCEL/ERROR de Meta. NO termina el flujo por sí
    // solo: el veredicto lo da el callback de FB.login (ver abajo).
    let motivoFallo = null

    // ---- Traza de diagnóstico -------------------------------------------
    // El popup corre en el navegador del cliente: cuando falla, el motivo
    // queda en SU consola y nunca llega al servidor. Se registra todo lo que
    // manda Meta y se sube al backend al terminar, pase lo que pase.
    const inicio = Date.now()
    const traza = []
    const anotar = (evento, datos) => {
      traza.push({ t: Date.now() - inicio, evento, datos })
      console.log(`[EmbeddedSignup] ${evento}`, datos ?? '')
    }
    anotar('inicio', { config_id: config.config_id })

    const reportar = (resultado) => {
      try {
        apiFetch('/api/whatsapp/diagnostico/', {
          method: 'POST',
          body: JSON.stringify({
            resultado,
            eventos: traza,
            navegador: navigator.userAgent,
          }),
        }).catch(() => {})
      } catch { /* el diagnóstico jamás debe romper el flujo */ }
    }

    // Un solo punto de salida: garantiza que el listener y el temporizador se
    // limpien SIEMPRE. Antes solo se quitaban en el callback de FB.login y en
    // CANCEL, así que un flujo colgado dejaba el listener vivo y los reintentos
    // apilaban uno nuevo cada vez.
    const finalizar = (fn, valor, resultado) => {
      if (terminado) return
      terminado = true
      clearTimeout(temporizador)
      window.removeEventListener('message', messageHandler)
      anotar(`fin:${resultado}`, null)
      reportar(resultado)
      fn(valor)
    }

    const temporizador = setTimeout(
      () => finalizar(reject, new Error('timeout'), 'timeout'),
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

        // TODO evento de Meta queda en la traza, incluidos los intermedios y
        // los que no conozcamos: es la única forma de ver dónde se atora.
        anotar(data.event || '(sin evento)', data.data)

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
          // OJO: un CANCEL de Meta NO significa que el alta fracasó.
          // Observado en producción: en coexistencia Meta manda CANCEL en el
          // paso del teléfono y ACTO SEGUIDO el callback de FB.login entrega un
          // `code` válido con status "connected" — el número queda vinculado
          // (la app del negocio ya dice "conectado a Aliwa"). Terminar aquí
          // tiraba ese code a la basura y jamás se llamaba al backend.
          // Se anota el motivo y se deja que decida FB.login.
          motivoFallo = `cancel:${data.data?.current_step || 'desconocido'}`
        } else if (data.event === 'ERROR') {
          const detalle = data.data?.error_message
            || data.data?.error_id
            || 'error desconocido de Meta'
          console.error('[EmbeddedSignup] Meta reportó ERROR:', data)
          motivoFallo = `meta: ${detalle}`
        }

        // Si el cliente pasó por cualquier pantalla del onboarding de la app
        // de WhatsApp Business, esto ES coexistencia — aunque no llegue el
        // evento FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING. Importa: con la
        // bandera en false el backend intentaría /register, y registrar un
        // número de coexistencia lo DESCONECTA de la app del negocio.
        if (String(data.data?.current_step || '').startsWith('WHATSAPP_BUSINESS_APP_ONBOARDING')) {
          coexistencia = true
        }
      } catch {
        // No es un mensaje de Facebook
      }
    }

    window.addEventListener('message', messageHandler)

    window.FB.login(
      function (response) {
        // El `code` es canjeable por tokens: se anota SI llegó, nunca su valor.
        anotar('fb_login_callback', {
          hay_authResponse: !!response?.authResponse,
          hay_code: !!response?.authResponse?.code,
          status: response?.status || null,
          waba_id: signupData.waba_id || null,
          coexistencia,
        })
        // ESTE callback es la fuente de verdad, no los eventos de mensaje.
        // Si trae un `code`, hay algo que canjear: se manda al backend aunque
        // Meta haya emitido CANCEL antes. Si el WABA no existiera de verdad,
        // el backend lo dirá con un error claro — mejor eso que no intentarlo.
        if (response?.authResponse?.code) {
          finalizar(resolve, {
            code: response.authResponse.code,
            sessionData: signupData,
            origin: window.location.origin,
            href: window.location.href,
            wabaId: signupData.waba_id || null,
            phoneNumberId: signupData.phone_number_id || null,
            coexistencia,
          }, motivoFallo ? `ok_tras_${motivoFallo}` : (coexistencia ? 'ok:coexistencia' : 'ok'))
        } else {
          // Sin code no hay nada que hacer: ahí sí fue cancelación real.
          const motivo = motivoFallo || 'cancel'
          finalizar(reject, new Error(motivo), motivo)
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
