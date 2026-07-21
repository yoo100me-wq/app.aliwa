import { useState, useEffect } from 'react'
import { apiFetch } from '../../utils/api'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'
import EnviarPlantillaModal from './EnviarPlantillaModal'

// Clases visuales por estado de Meta (los labels salen de t.plantillas.estados)
const ESTADO_CLASES = {
  APPROVED: 'bg-accent/20 text-on-surface',
  PENDING: 'bg-purple/10 text-purple',
  IN_APPEAL: 'bg-purple/10 text-purple',
  REJECTED: 'bg-error/10 text-error',
  PAUSED: 'bg-outline-variant/20 text-on-surface-variant',
  DISABLED: 'bg-error/10 text-error',
}

const CATEGORIAS = ['UTILITY', 'MARKETING', 'AUTHENTICATION']
const IDIOMAS = ['es_MX', 'es', 'en_US']

const campo =
  'w-full bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg px-3 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none'
const label = 'block text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1'

const FORM_VACIO = {
  nombre: '',
  categoria: 'UTILITY',
  idioma: 'es_MX',
  encabezado: '',
  cuerpo: '',
  pie: '',
  botones: '',
  expiracion_minutos: 10,
}

// Variables {{1}}, {{2}}… usadas en el cuerpo (para pedir ejemplos)
function variablesDe(texto) {
  const nums = new Set()
  for (const m of texto.matchAll(/\{\{(\d+)\}\}/g)) nums.add(Number(m[1]))
  return [...nums].sort((a, b) => a - b)
}

// Sustituye {{n}} por su ejemplo (o un marcador visible si aún no hay)
function sustituirVariables(texto, ejemplos, marcador) {
  return texto.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const v = (ejemplos?.[n] || '').trim()
    return v || marcador(n)
  })
}

// Burbuja de mensaje estilo WhatsApp para previsualizar la plantilla
function VistaPrevia({ encabezado, cuerpo, pie, botones }) {
  const { t } = useLang()
  const tp = t.plantillas
  return (
    <div className="bg-purple/8 rounded-xl p-3">
      <div className="bg-surface-container-lowest dark:bg-surface-container-high rounded-xl rounded-tl-none px-3 py-2">
        {encabezado && (
          <p className="text-[13px] font-body font-bold mb-1">{encabezado}</p>
        )}
        <p className="text-[13px] font-body whitespace-pre-wrap leading-relaxed break-words">
          {cuerpo || tp.previaCuerpoVacio}
        </p>
        {pie && <p className="text-[11px] text-on-surface-variant mt-1.5">{pie}</p>}
        <p className="text-[10px] text-on-surface-variant text-right mt-1">10:30</p>
      </div>
      {botones?.length > 0 && (
        <div className="mt-1 space-y-1">
          {botones.map((b) => (
            <div
              key={b}
              className="bg-surface-container-lowest dark:bg-surface-container-high rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-[12px] font-display font-semibold text-purple"
            >
              <Icon name={b === tp.copiarCodigo ? 'content_copy' : 'reply'} className="text-[14px] leading-none" />
              <span className="truncate">{b}</span>
            </div>
          ))}
        </div>
      )}

      {/* Modal de envío masivo */}
      {plantillaEnviar && (
        <EnviarPlantillaModal
          masivo
          plantillaInicial={plantillaEnviar}
          onEnviar={enviarMasivo}
          onClose={() => setPlantillaEnviar(null)}
        />
      )}
    </div>
  )
}

// Arma las props de la vista previa a partir de los components de Meta
function previaDeComponents(components, copiarLabel) {
  const comp = (t) => (components || []).find((c) => c.type === t)
  const botones = (comp('BUTTONS')?.buttons || []).map((b) =>
    b.type === 'OTP' ? copiarLabel : b.text
  )
  return {
    encabezado: comp('HEADER')?.format === 'TEXT' ? comp('HEADER')?.text : '',
    cuerpo: comp('BODY')?.text || '',
    pie: comp('FOOTER')?.text || '',
    botones,
  }
}

export default function PlantillasSection() {
  const { t } = useLang()
  const tp = t.plantillas
  const [plantillas, setPlantillas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [ejemplos, setEjemplos] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [confirmando, setConfirmando] = useState('')
  const [expandida, setExpandida] = useState('')
  const [plantillaEnviar, setPlantillaEnviar] = useState(null)
  const [sinNumero, setSinNumero] = useState(false)

  const cargar = () => {
    setCargando(true)
    apiFetch('/api/whatsapp/plantillas/')
      .then(({ res, data }) => {
        if (res.ok) {
          setPlantillas(data.plantillas || [])
        } else if (res.status === 400) {
          setSinNumero(true)
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [])

  // Envío masivo de la plantilla seleccionada
  const enviarMasivo = async (payload) => {
    try {
      const { res, data } = await apiFetch('/api/whatsapp/plantillas/enviar-masivo/', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setAviso(tp.envio.resultado(data.enviados, (data.fallidos || []).length))
        return { ok: true }
      }
      return { ok: false, error: data?.error }
    } catch {
      return { ok: false, error: tp.errConexion }
    }
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const esAuth = form.categoria === 'AUTHENTICATION'
  const vars = esAuth ? [] : variablesDe(form.cuerpo)

  // Datos para la vista previa en vivo
  const previa = esAuth
    ? {
        encabezado: '',
        cuerpo: tp.authPreviaCuerpo,
        pie: tp.authPreviaPie(Number(form.expiracion_minutos) || 10),
        botones: [tp.copiarCodigo],
      }
    : {
        encabezado: form.encabezado.trim(),
        cuerpo: form.cuerpo ? sustituirVariables(form.cuerpo, ejemplos, tp.previaEjemplo) : '',
        pie: form.pie.trim(),
        botones: form.botones.split(',').map((b) => b.trim()).filter(Boolean).slice(0, 3),
      }

  const crear = async () => {
    setGuardando(true)
    setError('')
    setAviso('')
    try {
      const body = {
        nombre: form.nombre,
        categoria: form.categoria,
        idioma: form.idioma,
      }
      if (esAuth) {
        body.expiracion_minutos = Number(form.expiracion_minutos) || 10
      } else {
        body.cuerpo = form.cuerpo
        if (form.encabezado.trim()) body.encabezado = form.encabezado
        if (form.pie.trim()) body.pie = form.pie
        const botones = form.botones.split(',').map((b) => b.trim()).filter(Boolean)
        if (botones.length) body.botones = botones
        if (vars.length) body.ejemplos = vars.map((v) => ejemplos[v] || '')
      }

      const { res, data } = await apiFetch('/api/whatsapp/plantillas/', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setAviso(tp.avisoEnviada(data.nombre))
        setForm(FORM_VACIO)
        setEjemplos({})
        setAbierto(false)
        cargar()
      } else {
        setError(data?.error || tp.errCrear)
      }
    } catch {
      setError(tp.errConexion)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (nombre) => {
    const { res, data } = await apiFetch(`/api/whatsapp/plantillas/${nombre}/`, { method: 'DELETE' })
    setConfirmando('')
    if (res.ok) {
      setPlantillas((prev) => prev.filter((p) => p.name !== nombre))
      setAviso(tp.avisoEliminada(nombre))
    } else {
      setError(data?.error || tp.errEliminar)
    }
  }

  if (sinNumero) {
    return (
      <div className="border border-outline-variant bg-surface-container rounded-2xl p-10 text-center max-w-2xl">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple/8 mb-4">
          <Icon name="stacks" className="text-purple text-[22px]" />
        </div>
        <h3 className="font-display text-sm font-semibold mb-2">{tp.sinNumeroTitulo}</h3>
        <p className="text-[13px] text-on-surface-variant max-w-sm mx-auto leading-relaxed">
          {tp.sinNumeroTexto}
        </p>
      </div>
    )
  }

  return (
    <div className="border border-outline-variant bg-surface-container rounded-2xl p-5 max-w-3xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="font-display font-bold text-[15px]">{tp.titulo}</h3>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {tp.subtitulo}
          </p>
        </div>
        <button
          onClick={() => setAbierto((v) => !v)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90"
        >
          <Icon name={abierto ? 'close' : 'add'} className="text-[16px] leading-none" />
          {abierto ? tp.cancelar : tp.nuevaPlantilla}
        </button>
      </div>

      {aviso && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-accent/15 px-3 py-2.5">
          <Icon name="check_circle" className="text-on-accent text-[16px] leading-none mt-0.5" />
          <p className="text-[12px] text-on-surface">{aviso}</p>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error/10 px-3 py-2.5">
          <Icon name="error" className="text-error text-[16px] leading-none mt-0.5" />
          <p className="text-[12px] text-error">{error}</p>
        </div>
      )}

      {/* Formulario nueva plantilla + vista previa en vivo */}
      {abierto && (
        <div className="bg-surface-container-lowest/60 dark:bg-surface-container-high/25 rounded-xl p-4 mb-4 grid md:grid-cols-[1fr_230px] gap-5">
          <div className="space-y-3 min-w-0">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>{tp.labelNombre}</label>
              <input
                className={campo}
                placeholder={tp.phNombre}
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value.toLowerCase().replace(/[^a-z0-9_ ]/g, '').replace(/ /g, '_'))}
              />
            </div>
            <div>
              <label className={label}>{tp.labelIdioma}</label>
              <select className={campo} value={form.idioma} onChange={(e) => set('idioma', e.target.value)}>
                {IDIOMAS.map((valor) => <option key={valor} value={valor}>{tp.idiomas[valor]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>{tp.labelCategoria}</label>
            <div className="flex gap-2">
              {CATEGORIAS.map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => set('categoria', valor)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-display font-semibold transition-colors ${
                    form.categoria === valor
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-lowest dark:bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tp.categorias[valor]}
                </button>
              ))}
            </div>
          </div>

          {esAuth ? (
            <>
              <div className="flex items-start gap-2 rounded-xl bg-purple/8 px-3 py-2.5">
                <Icon name="info" className="text-purple text-[16px] leading-none mt-0.5" />
                <p className="text-[12px] text-on-surface-variant leading-relaxed">
                  {tp.authInfo}
                </p>
              </div>
              <div className="w-40">
                <label className={label}>{tp.labelExpiracion}</label>
                <input
                  type="number" min="1" max="90"
                  className={campo}
                  value={form.expiracion_minutos}
                  onChange={(e) => set('expiracion_minutos', e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={label}>{tp.labelEncabezado}</label>
                <input
                  className={campo}
                  placeholder={tp.phEncabezado}
                  maxLength={60}
                  value={form.encabezado}
                  onChange={(e) => set('encabezado', e.target.value)}
                />
              </div>
              <div>
                <label className={label}>{tp.labelCuerpo}</label>
                <textarea
                  className={`${campo} min-h-24 resize-y`}
                  placeholder={tp.phCuerpo}
                  maxLength={1024}
                  value={form.cuerpo}
                  onChange={(e) => set('cuerpo', e.target.value)}
                />
                <p className="text-[11px] text-on-surface-variant mt-1">
                  {tp.ayudaVariables}
                </p>
              </div>
              {vars.length > 0 && (
                <div>
                  <label className={label}>{tp.labelEjemplos}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {vars.map((v) => (
                      <input
                        key={v}
                        className={campo}
                        placeholder={tp.phEjemplo(v)}
                        value={ejemplos[v] || ''}
                        onChange={(e) => setEjemplos((prev) => ({ ...prev, [v]: e.target.value }))}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>{tp.labelPie}</label>
                  <input
                    className={campo}
                    placeholder={tp.phPie}
                    maxLength={60}
                    value={form.pie}
                    onChange={(e) => set('pie', e.target.value)}
                  />
                </div>
                <div>
                  <label className={label}>{tp.labelBotones}</label>
                  <input
                    className={campo}
                    placeholder={tp.phBotones}
                    value={form.botones}
                    onChange={(e) => set('botones', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <button
            onClick={crear}
            disabled={guardando || !form.nombre || (!esAuth && !form.cuerpo.trim()) || (vars.length > 0 && vars.some((v) => !(ejemplos[v] || '').trim()))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon name="send" className="text-[15px] leading-none" />
            {guardando ? tp.enviando : tp.enviarRevision}
          </button>
          </div>

          {/* Vista previa en vivo */}
          <div className="min-w-0">
            <label className={label}>{tp.vistaPrevia}</label>
            <VistaPrevia {...previa} />
            <p className="text-[11px] text-on-surface-variant mt-2 leading-relaxed">
              {tp.vistaPreviaNota}
            </p>
          </div>
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <p className="text-[13px] text-on-surface-variant py-6 text-center">{tp.cargando}</p>
      ) : plantillas.length === 0 ? (
        <p className="text-[13px] text-on-surface-variant py-6 text-center">
          {tp.vacio}
        </p>
      ) : (
        <div className="space-y-px">
          {plantillas.map((p, i) => {
            const estadoLabel = tp.estados[p.status] || p.status
            const estadoClase = ESTADO_CLASES[p.status] || 'bg-outline-variant/20 text-on-surface-variant'
            const cuerpo = (p.components || []).find((c) => c.type === 'BODY')?.text || ''
            return (
              <div key={p.id || `${p.name}-${p.language}`}>
                {i > 0 && <div className="h-px bg-outline-variant" />}
                <div className="flex items-center gap-3 py-2.5 px-2 group">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setExpandida(expandida === p.name ? '' : p.name)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-display font-semibold truncate">{p.name}</span>
                      <span className={`text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full ${estadoClase}`}>
                        {estadoLabel}
                      </span>
                      <Icon
                        name={expandida === p.name ? 'expand_less' : 'expand_more'}
                        className="text-[15px] leading-none text-on-surface-variant"
                      />
                    </div>
                    <p className="text-[12px] text-on-surface-variant truncate mt-0.5">
                      {tp.categorias[p.category] || p.category} · {p.language}{cuerpo ? ` · ${cuerpo}` : ''}
                    </p>
                  </div>
                  {confirmando === p.name ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => eliminar(p.name)}
                        className="text-[12px] font-display font-semibold text-error hover:opacity-80 px-2 py-1"
                      >
                        {tp.eliminar}
                      </button>
                      <button
                        onClick={() => setConfirmando('')}
                        className="text-[12px] font-display text-on-surface-variant hover:text-on-surface px-2 py-1"
                      >
                        {tp.cancelar}
                      </button>
                    </div>
                  ) : (
                    <>
                    {p.status === 'APPROVED' && (
                      <button
                        onClick={() => { setPlantillaEnviar(p); setError(''); setAviso('') }}
                        title={tp.envio.enviarTitulo}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-purple p-1"
                      >
                        <Icon name="send" className="text-[16px] leading-none" />
                      </button>
                    )}
                    <button
                      onClick={() => { setConfirmando(p.name); setError(''); setAviso('') }}
                      title={tp.eliminarTitulo}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-error p-1"
                    >
                      <Icon name="delete" className="text-[16px] leading-none" />
                    </button>
                    </>
                  )}
                </div>

                {/* Vista previa de la plantilla existente */}
                {expandida === p.name && (
                  <div className="px-2 pb-3 max-w-[300px]">
                    <VistaPrevia {...previaDeComponents(p.components, tp.copiarCodigo)} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
