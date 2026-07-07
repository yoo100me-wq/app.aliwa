import { useState, useEffect } from 'react'
import { apiFetch } from '../../utils/api'
import Icon from '../shared/Icon'

const ROL_LABEL = {
  owner: 'Propietario',
  admin: 'Administrador',
  agent: 'Agente',
  usuario: 'Agente',
}

function iniciales(nombre) {
  if (!nombre) return '?'
  const p = nombre.trim().split(' ')
  return (p.length >= 2 ? p[0][0] + p[1][0] : p[0][0]).toUpperCase()
}

const campo =
  'w-full bg-surface-container-lowest rounded-lg px-3 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none'
const label = 'block text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1'

const FORM_VACIO = { email: '', nombre: '', apellido: '', rol: 'agent' }

export default function EquipoSection({ limite, usuarioActualId }) {
  const [usuarios, setUsuarios] = useState([])
  const [invitaciones, setInvitaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  const cargar = () => Promise.all([
    apiFetch('/api/usuarios/').then(({ res, data }) => { if (res.ok) setUsuarios(data) }),
    apiFetch('/api/usuarios/invitaciones/').then(({ res, data }) => { if (res.ok) setInvitaciones(data) }),
  ]).catch(() => {}).finally(() => setCargando(false))

  useEffect(() => { cargar() }, [])

  // El límite cuenta usuarios activos + invitaciones pendientes
  const total = usuarios.length + invitaciones.length
  const lim = limite ?? null
  const alLimite = lim != null && total >= lim

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const invitar = async () => {
    setGuardando(true)
    setError('')
    setAviso('')
    try {
      const { res, data } = await apiFetch('/api/usuarios/invitar/', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setInvitaciones((prev) => [data, ...prev])
        setAviso(`Enviamos un correo de confirmación a ${form.email}.`)
        setForm(FORM_VACIO)
        setAbierto(false)
      } else {
        setError(data?.error || 'No se pudo enviar la invitación')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  const cancelarInvitacion = async (id) => {
    const { res } = await apiFetch(`/api/usuarios/invitaciones/${id}/cancelar/`, { method: 'POST' })
    if (res.ok) setInvitaciones((prev) => prev.filter((i) => i.id !== id))
  }

  const reenviarInvitacion = async (id, email) => {
    const { res } = await apiFetch(`/api/usuarios/invitaciones/${id}/reenviar/`, { method: 'POST' })
    setAviso(res.ok ? `Reenviamos la invitación a ${email}.` : '')
    if (!res.ok) setError('No se pudo reenviar la invitación')
  }

  return (
    <div className="bg-surface-container rounded-2xl p-5 max-w-2xl">
      {/* Encabezado con conteo y botón */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="font-display font-bold text-[15px]">Usuarios del equipo</h3>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {lim != null
              ? `${total} de ${lim} usuarios (incluye invitaciones pendientes)`
              : `${total} ${total === 1 ? 'usuario' : 'usuarios'}`}
          </p>
        </div>
        <button
          onClick={() => !alLimite && setAbierto((v) => !v)}
          disabled={alLimite}
          title={alLimite ? 'Alcanzaste el límite de tu plan' : 'Invitar usuario'}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon name={abierto ? 'close' : 'person_add'} className="text-[16px] leading-none" />
          {abierto ? 'Cancelar' : 'Invitar usuario'}
        </button>
      </div>

      {/* Barra de límite */}
      {lim != null && (
        <div className="h-1.5 rounded-full bg-surface-container-lowest overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all ${alLimite ? 'bg-tertiary' : 'bg-primary'}`}
            style={{ width: `${Math.min(100, (total / lim) * 100)}%` }}
          />
        </div>
      )}

      {aviso && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-accent/15 px-3 py-2.5">
          <Icon name="mark_email_read" className="text-on-accent text-[16px] leading-none mt-0.5" />
          <p className="text-[12px] text-on-surface">{aviso}</p>
        </div>
      )}

      {/* Formulario para invitar */}
      {abierto && !alLimite && (
        <div className="bg-surface-container-lowest rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Nombre</label>
              <input className={campo} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre" />
            </div>
            <div>
              <label className={label}>Apellido</label>
              <input className={campo} value={form.apellido} onChange={(e) => set('apellido', e.target.value)} placeholder="Apellido" />
            </div>
          </div>
          <div>
            <label className={label}>Correo</label>
            <input type="email" className={campo} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <label className={label}>Rol</label>
            <select className={campo} value={form.rol} onChange={(e) => set('rol', e.target.value)}>
              <option value="agent">Agente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {error && <p className="text-[12px] text-error font-display">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setAbierto(false); setError('') }} className="px-3 py-1.5 text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors">
              Cancelar
            </button>
            <button
              onClick={invitar}
              disabled={guardando}
              className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? 'Enviando...' : 'Enviar invitación'}
            </button>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Le enviaremos un correo de confirmación. Su cuenta se crea cuando confirme, y ahí recibirá
            su usuario y contraseña temporal con el enlace de acceso.
          </p>
        </div>
      )}

      {/* Lista de usuarios existentes + invitaciones pendientes */}
      {cargando ? (
        <div className="py-8 text-center text-[13px] text-on-surface-variant">Cargando...</div>
      ) : (
        <div className="space-y-1">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container-lowest">
              <div className="w-9 h-9 rounded-lg bg-purple/10 flex items-center justify-center shrink-0">
                <span className="text-purple font-display font-semibold text-[13px]">{iniciales(u.nombre)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-[13px] truncate">{u.nombre}</span>
                  {u.id === usuarioActualId && (
                    <span className="text-[10px] font-display font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Tú</span>
                  )}
                </div>
                <span className="text-[12px] text-on-surface-variant">{ROL_LABEL[u.rol] || u.rol}</span>
              </div>
            </div>
          ))}

          {invitaciones.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container-lowest">
              <div className="w-9 h-9 rounded-lg bg-tertiary/10 flex items-center justify-center shrink-0">
                <Icon name="schedule" className="text-tertiary text-[18px] leading-none" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-[13px] truncate">{inv.nombre || inv.email}</span>
                  <span className="text-[10px] font-display font-semibold text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded">Pendiente</span>
                </div>
                <span className="text-[12px] text-on-surface-variant truncate">{inv.email} · {ROL_LABEL[inv.rol] || inv.rol}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => reenviarInvitacion(inv.id, inv.email)}
                  title="Reenviar invitación"
                  className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Icon name="forward_to_inbox" className="text-[16px] leading-none" />
                </button>
                <button
                  onClick={() => cancelarInvitacion(inv.id)}
                  title="Cancelar invitación"
                  className="p-1.5 text-on-surface-variant hover:text-error transition-colors"
                >
                  <Icon name="close" className="text-[16px] leading-none" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mensaje de límite alcanzado */}
      {alLimite && (
        <p className="text-[12px] text-on-surface-variant mt-3">
          Alcanzaste el límite de <span className="font-semibold text-on-surface">{lim}</span> usuarios de tu plan.
          Sube de plan para agregar más.
        </p>
      )}
    </div>
  )
}
