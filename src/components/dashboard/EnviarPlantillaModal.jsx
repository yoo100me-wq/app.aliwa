import { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '../../utils/api'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'

const campo =
  'w-full bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg px-3 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none'
const label = 'block text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1'

// Variables {{1}}, {{2}}… del cuerpo de la plantilla
function variablesDe(texto) {
  const nums = new Set()
  for (const m of String(texto || '').matchAll(/\{\{(\d+)\}\}/g)) nums.add(Number(m[1]))
  return [...nums].sort((a, b) => a - b)
}

function renderCuerpo(texto, valores) {
  return String(texto || '').replace(/\{\{(\d+)\}\}/g, (_, n) => (valores[n] || '').trim() || `{{${n}}}`)
}

/**
 * Modal para enviar una plantilla aprobada.
 * - masivo=false: envío individual (el padre manda a la conversación activa).
 * - masivo=true: selector de clientes destinatarios (hasta 100).
 */
export default function EnviarPlantillaModal({ masivo = false, plantillaInicial = null, onEnviar, onClose }) {
  const { t } = useLang()
  const tp = t.plantillas
  const te = tp.envio

  const [plantillas, setPlantillas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [sel, setSel] = useState(plantillaInicial)
  const [valores, setValores] = useState({})
  const [clientes, setClientes] = useState([])
  const [cargandoClientes, setCargandoClientes] = useState(masivo)
  const [busqueda, setBusqueda] = useState('')
  const [marcados, setMarcados] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/whatsapp/plantillas/')
      .then(({ res, data }) => {
        if (res.ok) {
          const aprobadas = (data.plantillas || []).filter((p) => p.status === 'APPROVED')
          setPlantillas(aprobadas)
          if (!plantillaInicial && aprobadas.length === 1) setSel(aprobadas[0])
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false))

    if (masivo) {
      // Cargar hasta 100 clientes (la API pagina de 20 en 20)
      const cargarClientes = async () => {
        let url = '/api/clientes/'
        const acumulado = []
        for (let i = 0; i < 5 && url; i++) {
          const { res, data } = await apiFetch(url)
          if (!res.ok) break
          acumulado.push(...(data.results || data || []))
          url = data.next ? data.next.replace(/^https?:\/\/[^/]+/, '') : null
        }
        setClientes(acumulado)
      }
      cargarClientes().catch(() => {}).finally(() => setCargandoClientes(false))
    }
  }, [])

  const cuerpo = useMemo(
    () => (sel?.components || []).find((c) => c.type === 'BODY')?.text || '',
    [sel]
  )
  const vars = variablesDe(cuerpo)
  const contenidoRender = renderCuerpo(cuerpo, valores)

  const filtrados = clientes.filter((c) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return `${c.nombre || ''} ${c.telefono || ''}`.toLowerCase().includes(q)
  })
  const idsMarcados = Object.keys(marcados).filter((k) => marcados[k])

  const valido = sel && vars.every((v) => (valores[v] || '').trim()) &&
    (!masivo || idsMarcados.length > 0)

  const enviar = async () => {
    setEnviando(true)
    setError('')
    const payload = {
      nombre: sel.name,
      idioma: sel.language,
      variables: vars.map((v) => valores[v]),
      contenido_render: contenidoRender,
    }
    if (masivo) payload.cliente_ids = idsMarcados
    const r = await onEnviar(payload)
    if (r?.ok) {
      onClose()
    } else {
      setError(r?.error || te.errEnviar)
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="border border-outline-variant bg-surface-container rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-[15px]">{masivo ? te.tituloMasivo : te.titulo}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1">
            <Icon name="close" className="text-[18px] leading-none" />
          </button>
        </div>

        {cargando ? (
          <p className="text-[13px] text-on-surface-variant py-4 text-center">{tp.cargando}</p>
        ) : plantillas.length === 0 ? (
          <p className="text-[13px] text-on-surface-variant py-4">{te.sinAprobadas}</p>
        ) : (
          <div className="space-y-3">
            {/* Selección de plantilla */}
            <div>
              <label className={label}>{te.seleccionaPlantilla}</label>
              <div className="flex flex-wrap gap-2">
                {plantillas.map((p) => (
                  <button
                    key={p.id || p.name}
                    onClick={() => { setSel(p); setValores({}) }}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-display font-semibold transition-colors ${
                      sel?.name === p.name && sel?.language === p.language
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-lowest dark:bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Vista previa + variables */}
            {sel && (
              <>
                <div className="bg-purple/8 rounded-xl p-3">
                  <div className="bg-surface-container-lowest dark:bg-surface-container-high rounded-xl rounded-tl-none px-3 py-2">
                    <p className="text-[13px] font-body whitespace-pre-wrap leading-relaxed break-words">
                      {contenidoRender}
                    </p>
                  </div>
                </div>

                {vars.length > 0 && (
                  <div>
                    <label className={label}>{te.variablesLabel}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {vars.map((v) => (
                        <input
                          key={v}
                          className={campo}
                          placeholder={te.varPh(v)}
                          value={valores[v] || ''}
                          onChange={(e) => setValores((prev) => ({ ...prev, [v]: e.target.value }))}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Destinatarios (solo masivo) */}
            {masivo && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`${label} mb-0`}>{te.destinatarios}</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMarcados(Object.fromEntries(filtrados.map((c) => [c.id, true])))}
                      className="text-[11px] font-display text-purple hover:opacity-80"
                    >
                      {te.seleccionarTodos}
                    </button>
                    <button
                      onClick={() => setMarcados({})}
                      className="text-[11px] font-display text-on-surface-variant hover:text-on-surface"
                    >
                      {te.limpiarSeleccion}
                    </button>
                  </div>
                </div>
                <input
                  className={`${campo} mb-2`}
                  placeholder={te.buscarCliente}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto space-y-px bg-surface-container-lowest/60 dark:bg-surface-container-high/25 rounded-lg p-1">
                  {cargandoClientes ? (
                    <p className="text-[12px] text-on-surface-variant p-2">{te.cargandoClientes}</p>
                  ) : filtrados.length === 0 ? (
                    <p className="text-[12px] text-on-surface-variant p-2">{te.sinClientes}</p>
                  ) : (
                    filtrados.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-surface-container-high/40 rounded">
                        <input
                          type="checkbox"
                          checked={!!marcados[c.id]}
                          onChange={(e) => setMarcados((prev) => ({ ...prev, [c.id]: e.target.checked }))}
                        />
                        <span className="text-[13px] truncate">{c.nombre || c.telefono}</span>
                        <span className="text-[11px] text-on-surface-variant ml-auto shrink-0">{c.telefono}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1.5">{te.avisoCosto}</p>
              </div>
            )}

            {error && <p className="text-[12px] text-error">{error}</p>}

            <button
              onClick={enviar}
              disabled={!valido || enviando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-40"
            >
              <Icon name="send" className="text-[15px] leading-none" />
              {enviando ? te.enviando : masivo ? te.enviarA(idsMarcados.length) : te.enviar}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
