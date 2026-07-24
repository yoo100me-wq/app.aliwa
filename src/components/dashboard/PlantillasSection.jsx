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
  const [creando, setCreando] = useState(false)       // panel derecho = formulario
  const [seleccionada, setSeleccionada] = useState('') // panel derecho = detalle (nombre)
  const [form, setForm] = useState(FORM_VACIO)
  const [ejemplos, setEjemplos] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [confirmando, setConfirmando] = useState('')
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
        setCreando(false)
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
      if (seleccionada === nombre) setSeleccionada('')
      setAviso(tp.avisoEliminada(nombre))
    } else {
      setError(data?.error || tp.errEliminar)
    }
  }

  const abrirNueva = () => { setCreando(true); setSeleccionada(''); setError(''); setAviso('') }
  const seleccionar = (nombre) => { setSeleccionada(nombre); setCreando(false); setError(''); setAviso('') }
  const plantillaSel = plantillas.find((p) => p.name === seleccionada) || null

  if (sinNumero) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="flex flex-col items-center text-center max-w-sm">
          <Icon name="stacks" className="text-outline-variant text-[44px] mb-3" />
          <h3 className="font-display text-[15px] font-semibold mb-1">{tp.sinNumeroTitulo}</h3>
          <p className="text-[13px] text-on-surface-variant leading-relaxed">
            {tp.sinNumeroTexto}
          </p>
        </div>
      </div>
    )
  }

  // ---- Bloque del formulario (panel derecho cuando se crea) ----
  const formulario = (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-[15px]">{tp.nuevaPlantilla}</h3>
        <button onClick={() => setCreando(false)} title={tp.cancelar}
          className="text-on-surface-variant hover:text-on-surface p-1">
          <Icon name="close" className="text-[18px] leading-none" />
        </button>
      </div>
      <div className="grid lg:grid-cols-[1fr_230px] gap-5">
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
    </div>
  )

  // ---- Bloque del detalle (panel derecho cuando hay selección) ----
  const detalle = plantillaSel && (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-[15px] truncate">{plantillaSel.name}</h3>
            <span className={`shrink-0 text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full ${ESTADO_CLASES[plantillaSel.status] || 'bg-outline-variant/20 text-on-surface-variant'}`}>
              {tp.estados[plantillaSel.status] || plantillaSel.status}
            </span>
          </div>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {tp.categorias[plantillaSel.category] || plantillaSel.category} · {plantillaSel.language}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {plantillaSel.status === 'APPROVED' && (
            <button
              onClick={() => { setPlantillaEnviar(plantillaSel); setError(''); setAviso('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-[12px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90"
            >
              <Icon name="send" className="text-[15px] leading-none" />
              {tp.envio.enviar}
            </button>
          )}
          {confirmando === plantillaSel.name ? (
            <>
              <button onClick={() => eliminar(plantillaSel.name)} className="text-[12px] font-display font-semibold text-error hover:opacity-80 px-2 py-1">{tp.eliminar}</button>
              <button onClick={() => setConfirmando('')} className="text-[12px] font-display text-on-surface-variant hover:text-on-surface px-2 py-1">{tp.cancelar}</button>
            </>
          ) : (
            <button
              onClick={() => { setConfirmando(plantillaSel.name); setError(''); setAviso('') }}
              title={tp.eliminarTitulo}
              className="text-on-surface-variant hover:text-error p-1.5"
            >
              <Icon name="delete" className="text-[16px] leading-none" />
            </button>
          )}
        </div>
      </div>
      <div className="max-w-[320px]">
        <VistaPrevia {...previaDeComponents(plantillaSel.components, tp.copiarCodigo)} />
      </div>
    </div>
  )

  // Sin plantillas (y sin estar creando una): estado vacío a pantalla completa,
  // solo ícono + frase centrada, sin los paneles de dos columnas.
  if (!cargando && plantillas.length === 0 && !creando) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="flex flex-col items-center text-center">
          <Icon name="stacks" className="text-outline-variant text-[44px] mb-3" />
          <p className="text-[13px] text-on-surface-variant max-w-xs mb-5">{tp.vacio}</p>
          <button
            onClick={abrirNueva}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90"
          >
            <Icon name="add" className="text-[16px] leading-none" />
            {tp.nuevaPlantilla}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full">
        {/* IZQUIERDA: lista de tarjetas */}
        <aside className="w-[300px] shrink-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col overflow-hidden">
          <div className="flex items-center px-3 h-11 shrink-0">
            <h3 className="font-display font-bold text-[15px] truncate">{tp.titulo}</h3>
          </div>
          <div className="h-px bg-outline-variant" />
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {cargando ? (
              <p className="text-[13px] text-on-surface-variant py-6 text-center">{tp.cargando}</p>
            ) : plantillas.length === 0 ? (
              <p className="text-[13px] text-on-surface-variant py-6 px-3 text-center">{tp.vacio}</p>
            ) : (
              plantillas.map((p) => {
                const activo = seleccionada === p.name && !creando
                const estadoClase = ESTADO_CLASES[p.status] || 'bg-outline-variant/20 text-on-surface-variant'
                return (
                  <button
                    key={p.id || `${p.name}-${p.language}`}
                    onClick={() => seleccionar(p.name)}
                    className={`w-full text-left rounded-lg px-2.5 py-2 transition-colors ${
                      activo ? 'bg-primary/5' : 'hover:bg-surface-container-high/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[13px] font-display font-semibold truncate ${activo ? 'text-primary' : ''}`}>{p.name}</span>
                      <span className={`shrink-0 text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full ${estadoClase}`}>
                        {tp.estados[p.status] || p.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-on-surface-variant truncate mt-0.5">
                      {tp.categorias[p.category] || p.category} · {p.language}
                    </p>
                  </button>
                )
              })
            )}

            {/* Botón "+" con contorno punteado para crear una plantilla */}
            {!cargando && (
              <button
                onClick={abrirNueva}
                className={`w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-2.5 py-2 text-[12px] font-display font-semibold transition-colors mt-1 ${
                  creando
                    ? 'border-primary/40 text-primary bg-primary/5'
                    : 'border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                }`}
              >
                <Icon name="add" className="text-[16px] leading-none" />
                {tp.nuevaPlantilla}
              </button>
            )}
          </div>
        </aside>

        {/* DERECHA: detalle o formulario del elemento seleccionado */}
        <div className="flex-1 min-w-0 bg-surface-container overflow-y-auto">
          {(aviso || error) && (
            <div className="p-4 pb-0 space-y-2">
              {aviso && (
                <div className="flex items-start gap-2 rounded-xl bg-accent/15 px-3 py-2.5">
                  <Icon name="check_circle" className="text-on-accent text-[16px] leading-none mt-0.5" />
                  <p className="text-[12px] text-on-surface">{aviso}</p>
                </div>
              )}
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-error/10 px-3 py-2.5">
                  <Icon name="error" className="text-error text-[16px] leading-none mt-0.5" />
                  <p className="text-[12px] text-error">{error}</p>
                </div>
              )}
            </div>
          )}

          {creando ? formulario : plantillaSel ? detalle : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <Icon name="stacks" className="text-outline-variant text-[40px] mb-3" />
              <p className="text-[13px] text-on-surface-variant max-w-xs">
                {plantillas.length === 0 ? tp.vacio : tp.seleccionaVacio}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de envío masivo */}
      {plantillaEnviar && (
        <EnviarPlantillaModal
          masivo
          plantillaInicial={plantillaEnviar}
          onEnviar={enviarMasivo}
          onClose={() => setPlantillaEnviar(null)}
        />
      )}
    </>
  )
}
