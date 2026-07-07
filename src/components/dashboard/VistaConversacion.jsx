import { useState, useRef, useEffect } from 'react'
import Icon from '../shared/Icon'

function formatearHoraMensaje(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
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

export default function VistaConversacion({ conversacion, onEnviar, cargando, onEditarLead }) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const scrollRef = useRef(null)

  const mensajes = conversacion?.mensajes || []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensajes.length])

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

  // Estado vacío
  if (!conversacion) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
        <div
          aria-hidden="true"
          className="w-80 h-60 mb-6 bg-primary dark:bg-primary/90 select-none pointer-events-none"
          style={{
            WebkitMaskImage: 'url(/images/conversaciones-vacio.svg)',
            maskImage: 'url(/images/conversaciones-vacio.svg)',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
          }}
        />
        <p className="font-display font-semibold text-[13px]">Todo en orden, selecciona una conversación para comenzar</p>
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
        const nombre = conversacion.nombre_mostrar || conversacion.cliente_nombre || 'Sin nombre'
        const esLead = nombre.startsWith('Lead ')
        return (
          <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant/20">
            <div className="w-10 h-10 bg-purple/10 flex items-center justify-center shrink-0">
              {esLead ? (
                <Icon name="badge" className="text-purple text-[20px] leading-none" />
              ) : (
                <span className="text-purple font-display font-semibold text-[13px]">
                  {nombre[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-[13px] truncate">{nombre}</h3>
              <p className="text-[12px] text-on-surface-variant">{conversacion.cliente_telefono}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <img src="/icons/whatsapp.svg" alt="" className="w-4 h-4 opacity-50" />
              <span className={`text-[11px] font-display font-semibold px-2 py-0.5 rounded-full ${
                conversacion.estado === 'activa' ? 'bg-accent/20 text-on-accent' :
                conversacion.estado === 'espera' ? 'bg-yellow-500/20 text-yellow-700' :
                'bg-surface-container-high text-on-surface-variant'
              }`}>
                {conversacion.estado}
              </span>
              <button
                onClick={onEditarLead}
                title="Editar lead"
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
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
              msg.tipo_remitente === 'cliente'
                ? 'bg-surface-container-high'
                : msg.tipo_remitente === 'bot'
                ? 'bg-tertiary/10'
                : 'bg-primary text-on-primary'
            }`}>
              <p className="text-[13px] leading-[1.6] whitespace-pre-wrap">{msg.contenido}</p>
              <div className={`flex items-center gap-1 mt-1 ${
                msg.tipo_remitente === 'cliente' ? 'justify-end' : 'justify-end'
              }`}>
                <span className={`text-[11px] ${
                  msg.tipo_remitente === 'agente' ? 'opacity-70' : 'text-on-surface-variant'
                }`}>
                  {formatearHoraMensaje(msg.creado_en)}
                </span>
                {msg.tipo_remitente === 'agente' && <EstadoMensaje estado={msg.wa_estado} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="px-5 py-4 border-t border-outline-variant/20">
        <div className="flex items-end gap-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
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
    </div>
  )
}
