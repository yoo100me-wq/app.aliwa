import { useState } from 'react'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'
import PanelLateral from './PanelLateral'
import { AccionesBurbuja } from './accionesMensaje'
import useErrorToast from '../../hooks/useErrorToast'

// Envío de mensajes interactivos (botones de respuesta o lista). Vive en el
// panel derecho, no en un modal: así se ve la conversación mientras se arma el
// mensaje. Antes era `ModalInteractivo`, definido dentro de VistaConversacion.
export default function EnviarInteractivoPanel({ onEnviar, onClose }) {
  const { t } = useLang()
  const tm = t.chats.modal
  const [tipo, setTipo] = useState('botones')
  const [cuerpo, setCuerpo] = useState('')
  const [botones, setBotones] = useState('')
  const [opciones, setOpciones] = useState('')
  const [tituloBoton, setTituloBoton] = useState(tm.tituloBotonDefault)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  // Los errores salen como notificación arriba a la derecha
  useErrorToast(error, setError)
  // Hoja de opciones simulada (lo que ve el cliente al tocar el botón de lista)
  const [hojaAbierta, setHojaAbierta] = useState(false)

  const campo =
    'w-full bg-surface-container-high/50 rounded-lg px-3 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none'
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

  // Una lista muestra UN botón con su título; las opciones no se ven hasta que
  // el cliente lo toca y se abre la hoja inferior (aquí es clicable para poder
  // revisarla antes de enviar). Con botones, cada respuesta rápida es una fila.
  const muestraLista = tipo === 'lista' && tituloBoton.trim()

  return (
    <PanelLateral titulo={tm.titulo} onClose={onClose} flotante>
      <div className="space-y-3">
        {/* Vista previa arriba: es un mensaje que enviamos, así que va en la
            burbuja propia sobre el lienzo del chat. */}
        {/* Alto FIJO: la previa crece con cada opción que escribes, y sin tope
            el formulario de abajo se iba moviendo bajo el cursor. Dentro se
            hace scroll, y el contenido se ancla abajo como en un chat. */}
        <div className="relative h-52 bg-lienzo-chat rounded-lg overflow-hidden">
          <div className="h-full overflow-y-auto p-3 flex flex-col items-end justify-end">
            <div className="max-w-[90%] min-w-0">
              <div className="bg-burbuja-propia text-on-burbuja-propia rounded-lg rounded-tr-none shadow-sm px-2.5 py-1.5">
                <p className={`text-[13px] font-body whitespace-pre-wrap leading-relaxed break-words ${
                  cuerpo.trim() ? '' : 'opacity-60 italic'
                }`}>
                  {cuerpo.trim() || tm.previaVacia}
                </p>
                <p className="text-[10px] opacity-60 text-right mt-0.5">10:30</p>

                <AccionesBurbuja
                  botones={tipo === 'botones' ? listaBotones : []}
                  tituloLista={muestraLista ? tituloBoton : ''}
                  onClickLista={() => setHojaAbierta(true)}
                />
              </div>
            </div>
          </div>

          {/* Hoja de opciones: lo que ve el cliente al tocar el botón de la
              lista. Se simula aquí para poder revisarla antes de enviar.
              Va FUERA del área con scroll para quedar anclada al recuadro. */}
          {hojaAbierta && (
            <div className="absolute inset-x-0 bottom-0 bg-surface-container-lowest rounded-t-xl shadow-lg border-t border-outline-variant">
              <div className="flex justify-center pt-1.5">
                <div className="h-1 w-8 rounded-full bg-outline-variant" />
              </div>
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setHojaAbierta(false)}
                  className="p-1 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <Icon name="close" className="text-[18px] leading-none" />
                </button>
                <span className="flex-1 text-center text-[13px] font-display font-semibold truncate">
                  {tituloBoton}
                </span>
                {/* Ancho igual al de la ✕ para que el título quede centrado */}
                <span className="w-[26px]" />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {listaOpciones.map((op, i) => (
                  <div
                    key={`${op}-${i}`}
                    className="flex items-center justify-between gap-2 px-4 py-2 border-t border-outline-variant/40"
                  >
                    <span className="text-[13px] font-body truncate">{op}</span>
                    <span className="w-4 h-4 rounded-full border border-outline shrink-0" />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-on-surface-variant text-center py-2">{tm.hojaPie}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {[['botones', tm.tabBotones], ['lista', tm.tabLista]].map(([valor, texto]) => (
            <button
              key={valor}
              onClick={() => { setTipo(valor); setHojaAbierta(false) }}
              className={`px-3 py-1.5 text-[12px] font-display font-semibold transition-colors ${
                tipo === valor
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface'
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


        <button
          onClick={enviar}
          disabled={!valido || enviando}
          className="flex items-center gap-1.5 px-4 py-2 border border-primary text-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:bg-primary/5 disabled:opacity-40"
        >
          <Icon name="send" className="text-[15px] leading-none" />
          {enviando ? tm.enviando : tm.enviar}
        </button>
      </div>
    </PanelLateral>
  )
}
