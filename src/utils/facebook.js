import { apiFetch } from './api'

let fbInitialized = false
let metaConfig = null

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
 */
export async function initFacebookSDK() {
  if (fbInitialized) return

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
  } else {
    window.fbAsyncInit = init
  }
}

/**
 * Lanza el popup de Embedded Signup de WhatsApp.
 * Retorna una Promise con { code, wabaId, phoneNumberId }.
 */
export async function launchWhatsAppSignup() {
  const config = await getMetaConfig()

  if (!fbInitialized) await initFacebookSDK()

  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK no cargado'))
      return
    }

    let signupData = {}
    let coexistencia = false

    const messageHandler = (event) => {
      // Aceptar cualquier subdominio de facebook.com (www, web, business, ...)
      let originHost = ''
      try { originHost = new URL(event.origin).hostname } catch { return }
      if (!originHost.endsWith('facebook.com')) return
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH') {
            signupData = data.data
          } else if (data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
            // Coexistencia: el cliente vinculó su app de WhatsApp Business
            // (escaneó el QR). El número sigue activo en su teléfono.
            signupData = data.data || {}
            coexistencia = true
          } else if (data.event === 'FINISH_ONLY_WABA') {
            signupData = { waba_id: data.data.waba_id }
          } else if (data.event === 'CANCEL') {
            window.removeEventListener('message', messageHandler)
            reject(new Error('cancel'))
          }
        }
      } catch {
        // No es un mensaje de Facebook
      }
    }

    window.addEventListener('message', messageHandler)

    window.FB.login(
      function (response) {
        window.removeEventListener('message', messageHandler)

        if (response.authResponse) {
          resolve({
            code: response.authResponse.code,
            sessionData: signupData,
            origin: window.location.origin,
            href: window.location.href,
            wabaId: signupData.waba_id || null,
            phoneNumberId: signupData.phone_number_id || null,
            coexistencia,
          })
        } else {
          reject(new Error('cancel'))
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
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      }
    )
  })
}
