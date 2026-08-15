import { useState, useEffect } from 'react'
import { apiFetch } from '../../utils/api'
import { LADAS, telefonoConLada } from '../../utils/ladas'
import { useLang } from '../../i18n-app'
import Icon from '../shared/Icon'
import useErrorToast from '../../hooks/useErrorToast'

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

// Sin ancho, para componer en filas flex (la lada junto al número). Agregarle
// `w-auto` a `campoBase` NO sirve: Tailwind emite .w-full después de .w-auto,
// así que el 100% gana y el campo de al lado se queda sin espacio.
const campoSinAncho =
  'bg-surface-container-high/50 px-2.5 py-1.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none transition-all'
const campoBase = `w-full ${campoSinAncho}`
const labelBase =
  'block text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1'

// conCerrar: muestra la X en el header. En chats el panel se cierra con el
// botón del header del chat; en Contactos no hay toggle, así que lleva X.
// nuevo: el panel arranca en modo alta (solo lada+teléfono y correo). Al
// guardar crea el contacto y se queda abierto, ya en modo edición, para
// completar el resto sin volver a la lista.
export default function LeadPanel({ prospectoId, onClose, onSaved, conCerrar = false, nuevo = false }) {
  const { t } = useLang()
  const tl = t.lead
  const [tab, setTab] = useState('datos')
  // En modo alta no hay nada que traer: el formulario arranca vacío y listo.
  const [cargando, setCargando] = useState(!!prospectoId)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  // Los errores salen como notificación arriba a la derecha
  useErrorToast(error, setError)
  const [form, setForm] = useState(prospectoId ? null : {})
  const [usuarios, setUsuarios] = useState([])
  // Id efectivo: al guardar el alta pasa a ser el del contacto recién creado, y
  // el efecto de carga lo trae completo (ya con su código de lead).
  const [idActual, setIdActual] = useState(prospectoId || null)
  const [pais, setPais] = useState(LADAS[0])
  const [telefono, setTelefono] = useState('')
  const esNuevo = nuevo && !idActual

  useEffect(() => { setIdActual(prospectoId || null) }, [prospectoId])

  useEffect(() => {
    if (!idActual) return
    setCargando(true)
    apiFetch(`/api/contactos/${idActual}/`)
      .then(({ res, data }) => {
        if (res.ok) {
          // El apodo arranca con el nombre que la persona puso en WhatsApp
          if (!data.apodo && data.nombre) data.apodo = data.nombre
          setForm(data)
        } else setError(tl.errCargar)
      })
      .catch(() => setError(tl.errConexion))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idActual])

  useEffect(() => {
    apiFetch('/api/usuarios/')
      .then(({ res, data }) => { if (res.ok) setUsuarios(data) })
      .catch(() => {})
  }, [])

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  // Alta: solo teléfono y correo. El nombre lo pone después el propio WhatsApp
  // del contacto (o se edita aquí mismo una vez creado).
  const crear = async () => {
    const tel = telefonoConLada(telefono, pais)
    if (!tel) {
      setError(tl.errTelefonoRequerido)
      return
    }
    setGuardando(true)
    setError('')
    try {
      const { res, data } = await apiFetch('/api/contactos/', {
        method: 'POST',
        body: JSON.stringify({ telefono: tel, correo: form.correo || '', origen: 'manual' }),
      })
      if (res.ok) {
        onSaved?.(data)
        setIdActual(data.id)   // el panel pasa a modo edición con el contacto ya creado
      } else {
        setError(data?.error || data?.telefono?.[0] || tl.errGuardar)
      }
    } catch {
      setError(tl.errConexion)
    } finally {
      setGuardando(false)
    }
  }

  const guardar = async () => {
    if (esNuevo) return crear()
    setGuardando(true)
    setError('')
    try {
      const { res, data } = await apiFetch(`/api/contactos/${idActual}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          apodo: form.apodo || '',
          nombres: form.nombres || '',
          apellido_paterno: form.apellido_paterno || '',
          apellido_materno: form.apellido_materno || '',
          genero: form.genero || '',
          usuario_asignado: form.usuario_asignado || null,
          correo: form.correo || '',
          fecha_nacimiento: form.fecha_nacimiento || null,
          notas: form.notas || '',
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
    // Móvil: cubre la pantalla (300px junto al chat no caben en un teléfono).
    // md+: la columna de siempre, para trabajar el lead en paralelo al chat.
    <div className="absolute inset-0 z-30 md:relative md:inset-auto md:z-auto md:w-[300px] md:shrink-0 bg-surface-container-lowest md:border-l border-outline-variant flex flex-col overflow-hidden">
      {/* Header — guardar en el lugar donde estaba la x */}
      <div className="flex items-center justify-between gap-2 px-4 h-11 shrink-0">
        <h2 className="font-display font-bold text-[15px] truncate min-w-0">
          {esNuevo ? tl.nuevoContacto
            : form?.codigo_contacto ? tl.tituloLead(form.codigo_contacto) : tl.editarLead}
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          {tab === 'datos' && !cargando && (
            <button onClick={guardar} disabled={guardando} title={tl.guardar}
              className="p-1 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50">
              <Icon name={guardando ? 'hourglass_empty' : 'save'} className={`text-[18px] leading-none ${guardando ? 'animate-pulse' : ''}`} />
            </button>
          )}
          {conCerrar && (
            <button onClick={onClose} title={tl.cerrar}
              className="p-1 text-on-surface-variant hover:text-on-surface transition-colors">
              <Icon name="close" className="text-[18px] leading-none" />
            </button>
          )}
        </div>
      </div>

      {/* Info de solo lectura (viene de WhatsApp, no editable) */}
      {!cargando && form && !esNuevo && (
        <div className="px-4 py-2 bg-surface-container-high/30 space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10px] tracking-wide uppercase text-outline-variant font-display font-semibold shrink-0">{tl.telefono}</span>
            <span className="text-[12px] text-on-surface-variant font-body truncate text-right">{form.telefono || '—'}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10px] tracking-wide uppercase text-outline-variant font-display font-semibold shrink-0">{tl.nombreWhatsapp}</span>
            <span className="text-[12px] text-on-surface-variant font-body truncate text-right">{form.apodo || '—'}</span>
          </div>
        </div>
      )}

      <div className="h-px bg-outline-variant" />

      {/* Tabs — Cargos y Citas no existen todavía para un contacto sin crear */}
      <div className={`flex px-4 pt-2 gap-1 ${esNuevo ? 'hidden' : ''}`}>
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
        ) : esNuevo ? (
          <div className="space-y-3">
            <div>
              <label className={labelBase}>{tl.telefono}</label>
              <div className="flex gap-1.5">
                <select
                  className={`${campoSinAncho} shrink-0 w-[84px] pr-1`}
                  value={pais.codigo}
                  onChange={(e) => setPais(LADAS.find((l) => l.codigo === e.target.value) || LADAS[0])}
                  title={pais.nombre}
                >
                  {LADAS.map((l) => (
                    <option key={l.codigo} value={l.codigo}>{l.bandera} {l.lada}</option>
                  ))}
                </select>
                <input
                  className={`${campoSinAncho} flex-1 min-w-0`}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder={tl.phTelefono}
                  inputMode="tel"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className={labelBase}>{tl.correo}</label>
              <input type="email" className={campoBase} value={form.correo || ''}
                onChange={(e) => set('correo', e.target.value)} placeholder={tl.phCorreo} />
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">{tl.ayudaAltaRapida}</p>
          </div>
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
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center text-center text-on-surface-variant">
            <p className="text-[13px] font-display">{tl.proxTitulo(tl.tabs[tab])}</p>
            <p className="text-[11px] mt-1">{tl.proxDesc(tab === 'cargos' ? tl.proxCargos : tl.proxCitas)}</p>
          </div>
        )}
      </div>

    </div>
  )
}
