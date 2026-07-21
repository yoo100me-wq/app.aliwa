import { useState, useEffect } from 'react'
import { apiFetch } from '../../utils/api'
import { useLang } from '../../i18n-app'
import Icon from '../shared/Icon'

// Labels vía t.lead.tabs / t.lead.generos (claves técnicas sin cambiar)
const TABS = [
  { id: 'datos', icon: 'person' },
  { id: 'cargos', icon: 'payments' },
  { id: 'citas', icon: 'calendar_month' },
]

const GENEROS = [
  { v: '', clave: 'sin' },
  { v: 'masculino', clave: 'masculino' },
  { v: 'femenino', clave: 'femenino' },
  { v: 'otro', clave: 'otro' },
]

const campoBase =
  'w-full bg-surface-container-high/50 px-2.5 py-1.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none transition-all'
const labelBase =
  'block text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1'

export default function LeadPanel({ prospectoId, onClose, onSaved }) {
  const { t } = useLang()
  const tl = t.lead
  const [tab, setTab] = useState('datos')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => {
    if (!prospectoId) return
    setCargando(true)
    apiFetch(`/api/clientes/prospectos/${prospectoId}/`)
      .then(({ res, data }) => {
        if (res.ok) {
          // El apodo arranca con el nombre que la persona puso en WhatsApp
          if (!data.titulo && data.nombre) data.titulo = data.nombre
          setForm(data)
        } else setError(tl.errCargar)
      })
      .catch(() => setError(tl.errConexion))
      .finally(() => setCargando(false))
  }, [prospectoId])

  useEffect(() => {
    apiFetch('/api/usuarios/')
      .then(({ res, data }) => { if (res.ok) setUsuarios(data) })
      .catch(() => {})
  }, [])

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const guardar = async () => {
    setGuardando(true)
    setError('')
    try {
      const { res, data } = await apiFetch(`/api/clientes/prospectos/${prospectoId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          titulo: form.titulo || '',
          nombres: form.nombres || '',
          apellido_paterno: form.apellido_paterno || '',
          apellido_materno: form.apellido_materno || '',
          genero: form.genero || '',
          usuario_asignado: form.usuario_asignado || null,
          correo: form.correo || '',
          fecha_nacimiento: form.fecha_nacimiento || null,
          notas: form.notas || '',
          estado: form.estado || 'nuevo',
        }),
      })
      if (res.ok) onSaved?.(data)
      else setError(data?.detail || tl.errGuardar)
    } catch {
      setError(tl.errConexion)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="w-[300px] shrink-0 bg-surface-container-lowest border-l border-outline-variant flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-11 shrink-0">
        <h2 className="font-display font-bold text-[15px] truncate min-w-0">
          {form?.codigo_lead ? tl.tituloLead(form.codigo_lead) : tl.editarLead}
        </h2>
        <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface transition-colors">
          <Icon name="close" className="text-[18px] leading-none" />
        </button>
      </div>

      {/* Info de solo lectura (viene de WhatsApp, no editable) */}
      {!cargando && form && (
        <div className="px-4 py-2 bg-surface-container-high/30 space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10px] tracking-wide uppercase text-outline-variant font-display font-semibold shrink-0">{tl.telefono}</span>
            <span className="text-[12px] text-on-surface-variant font-body truncate text-right">{form.telefono || '—'}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10px] tracking-wide uppercase text-outline-variant font-display font-semibold shrink-0">{tl.nombreWhatsapp}</span>
            <span className="text-[12px] text-on-surface-variant font-body truncate text-right">{form.titulo || '—'}</span>
          </div>
        </div>
      )}

      <div className="h-px bg-outline-variant" />

      {/* Tabs */}
      <div className="flex px-4 pt-2 gap-1">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-2.5 py-1 text-[12px] font-display transition-colors ${
              tab === tb.id
                ? 'bg-primary/3 text-selected font-bold'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
            }`}
          >
            {tl.tabs[tb.id]}
          </button>
        ))}
      </div>
      <div className="h-px bg-outline-variant mt-2" />

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {cargando ? (
          <div className="py-10 text-center text-[13px] text-on-surface-variant">{tl.cargando}</div>
        ) : tab === 'datos' ? (
          <div className="space-y-3">
            <div>
              <label className={labelBase}>{tl.asignacion}</label>
              <select className={campoBase} value={form.usuario_asignado || ''} onChange={(e) => set('usuario_asignado', e.target.value || null)}>
                <option value="">{tl.sinAsignar}</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelBase}>{tl.nombres}</label>
              <input className={campoBase} value={form.nombres || ''} onChange={(e) => set('nombres', e.target.value)} placeholder={tl.phNombres} />
            </div>
            <div>
              <label className={labelBase}>{tl.apellidoPaterno}</label>
              <input className={campoBase} value={form.apellido_paterno || ''} onChange={(e) => set('apellido_paterno', e.target.value)} placeholder={tl.phPaterno} />
            </div>
            <div>
              <label className={labelBase}>{tl.apellidoMaterno}</label>
              <input className={campoBase} value={form.apellido_materno || ''} onChange={(e) => set('apellido_materno', e.target.value)} placeholder={tl.phMaterno} />
            </div>
            <div>
              <label className={labelBase}>{tl.genero}</label>
              <select className={campoBase} value={form.genero || ''} onChange={(e) => set('genero', e.target.value)}>
                {GENEROS.map((g) => <option key={g.v} value={g.v}>{tl.generos[g.clave]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelBase}>{tl.nacimiento}</label>
              <input type="date" className={campoBase} value={form.fecha_nacimiento || ''} onChange={(e) => set('fecha_nacimiento', e.target.value)} />
            </div>
            <div>
              <label className={labelBase}>{tl.correo}</label>
              <input type="email" className={campoBase} value={form.correo || ''} onChange={(e) => set('correo', e.target.value)} placeholder={tl.phCorreo} />
            </div>
            <div>
              <label className={labelBase}>{tl.notas}</label>
              <textarea className={`${campoBase} resize-none`} rows={3} value={form.notas || ''} onChange={(e) => set('notas', e.target.value)} placeholder={tl.phNotas} />
            </div>
            {error && <p className="text-[12px] text-error font-display">{error}</p>}
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center text-center text-on-surface-variant">
            <p className="text-[13px] font-display">{tl.proxTitulo(tl.tabs[tab])}</p>
            <p className="text-[11px] mt-1">{tl.proxDesc(tab === 'cargos' ? tl.proxCargos : tl.proxCitas)}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {tab === 'datos' && !cargando && (
        <>
          <div className="h-px bg-outline-variant" />
          <div className="flex items-center justify-end gap-2 px-4 py-2.5 shrink-0">
            <button onClick={onClose} className="px-3 py-1.5 text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors">
              {tl.cancelar}
            </button>
            <button
              onClick={guardar}
              disabled={guardando}
              className="px-4 py-1.5 bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? tl.guardando : tl.guardar}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
