import { useState, useRef, useEffect } from 'react'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'
import { colorAvatar } from './avatarColor'
import EnviarPlantillaModal from './EnviarPlantillaModal'

function formatearHoraMensaje(iso, locale) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function EstadoMensaje({ estado }) {
  if (!estado || estado === 'enviado') {
    return <Icon name="check" className="text-[12px] opacity-50" />
  }
  if (estado === 'entregado') {
    return <Icon name="done_all" className="text-[12px] opacity-50" />
  }
  if (estado === 'leido') {
    return <Icon name="done_all" className="text-[12px] text-tertiary-fixed-dim" />
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

// Modal para enviar mensajes interactivos (botones de respuesta o lista)
function ModalInteractivo({ onEnviar, onClose }) {
  const { t } = useLang()
  const tm = t.chats.modal
  const [tipo, setTipo] = useState('botones')
  const [cuerpo, setCuerpo] = useState('')
  const [botones, setBotones] = useState('')
  const [opciones, setOpciones] = useState('')
  const [tituloBoton, setTituloBoton] = useState(tm.tituloBotonDefault)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const campo =
    'w-full bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg px-3 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none'
  const label = 'block text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1'

  const listaBotones = botones.split(',').map((b) => b.trim()).filter(Boolean)
  const listaOpciones = opciones.split('\n').map((o) => o.trim()).filter(Boolean)
  const valido = cuerpo.trim() && (tipo === 'botones'
    ? listaBotones.length >= 1 && listaBotones.length <= 3
    : listaOpciones.length >= 1 && listaOpciones.length <= 10)

  const enviar = async () => {
    setEnviando(true)
    setError('')
    const payload = tipo === 'botones'
      ? { tipo, cuerpo: cuerpo.trim(), botones: listaBotones }
      : { tipo, cuerpo: cuerpo.trim(), titulo_boton: tituloBoton, opciones: listaOpciones }
    const r = await onEnviar(payload)
    if (r?.ok) {
      onClose()
    } else {
      setError(r?.error || tm.errorEnvio)
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="border border-outline-variant bg-surface-container rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-[15px]">{tm.titulo}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1">
            <Icon name="close" className="text-[18px] leading-none" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            {[['botones', tm.tabBotones], ['lista', tm.tabLista]].map(([valor, texto]) => (
              <button
                key={valor}
                onClick={() => setTipo(valor)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-display font-semibold transition-colors ${
                  tipo === valor
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-lowest dark:bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>

          <div>
            <label className={label}>{tm.textoMensaje}</label>
            <textarea
              className={`${campo} min-h-16 resize-y`}
              maxLength={1024}
              placeholder={tm.textoPlaceholder}
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
            />
          </div>

          {tipo === 'botones' ? (
            <div>
              <label className={label}>{tm.botonesLabel}</label>
              <input
                className={campo}
                placeholder={tm.botonesPlaceholder}
                value={botones}
                onChange={(e) => setBotones(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div>
                <label className={label}>{tm.tituloBotonLabel}</label>
                <input
                  className={campo}
                  maxLength={20}
                  value={tituloBoton}
                  onChange={(e) => setTituloBoton(e.target.value)}
                />
              </div>
              <div>
                <label className={label}>{tm.opcionesLabel}</label>
                <textarea
                  className={`${campo} min-h-20 resize-y`}
                  placeholder={tm.opcionesPlaceholder}
                  value={opciones}
                  onChange={(e) => setOpciones(e.target.value)}
                />
              </div>
            </>
          )}

          {error && <p className="text-[12px] text-error">{error}</p>}

          <button
            onClick={enviar}
            disabled={!valido || enviando}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-40"
          >
            <Icon name="send" className="text-[15px] leading-none" />
            {enviando ? tm.enviando : tm.enviar}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VistaConversacion({
  conversacion, onEnviar, onEnviarMedia, onEnviarInteractivo, onEnviarPlantilla, onTyping,
  cargando, onEditarLead,
}) {
  const { lang, t } = useLang()
  const tc = t.chats
  const locale = lang === 'en' ? 'en-US' : 'es-MX'
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviandoArchivo, setEnviandoArchivo] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const [modalInteractivo, setModalInteractivo] = useState(false)
  const [modalPlantilla, setModalPlantilla] = useState(false)
  const scrollRef = useRef(null)
  const fileRef = useRef(null)
  const typingRef = useRef(0)

  const mensajes = conversacion?.mensajes || []

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

  // Estado vacío
  if (!conversacion) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
        <Icon name="inbox_2" className="text-[64px] mb-4 text-on-surface-variant/40" />
        <p className="font-display font-semibold text-[13px]">{tc.emptyChat}</p>
      </div>
    )
  }

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
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
        return (
          <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant/20">
            <div className={`w-10 h-10 ${colorAvatar(conversacion.cliente_telefono || conversacion.id)} flex items-center justify-center shrink-0`}>
              {esLead ? (
                <Icon name="badge" className="text-[20px] leading-none" />
              ) : (
                <span className="font-display font-semibold text-[13px]">
                  {nombre[0].toUpperCase()}
                </span>
              )}
            </div>
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
                conversacion.estado === 'activa' ? 'bg-accent/20 text-on-accent' :
                conversacion.estado === 'espera' ? 'bg-surface-container-highest text-on-surface' :
                'bg-surface-container-high text-on-surface-variant'
              }`}>
                {tc.estadoConversacion[conversacion.estado] || conversacion.estado}
              </span>
              <button
                onClick={onEditarLead}
                title={tc.editarLead}
                className="p-1 text-on-surface-variant hover:text-primary transition-colors"
              >
                <Icon name="edit" className="text-[16px] leading-none" />
              </button>
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
            <div className={`max-w-[75%] flex flex-col ${msg.tipo_remitente === 'cliente' ? 'items-start' : 'items-end'}`}>
            <div className={`px-4 py-2.5 rounded-2xl ${
              msg.tipo_remitente === 'cliente'
                ? 'bg-surface-container-high'
                : msg.tipo_remitente === 'bot'
                ? 'bg-tertiary/10'
                : 'bg-primary text-on-primary'
            }`}>
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
              {msg.contenido ? (
                <p className="text-[13px] leading-[1.6] whitespace-pre-wrap">{msg.contenido}</p>
              ) : !msg.url_media ? (
                <p className="text-[13px] leading-[1.6] italic opacity-70">[{tc.tipoMensaje[msg.tipo_mensaje] || msg.tipo_mensaje}]</p>
              ) : null}
              <div className={`flex items-center gap-1 mt-1 ${
                msg.tipo_remitente === 'cliente' ? 'justify-end' : 'justify-end'
              }`}>
                <span className={`text-[11px] ${
                  msg.tipo_remitente === 'agente' ? 'opacity-70' : 'text-on-surface-variant'
                }`}>
                  {formatearHoraMensaje(msg.creado_en, locale)}
                </span>
                {msg.tipo_remitente === 'agente' && <EstadoMensaje estado={msg.wa_estado} />}
              </div>
            </div>

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

      {/* Composer */}
      <div className="px-5 py-4 border-t border-outline-variant/20">
        {errorEnvio && (
          <p className="text-[12px] text-error mb-2">{errorEnvio}</p>
        )}
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
            onClick={() => setModalInteractivo(true)}
            title={tc.enviarInteractivoTitle}
            className="w-11 h-11 rounded-2xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 flex items-center justify-center transition-all shrink-0"
          >
            <Icon name="ballot" className="text-[18px]" />
          </button>
          {/* Plantilla aprobada (fuera de la ventana de 24h) */}
          <button
            onClick={() => setModalPlantilla(true)}
            title={tc.enviarPlantillaTitle}
            className="w-11 h-11 rounded-2xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 flex items-center justify-center transition-all shrink-0"
          >
            <Icon name="article" className="text-[18px]" />
          </button>
          <textarea
            value={texto}
            onChange={handleChangeTexto}
            onKeyDown={handleKeyDown}
            placeholder={tc.escribeMensaje}
            rows={1}
            className="flex-1 bg-surface-container-lowest rounded-2xl px-5 py-3 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none max-h-32"
          />
          <button
            onClick={handleEnviar}
            disabled={!texto.trim() || enviando}
            className="w-11 h-11 rounded-2xl bg-primary text-on-primary flex items-center justify-center transition-all active:scale-[0.95] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Icon name="send" className="text-[18px]" />
          </button>
        </div>
      </div>

      {/* Modal de envio de plantilla */}
      {modalPlantilla && (
        <EnviarPlantillaModal
          onEnviar={onEnviarPlantilla}
          onClose={() => setModalPlantilla(false)}
        />
      )}

      {/* Modal de mensaje interactivo */}
      {modalInteractivo && (
        <ModalInteractivo
          onEnviar={onEnviarInteractivo}
          onClose={() => setModalInteractivo(false)}
        />
      )}
    </div>
  )
}
