import { useState, useEffect } from 'react'
import { apiFetch } from '../../utils/api'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'
import PanelLateral from './PanelLateral'
import { AccionesBurbuja } from './accionesMensaje'
import useErrorToast from '../../hooks/useErrorToast'

// Los tres formularios que Aliwa provisiona en la WABA de cada cliente. Se
// identifican por el nombre del flow: solo un formulario nuestro puede hablar
// con nuestro endpoint de datos en vivo, así que el agente elige entre estos,
// no entre cualquier flow suelto de la cuenta.
// `activable` = ya existe del lado del backend y se puede dar de alta hoy.
// Agendar y pagar aparecen para que se vea a dónde va, pero todavía no hay
// nada que provisionar.
const ESTANDAR = [
  { clave: 'aliwa_agendar', activable: false },
  { clave: 'aliwa_pagar', activable: false },
  { clave: 'aliwa_facturar', activable: true },
]

// Envío de un formulario (WhatsApp Flow). Son formas RÍGIDAS: el texto que las
// acompaña lo redacta Aliwa, así que el caso normal es un clic y se manda. Solo
// si el negocio quiere otra redacción aparecen los campos.
export default function EnviarFormularioPanel({ onEnviar, onClose }) {
  const { t } = useLang()
  const tf = t.chats.formulario
  const tfo = t.formularios
  const [formularios, setFormularios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [activando, setActivando] = useState('')
  const [enviando, setEnviando] = useState('')
  const [error, setError] = useState('')
  useErrorToast(error, setError)

  // Modo redacción libre: se entra a propósito, no es el camino normal.
  const [personalizando, setPersonalizando] = useState(false)
  const [flowId, setFlowId] = useState('')
  const [clave, setClave] = useState('')
  // Se arrastra al modo redacción para no perder si el flow está sin publicar.
  const [esBorrador, setEsBorrador] = useState(false)
  const [encabezado, setEncabezado] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [pie, setPie] = useState('')
  const [cta, setCta] = useState('')

  const campo =
    'w-full bg-surface-container-high/50 rounded-lg px-3 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none'
  const label = 'block text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1'

  useEffect(() => {
    let vigente = true
    apiFetch('/api/whatsapp/flows/')
      .then(({ res, data }) => {
        if (!vigente || !res.ok) return
        // Se listan también los BORRADORES: Meta sí los deja enviar, pero hay
        // que pedírselo con mode='draft' (si no, los rechaza). El celular les
        // pinta un banner de "borrador" y la respuesta llega igual. Mientras
        // publicar siga bloqueado, este es el único camino para probarlos.
        setFormularios(
          (data.formularios || []).filter(
            (f) => f.estado === 'PUBLISHED' || f.estado === 'DRAFT',
          ),
        )
      })
      .catch(() => {})
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [])

  // Cada formulario estándar con su mensaje ya redactado y el flow que le
  // corresponde (null si a este negocio todavía no se le provisionó).
  const tarjetas = ESTANDAR.map(({ clave, activable }) => ({
    clave,
    activable,
    ...tfo.estandar[clave],
    flow: formularios.find((f) => f.nombre === clave) || null,
  }))

  const enviarTarjeta = async (c) => {
    setEnviando(c.clave)
    setError('')
    const r = await onEnviar({
      flow_id: c.flow.id,
      // El backend usa esto para precargar los datos que ya tiene del contacto.
      estandar: c.clave,
      encabezado: c.mensaje.encabezado,
      cuerpo: c.mensaje.cuerpo,
      pie: c.mensaje.pie,
      cta: c.mensaje.cta,
      modo: c.flow.estado === 'DRAFT' ? 'draft' : 'published',
    })
    if (r?.ok) onClose()
    else {
      setError(r?.error || tf.error)
      setEnviando('')
    }
  }

  const enviarPersonalizado = async () => {
    setEnviando(clave)
    setError('')
    const r = await onEnviar({
      flow_id: flowId,
      estandar: clave,
      encabezado: encabezado.trim(),
      cuerpo: cuerpo.trim(),
      pie: pie.trim(),
      cta: cta.trim(),
      modo: esBorrador ? 'draft' : 'published',
    })
    if (r?.ok) onClose()
    else {
      setError(r?.error || tf.error)
      setEnviando('')
    }
  }

  // Pasar a redacción libre arranca del texto de Aliwa, no de campos vacíos.
  const personalizar = (c) => {
    setPersonalizando(true)
    setFlowId(c.flow.id)
    setClave(c.clave)
    setEsBorrador(c.flow.estado === 'DRAFT')
    setEncabezado(c.mensaje.encabezado)
    setCuerpo(c.mensaje.cuerpo)
    setPie(c.mensaje.pie)
    setCta(c.mensaje.cta)
  }

  // Alta del formulario en la cuenta de WhatsApp del negocio. Lo mantiene
  // Aliwa, así que el agente solo lo activa; no arma nada.
  const activar = async (c) => {
    setActivando(c.clave)
    setError('')
    try {
      const { res, data } = await apiFetch(`/api/whatsapp/flows/estandar/${c.clave}/`, { method: 'POST' })
      if (res.ok && data?.id) {
        // El backend devuelve el estado REAL: si el publish lo rechazó, viene
        // 'DRAFT'. Darlo por publicado hacía que la tarjeta mintiera.
        setFormularios((prev) => [
          ...prev,
          { id: data.id, nombre: c.clave, estado: data.estado || 'DRAFT' },
        ])
      } else {
        setError(data?.error || tfo.errActivar)
      }
    } catch {
      setError(tfo.errActivar)
    } finally {
      setActivando('')
    }
  }

  // ---- Redacción libre ----
  if (personalizando) {
    const valido = flowId && cuerpo.trim() && cta.trim()
    return (
      <PanelLateral titulo={tf.titulo} onClose={onClose} flotante>
        <div className="space-y-3">
          <div className="h-52 bg-lienzo-chat rounded-lg overflow-hidden">
            <div className="h-full overflow-y-auto p-3 flex flex-col items-end justify-end">
              <div className="max-w-[90%] min-w-0">
                <div className="bg-burbuja-propia text-on-burbuja-propia rounded-lg rounded-tr-none shadow-sm px-2.5 py-1.5">
                  {encabezado.trim() && (
                    <p className="text-[13px] font-display font-semibold leading-snug break-words">{encabezado.trim()}</p>
                  )}
                  <p className={`text-[13px] font-body whitespace-pre-wrap leading-relaxed break-words ${cuerpo.trim() ? '' : 'opacity-60 italic'}`}>
                    {cuerpo.trim() || tf.previaVacia}
                  </p>
                  {pie.trim() && <p className="text-[11px] opacity-70 leading-snug mt-0.5 break-words">{pie.trim()}</p>}
                  <p className="text-[10px] opacity-60 text-right mt-0.5">10:30</p>
                  <AccionesBurbuja tituloLista={cta.trim()} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className={label}>{tf.encabezado}</label>
            <input className={campo} maxLength={60} placeholder={tf.phEncabezado}
              value={encabezado} onChange={(e) => setEncabezado(e.target.value)} />
          </div>
          <div>
            <label className={label}>{tf.cuerpo}</label>
            <textarea className={`${campo} min-h-16 resize-y`} maxLength={1024} placeholder={tf.phCuerpo}
              value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={label}>{tf.pie}</label>
              <input className={campo} maxLength={60} placeholder={tf.phPie}
                value={pie} onChange={(e) => setPie(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className={label}>{tf.cta}</label>
              <input className={campo} maxLength={20} placeholder={tf.phCta}
                value={cta} onChange={(e) => setCta(e.target.value)} />
            </div>
          </div>

          <p className="text-[11px] text-on-surface-variant leading-relaxed">{tf.nota}</p>

          <div className="flex items-center gap-2">
            <button
              onClick={enviarPersonalizado}
              disabled={!valido || Boolean(enviando)}
              className="flex items-center gap-1.5 px-4 py-2 border border-primary text-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:bg-primary/5 disabled:opacity-40"
            >
              <Icon name="send" className="text-[15px] leading-none" />
              {enviando ? tf.enviando : tf.enviar}
            </button>
            <button
              onClick={() => setPersonalizando(false)}
              className="text-[12px] font-display text-on-surface-variant hover:text-on-surface px-2 py-1"
            >
              {tfo.cancelar}
            </button>
          </div>
        </div>
      </PanelLateral>
    )
  }

  // ---- Camino normal: un clic manda ----
  return (
    <PanelLateral titulo={tf.titulo} onClose={onClose} flotante>
      <div className="space-y-3">
        {cargando ? (
          <p className="text-[13px] text-on-surface-variant py-6 text-center">{tf.cargando}</p>
        ) : (
          <>
            <p className="text-[12px] text-on-surface-variant leading-relaxed">{tf.unClic}</p>

            <div className="space-y-2">
              {tarjetas.map((c) => {
                const disponible = Boolean(c.flow)
                const activable = !disponible && Boolean(c.activable)
                const mandando = enviando === c.clave
                const borrador = c.flow?.estado === 'DRAFT'

                return (
                  <div
                    key={c.clave}
                    className={`px-3 py-3 ${
                      disponible ? 'bg-surface-container-high/40' : 'bg-surface-container-high/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon name={c.icono} className="text-[18px] leading-none mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-display font-semibold flex items-center gap-1.5">
                          {c.nombre}
                          {borrador && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant border border-outline-variant rounded px-1 py-px">
                              Borrador
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-on-surface-variant leading-snug">
                          {disponible ? c.desc : tfo.noConfigurado}
                        </p>
                        {borrador && (
                          <p className="text-[10px] text-on-surface-variant leading-snug mt-0.5">
                            Sin publicar: se envía en modo prueba y el cliente verá un aviso.
                          </p>
                        )}
                      </div>
                      {activable && (
                        <button
                          type="button"
                          onClick={() => activar(c)}
                          disabled={Boolean(activando)}
                          className="shrink-0 text-[11px] font-display font-semibold text-primary hover:opacity-80 disabled:opacity-40 px-1"
                        >
                          {activando === c.clave ? tfo.activando : tfo.activar}
                        </button>
                      )}
                    </div>

                    {disponible && (
                      <>
                        {/* El texto exacto que se va a mandar, para que nadie
                            apriete a ciegas. */}
                        <p className="text-[12px] text-on-surface leading-relaxed mt-2 pl-7">
                          {c.mensaje.cuerpo}
                        </p>
                        <div className="flex items-center gap-2 mt-2 pl-7">
                          <button
                            type="button"
                            onClick={() => enviarTarjeta(c)}
                            disabled={Boolean(enviando)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary text-[12px] font-display font-semibold transition-all active:scale-[0.98] hover:bg-primary/5 disabled:opacity-40"
                          >
                            <Icon name="send" className="text-[14px] leading-none" />
                            {mandando ? tf.enviando : tf.enviar}
                          </button>
                          <button
                            type="button"
                            onClick={() => personalizar(c)}
                            disabled={Boolean(enviando)}
                            className="text-[11px] font-display text-on-surface-variant hover:text-on-surface px-1 disabled:opacity-40"
                          >
                            {tf.personalizar}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-[11px] text-on-surface-variant leading-relaxed">{tfo.ayudaEstandar}</p>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">{tf.nota}</p>
          </>
        )}
      </div>
    </PanelLateral>
  )
}
