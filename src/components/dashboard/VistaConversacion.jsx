import { useState, useRef, useEffect, useMemo } from 'react'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'
import { colorAvatar } from './avatarColor'
import { iniciales } from '../../utils/iniciales'
import { separarAcciones } from '../../utils/accionesMensaje'
import { AccionesBurbuja } from './accionesMensaje'
import useErrorToast from '../../hooks/useErrorToast'

function formatearHoraMensaje(iso, locale) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

// Texto corto que representa a un mensaje dentro de una cita.
function previewMensaje(msg, tc) {
  const { texto } = separarAcciones(msg.contenido || '')
  if (texto.trim()) return texto.trim()
  return `[${tc.tipoMensaje[msg.tipo_mensaje] || msg.tipo_mensaje}]`
}

// Emojis del selector rápido de reacciones (los mismos que ofrece WhatsApp).
const EMOJIS_REACCION = ['👍', '❤️', '😂', '😮', '😢', '🙏']

// "Sucursal Centro: 19.4326,-99.1332" o "19.4326,-99.1332" → sus partes.
// Es el formato con el que se guardan las ubicaciones en los dos sentidos.
function parsearUbicacion(contenido) {
  const bruto = (contenido || '').trim()
  const corte = bruto.lastIndexOf(':')
  const coords = (corte === -1 ? bruto : bruto.slice(corte + 1)).trim()
  const [lat, lon] = coords.split(',').map((n) => n.trim())
  if (!lat || !lon || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return null
  return { etiqueta: corte === -1 ? '' : bruto.slice(0, corte).trim(), lat, lon }
}

// Cita del mensaje al que se responde (Meta lo manda en context.id y el
// backend lo guarda en wa_contexto_id). `citado` viene undefined cuando el
// original quedó fuera de la página de mensajes cargada.
function MensajeCitado({ citado, nombreCliente, tc }) {
  const autor = !citado
    ? ''
    : citado.tipo_remitente === 'cliente'
    ? nombreCliente
    : tc.citaTu

  return (
    <div className={`mb-1.5 py-1 pl-2 pr-2 rounded border-l-[3px] ${TINTE_BORDE} ${TINTE_FONDO}`}>
      {autor && (
        <p className="text-[11px] font-display font-semibold leading-tight opacity-90">{autor}</p>
      )}
      <p className="text-[12px] leading-snug opacity-75 line-clamp-2">
        {citado ? previewMensaje(citado, tc) : tc.citaNoDisponible}
      </p>
    </div>
  )
}

// Reparto tipo WhatsApp: el mensaje PROPIO de un lado y el del cliente del
// otro, cada uno con su esquina superior cuadrada del lado del remitente. Los
// colores salen de tokens del tema (verde té y morado), así que el modo oscuro
// se resuelve solo en index.css.
const BURBUJA = {
  agente: 'bg-burbuja-propia text-on-burbuja-propia rounded-tr-none',
  cliente: 'bg-burbuja-cliente text-on-burbuja-cliente rounded-tl-none',
  bot: 'bg-burbuja-cliente text-on-burbuja-cliente rounded-tl-none',
}

// Tinte para citas y pills DENTRO de la burbuja. Sigue al color de TEXTO de la
// burbuja (currentColor), así que funciona igual sobre las burbujas claras del
// modo claro y las oscuras del modo oscuro, sin condicionales.
const TINTE_BORDE = 'border-current/30'
const TINTE_FONDO = 'bg-current/10'

function EstadoMensaje({ estado }) {
  if (!estado || estado === 'enviado') {
    return <Icon name="check" className="text-[12px] opacity-50" />
  }
  if (estado === 'entregado') {
    return <Icon name="done_all" className="text-[12px] opacity-50" />
  }
  if (estado === 'leido') {
    // Las dos palomitas azules de WhatsApp
    return <Icon name="done_all" className="text-[12px] text-[#53bdeb]" />
  }
  if (estado === 'fallido') {
    return <Icon name="error" className="text-[12px] text-error" />
  }
  return null
}

// Explicación legible de por qué Meta no entregó un mensaje (status failed)
function motivoFallo(msg, tc) {
  if (msg.wa_estado !== 'fallido') return ''
  return tc.erroresWa[msg.wa_codigo_error] || tc.falloGenerico(msg.wa_codigo_error || '?')
}

export default function VistaConversacion({
  conversacion, onEnviar, onEnviarMedia, onTyping, cargando,
  onEditarLead, leadPanelAbierto, onReaccionar,
  bloqueado = false, onAlternarBloqueo,
  // Plantillas, interactivos y ubicación se arman en el panel derecho (lo
  // monta ConversacionesPanel); aquí solo van los botones que lo abren.
  onAbrirPlantilla, onAbrirInteractivo, onAbrirUbicacion, onAbrirFormulario, panelActivo,
}) {
  const { lang, t } = useLang()
  const tc = t.chats
  const locale = lang === 'en' ? 'en-US' : 'es-MX'
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviandoArchivo, setEnviandoArchivo] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const [cambiandoBloqueo, setCambiandoBloqueo] = useState(false)
  // Guarda el id de la conversación cuya confirmación de bloqueo está abierta,
  // no un booleano: así cambiar de chat la descarta sola, sin un efecto.
  const [confirmaBloqueoDe, setConfirmaBloqueoDe] = useState('')
  // Los errores salen como notificación arriba a la derecha
  useErrorToast(errorEnvio, setErrorEnvio)
  const scrollRef = useRef(null)
  const fileRef = useRef(null)
  const typingRef = useRef(0)

  const nombreCliente = conversacion?.apodo || conversacion?.cliente_nombre || tc.sinNombre

  // Una reacción NO es una burbuja: WhatsApp la pinta pegada al mensaje al que
  // apunta. Se sacan de la lista y se indexan por mensaje objetivo. Cada
  // remitente tiene UNA reacción vigente: la última gana, y un emoji vacío
  // significa que la quitó.
  const { mensajes, reaccionesPorWamid } = useMemo(() => {
    const visibles = []
    const vigentes = new Map() // `${objetivo}|${remitente}` -> emoji
    for (const msg of conversacion?.mensajes || []) {
      // Una reacción nunca va al hilo, ni siquiera si no sabemos a qué mensaje
      // apunta: sin wa_contexto_id caería como burbuja de texto con un emoji
      // suelto, que es justo lo que no debe verse.
      if (msg.tipo_mensaje === 'reaccion') {
        if (msg.wa_contexto_id) {
          vigentes.set(`${msg.wa_contexto_id}|${msg.tipo_remitente}`, msg.contenido || '')
        }
        continue
      }
      visibles.push(msg)
    }
    const porObjetivo = new Map()
    for (const [clave, emoji] of vigentes) {
      if (!emoji) continue
      const [objetivo, remitente] = clave.split('|')
      const lista = porObjetivo.get(objetivo) || []
      lista.push({ emoji, propia: remitente !== 'cliente' })
      porObjetivo.set(objetivo, lista)
    }
    return { mensajes: visibles, reaccionesPorWamid: porObjetivo }
  }, [conversacion?.mensajes])

  // Emoji con el que ya reaccionó el negocio a un mensaje (para poder quitarlo
  // tocándolo de nuevo, como en WhatsApp).
  const miReaccion = (waMensajeId) =>
    (reaccionesPorWamid.get(waMensajeId) || []).find((r) => r.propia)?.emoji || ''

  const confirmandoBloqueo = Boolean(conversacion?.id) && confirmaBloqueoDe === conversacion.id

  // Bloquear pide confirmación (se deja de recibir al cliente); desbloquear no.
  const alternarBloqueo = async () => {
    if (!bloqueado && !confirmandoBloqueo) {
      setConfirmaBloqueoDe(conversacion.id)
      return
    }
    setConfirmaBloqueoDe('')
    setCambiandoBloqueo(true)
    const r = await onAlternarBloqueo()
    if (!r?.ok) setErrorEnvio(r?.error || tc.errorBloqueo)
    setCambiandoBloqueo(false)
  }

  const reaccionar = async (waMensajeId, emoji) => {
    if (!onReaccionar || !waMensajeId) return
    // Tocar el mismo emoji lo quita.
    const r = await onReaccionar(waMensajeId, miReaccion(waMensajeId) === emoji ? '' : emoji)
    if (!r?.ok) setErrorEnvio(r?.error || tc.errorReaccion)
  }

  // Índice wamid -> mensaje, para resolver las citas (wa_contexto_id).
  // Depende de conversacion?.mensajes (referencia estable) y no de `mensajes`,
  // que es un arreglo nuevo en cada render cuando aún no hay mensajes.
  const porWamid = useMemo(() => {
    const indice = new Map()
    for (const msg of conversacion?.mensajes || []) {
      if (msg.wa_mensaje_id) indice.set(msg.wa_mensaje_id, msg)
    }
    return indice
  }, [conversacion?.mensajes])

  // Texto y acciones (botones/lista) ya separados, una vez por mensaje en vez
  // de en cada uno de los tres puntos donde se pintan.
  const accionesPorMensaje = useMemo(() => {
    const indice = new Map()
    for (const msg of conversacion?.mensajes || []) {
      indice.set(msg.id, separarAcciones(msg.contenido || ''))
    }
    return indice
  }, [conversacion?.mensajes])
  const acciones = (msg) =>
    accionesPorMensaje.get(msg.id) || separarAcciones(msg.contenido || '')

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensajes.length])

  // URL del proxy de media (la URL directa de Meta expira en ~5 min)
  const mediaUrl = (msg) =>
    `/api/conversaciones/${conversacion.id}/media/${encodeURIComponent(msg.url_media)}/`

  const handleEnviar = async () => {
    const contenido = texto.trim()
    if (!contenido || enviando) return

    setTexto('')
    setEnviando(true)
    await onEnviar(contenido)
    setEnviando(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  // "Escribiendo..." en el WhatsApp del cliente, máx. una vez cada 20s
  // (el indicador de Meta dura ~25s o hasta que se envía el mensaje)
  const handleChangeTexto = (e) => {
    setTexto(e.target.value)
    const ahora = Date.now()
    if (onTyping && e.target.value && ahora - typingRef.current > 20000) {
      typingRef.current = ahora
      onTyping()
    }
  }

  // Adjuntar archivo: se envía de inmediato; el texto del composer va de caption
  const handleArchivo = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo || enviandoArchivo) return
    setEnviandoArchivo(true)
    setErrorEnvio('')
    const r = await onEnviarMedia(archivo, texto.trim())
    if (r?.ok) setTexto('')
    else setErrorEnvio(r?.error || tc.errorArchivo)
    setEnviandoArchivo(false)
  }

  // Sin conversación abierta no hay lienzo de mensajes que justifique el gris:
  // el panel va del color de las bandejas (blanco en claro, oscuro en oscuro).
  const fondoVacio =
    'flex flex-col items-center justify-center h-full bg-surface-container-lowest text-on-surface-variant'

  // Estado vacío
  if (!conversacion) {
    return (
      <div className={fondoVacio}>
        {/* Sin color propio: hereda el text-on-surface-variant del contenedor
            y queda al mismo tono que el mensaje de abajo. */}
        <Icon name="inventory_2" className="text-[44px] mb-3" />
        <p className="font-display font-semibold text-[13px]">{tc.emptyChat}</p>
      </div>
    )
  }

  if (cargando) {
    return (
      <div className={fondoVacio}>
        <Icon name="hourglass_empty" className="text-[28px] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {(() => {
        const nombre = conversacion.nombre_mostrar || conversacion.cliente_nombre || tc.sinNombre
        const esLead = nombre.startsWith('Lead ')
        // Barra superior: mismo fondo que las bandejas, no el lienzo del chat,
        // para que el encabezado se lea como parte del panel.
        return (
          <div className="flex items-center gap-3 px-5 py-4 bg-surface-container-lowest border-b border-outline-variant/20">
            {conversacion.cliente_foto ? (
              <img src={conversacion.cliente_foto} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className={`w-10 h-10 rounded-full ${colorAvatar(conversacion.cliente_telefono || conversacion.id)} flex items-center justify-center shrink-0`}>
                {esLead ? (
                  <Icon name="person" className="text-[20px] leading-none" />
                ) : (
                  <span className="font-display font-semibold text-[13px]">
                    {iniciales(nombre)}
                  </span>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-[13px] truncate">{nombre}</h3>
              <p className="text-[12px] text-on-surface-variant truncate">
                {esLead && conversacion.apodo ? `~ ${conversacion.apodo} · ` : ''}
                {conversacion.cliente_telefono}
                {conversacion.numero_telefono ? ` · ${tc.via} ${conversacion.numero_telefono}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <img src="/icons/whatsapp.svg" alt="" className="w-4 h-4 opacity-50" />
              <span className={`text-[11px] font-display font-semibold px-2 py-0.5 rounded-full ${
                // Sobre un TINTE de accent el texto va en el color de texto del
                // tema, no en on-accent (que es para el relleno sólido y queda
                // ilegible en ambos modos). Mismo patrón que los badges de
                // Plantillas y Contactos.
                conversacion.estado === 'activa' ? 'bg-accent/20 text-on-surface' :
                conversacion.estado === 'espera' ? 'bg-surface-container-highest text-on-surface' :
                'bg-surface-container-high text-on-surface-variant'
              }`}>
                {tc.estadoConversacion[conversacion.estado] || conversacion.estado}
              </span>
              {bloqueado && (
                <span className="text-[11px] font-display font-semibold px-2 py-0.5 rounded-full bg-error/15 text-error">
                  {tc.bloqueado}
                </span>
              )}
              {/* Bloquear/desbloquear al contacto en Meta: deja de llegar su
                  spam sin tener que borrar la conversación. */}
              {onAlternarBloqueo && (
                confirmandoBloqueo ? (
                  <span className="ml-0.5 flex items-center gap-1">
                    <button
                      onClick={alternarBloqueo}
                      disabled={cambiandoBloqueo}
                      className="text-[11px] font-display font-semibold px-2 py-0.5 rounded-full bg-error text-on-error disabled:opacity-40"
                    >
                      {tc.bloquear}
                    </button>
                    <button
                      onClick={() => setConfirmaBloqueoDe('')}
                      aria-label={tc.cancelar}
                      className="p-1 text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      <Icon name="close" className="text-[16px] leading-none" />
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={alternarBloqueo}
                    disabled={cambiandoBloqueo}
                    title={bloqueado ? tc.desbloquear : tc.bloquear}
                    aria-label={bloqueado ? tc.desbloquear : tc.bloquear}
                    className={`ml-0.5 p-1 transition-colors disabled:opacity-40 ${
                      bloqueado ? 'text-error' : 'text-on-surface-variant hover:text-error'
                    }`}
                  >
                    <Icon name={bloqueado ? 'lock_open' : 'block'} className="text-[18px] leading-none" />
                  </button>
                )
              )}
              {/* Abrir/cerrar el panel del lead. Antes era una lengüeta flotante
                  que solo aparecía al pasar el mouse; ahora vive fija aquí. */}
              {onEditarLead && (
                <button
                  onClick={onEditarLead}
                  title={tc.editarLead}
                  aria-label={tc.editarLead}
                  aria-pressed={leadPanelAbierto}
                  className={`ml-0.5 p-1 transition-colors ${
                    leadPanelAbierto
                      ? 'text-primary'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  <Icon name="split_scene" className="text-[18px] leading-none" />
                </button>
              )}
            </div>
          </div>
        )
      })()}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {mensajes.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.tipo_remitente === 'cliente' ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`group relative max-w-[75%] flex flex-col ${msg.tipo_remitente === 'cliente' ? 'items-start' : 'items-end'}`}>
            {/* Selector rápido de reacciones: aparece al pasar el mouse, del
                lado contrario al remitente para no tapar la burbuja. */}
            {onReaccionar && msg.wa_mensaje_id && (
              <div
                className={`absolute -top-3.5 z-20 hidden group-hover:flex items-center gap-1 px-2 py-1 rounded-full bg-surface-container-lowest shadow-lg ring-1 ring-outline-variant ${
                  msg.tipo_remitente === 'cliente' ? 'left-2' : 'right-2'
                }`}
              >
                {EMOJIS_REACCION.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    title={miReaccion(msg.wa_mensaje_id) === emoji ? tc.quitarReaccion : tc.reaccionar}
                    onClick={() => reaccionar(msg.wa_mensaje_id, emoji)}
                    className={`w-7 h-7 flex items-center justify-center text-[18px] leading-none rounded-full transition-transform hover:scale-125 ${
                      miReaccion(msg.wa_mensaje_id) === emoji ? 'bg-primary/20' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <div className={`px-2.5 py-1.5 rounded-lg shadow-sm ${BURBUJA[msg.tipo_remitente] || BURBUJA.bot}`}>
              {msg.wa_contexto_id && (
                <MensajeCitado
                  citado={porWamid.get(msg.wa_contexto_id)}
                  nombreCliente={nombreCliente}
                  tc={tc}
                />
              )}
              {msg.url_media && msg.tipo_mensaje === 'imagen' && (
                <img
                  src={mediaUrl(msg)}
                  alt=""
                  loading="lazy"
                  onClick={() => window.open(mediaUrl(msg), '_blank')}
                  className="rounded-xl max-w-full max-h-64 object-contain mb-1 cursor-pointer"
                />
              )}
              {msg.url_media && msg.tipo_mensaje === 'video' && (
                <video src={mediaUrl(msg)} controls preload="metadata" className="rounded-xl max-w-full max-h-64 mb-1" />
              )}
              {msg.url_media && msg.tipo_mensaje === 'audio' && (
                <audio src={mediaUrl(msg)} controls preload="metadata" className="mb-1 max-w-[240px]" />
              )}
              {msg.url_media && msg.tipo_mensaje === 'documento' && (
                <a
                  href={mediaUrl(msg)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 mb-1 hover:opacity-80"
                >
                  <Icon name="description" className="text-[20px] leading-none shrink-0" />
                  <span className="text-[13px] underline">{tc.abrirDocumento}</span>
                </a>
              )}
              {/* Ubicación: en vez del texto crudo "nombre: lat,lon", un
                  enlace al mapa con el nombre del lugar. */}
              {msg.tipo_mensaje === 'ubicacion' && parsearUbicacion(msg.contenido) ? (
                (() => {
                  const loc = parsearUbicacion(msg.contenido)
                  return (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lon}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 hover:opacity-80"
                    >
                      <Icon name="location_on" className="text-[20px] leading-none shrink-0" />
                      <span className="min-w-0">
                        {loc.etiqueta && (
                          <span className="block text-[13px] font-display font-semibold truncate">{loc.etiqueta}</span>
                        )}
                        <span className="block text-[12px] underline">{tc.verEnMapa}</span>
                      </span>
                    </a>
                  )
                })()
              ) : msg.contenido ? (
                acciones(msg).texto && (
                  <p className="text-[13px] leading-[1.6] whitespace-pre-wrap">{acciones(msg).texto}</p>
                )
              ) : !msg.url_media ? (
                <p className="text-[13px] leading-[1.6] italic opacity-70">[{tc.tipoMensaje[msg.tipo_mensaje] || msg.tipo_mensaje}]</p>
              ) : null}
              {/* Hora y palomitas abajo a la derecha, dentro de la burbuja.
                  El color lo hereda del texto de la burbuja, así que un solo
                  nivel de opacidad sirve para los tres remitentes. */}
              <div className="flex items-center justify-end gap-1 -mb-0.5 mt-0.5">
                <span className="text-[11px] opacity-60">
                  {formatearHoraMensaje(msg.creado_en, locale)}
                </span>
                {msg.tipo_remitente === 'agente' && <EstadoMensaje estado={msg.wa_estado} />}
              </div>

              {/* Botones y lista al final de la burbuja, después de la hora y
                  separados por divisorias: una sola tarjeta continua. */}
              <AccionesBurbuja
                botones={acciones(msg).botones}
                tituloLista={acciones(msg).tituloLista}
              />
            </div>

            {/* Reacciones colgando de la esquina inferior de la burbuja, como
                en WhatsApp. La propia se puede tocar para quitarla. */}
            {(reaccionesPorWamid.get(msg.wa_mensaje_id) || []).length > 0 && (
              <div className="flex items-center gap-0.5 -mt-1.5 px-1.5 py-0.5 rounded-full bg-surface-container-lowest shadow-sm border border-outline-variant/40">
                {(reaccionesPorWamid.get(msg.wa_mensaje_id) || []).map((r, i) => (
                  r.propia && onReaccionar ? (
                    <button
                      key={`${r.emoji}-${i}`}
                      type="button"
                      title={tc.quitarReaccion}
                      onClick={() => reaccionar(msg.wa_mensaje_id, r.emoji)}
                      className="text-[13px] leading-none hover:opacity-70 transition-opacity"
                    >
                      {r.emoji}
                    </button>
                  ) : (
                    <span key={`${r.emoji}-${i}`} className="text-[13px] leading-none">{r.emoji}</span>
                  )
                ))}
              </div>
            )}

            {/* Causa del fallo de entrega, DEBAJO de la burbuja (legible) */}
            {motivoFallo(msg, tc) && (
              <div className="flex items-start gap-1 mt-1 max-w-full bg-error/10 rounded-lg px-2 py-1">
                <Icon name="error" className="text-error text-[13px] leading-none mt-0.5 shrink-0" />
                <p className="text-[11px] text-error leading-relaxed">
                  {motivoFallo(msg, tc)}
                  {String(msg.wa_codigo_error) === '131042' && conversacion.waba_id && (
                    <>
                      {' '}
                      <a
                        href={`https://business.facebook.com/billing_hub/payment_settings?asset_id=${conversacion.waba_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-display font-semibold underline"
                      >
                        {tc.configurarPago}
                      </a>
                    </>
                  )}
                </p>
              </div>
            )}
            </div>
          </div>
        ))}
      </div>

      {/* Composer — barra inferior: mismo fondo que las bandejas (ver header) */}
      <div className="px-5 py-4 bg-surface-container-lowest border-t border-outline-variant/20">
        <div className="flex items-end gap-2">
          {/* Adjuntar archivo */}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            onChange={handleArchivo}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={enviandoArchivo}
            title={tc.adjuntarArchivo}
            className="w-11 h-11 rounded-2xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
          >
            <Icon name={enviandoArchivo ? 'hourglass_empty' : 'attach_file'} className={`text-[18px] ${enviandoArchivo ? 'animate-pulse' : ''}`} />
          </button>
          {/* Mensaje interactivo (botones/lista) */}
          <button
            onClick={onAbrirInteractivo}
            title={tc.enviarInteractivoTitle}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
              panelActivo === 'interactivo'
                ? 'text-primary bg-primary/5'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
            }`}
          >
            <Icon name="ballot" className="text-[18px]" />
          </button>
          {/* Formularios de Aliwa: agendar, cobrar, facturar. Van tras un "+"
              porque son la puerta a varias acciones, no una sola. */}
          <button
            onClick={onAbrirFormulario}
            title={tc.enviarFormularioTitle}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
              panelActivo === 'formulario'
                ? 'text-primary bg-primary/5'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
            }`}
          >
            <Icon name="add_circle" className="text-[18px]" />
          </button>
          {/* Ubicación (el mapa dentro del chat) */}
          <button
            onClick={onAbrirUbicacion}
            title={tc.enviarUbicacionTitle}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
              panelActivo === 'ubicacion'
                ? 'text-primary bg-primary/5'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
            }`}
          >
            <Icon name="location_on" className="text-[18px]" />
          </button>
          {/* Plantilla aprobada (fuera de la ventana de 24h) */}
          <button
            onClick={onAbrirPlantilla}
            title={tc.enviarPlantillaTitle}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
              panelActivo === 'plantilla'
                ? 'text-primary bg-primary/5'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
            }`}
          >
            <Icon name="article" className="text-[18px]" />
          </button>
          <textarea
            value={texto}
            onChange={handleChangeTexto}
            onKeyDown={handleKeyDown}
            placeholder={tc.escribeMensaje}
            rows={1}
            // La caja la define el BORDE: el relleno (#f0f0f1) contra la barra
            // blanca es una diferencia mínima, y outline-variant (#e5e5e7) es
            // el gris de las divisorias, demasiado tenue para un campo. Con
            // outline/40 se ve en los dos modos sin endurecerse.
            className="flex-1 bg-surface-container-high border border-outline/40 rounded-2xl px-5 py-3 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:border-primary/50 transition-colors resize-none max-h-32"
          />
          <button
            onClick={handleEnviar}
            disabled={!texto.trim() || enviando}
            className="w-11 h-11 border border-primary text-primary flex items-center justify-center transition-all active:scale-[0.95] hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Icon name="send" className="text-[18px]" />
          </button>
        </div>
      </div>

    </div>
  )
}
