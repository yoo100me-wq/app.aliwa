import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/shared/Icon'
import AliwaIcon from '../components/shared/AliwaIcon'
import { apiFetch } from '../utils/api'

export default function ConfirmarInvitacionPage() {
  const navigate = useNavigate()
  const token = new URLSearchParams(window.location.search).get('token') || ''

  const [estado, setEstado] = useState('cargando') // cargando | lista | confirmando | ok | error
  const [invitacion, setInvitacion] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setEstado('error')
      setError('Enlace inválido: falta el token de la invitación.')
      return
    }
    apiFetch(`/api/usuarios/confirmar-invitacion/?token=${encodeURIComponent(token)}`)
      .then(({ res, data }) => {
        if (res.ok) {
          setInvitacion(data)
          setEstado('lista')
        } else {
          setError(data?.error || 'No pudimos validar tu invitación.')
          setEstado('error')
        }
      })
      .catch(() => {
        setError('Error de conexión. Intenta de nuevo.')
        setEstado('error')
      })
  }, [token])

  const confirmar = async () => {
    setEstado('confirmando')
    setError('')
    try {
      const { res, data } = await apiFetch('/api/usuarios/confirmar-invitacion/', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        setInvitacion((prev) => ({ ...prev, ...data }))
        setEstado('ok')
      } else {
        setError(data?.error || 'No pudimos confirmar tu invitación.')
        setEstado('error')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setEstado('error')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-[440px]">
        <a href="/" className="inline-flex items-center gap-2.5 mb-12">
          <AliwaIcon size={40} />
          <span className="text-2xl font-logo font-bold text-primary">Aliwa</span>
        </a>

        {estado === 'cargando' && (
          <div className="flex items-center gap-3 text-on-surface-variant">
            <Icon name="hourglass_empty" className="text-[22px] animate-pulse" />
            <span className="text-sm font-display">Validando tu invitación…</span>
          </div>
        )}

        {estado === 'error' && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-5">
              <Icon name="error" className="text-red-400 text-[26px]" />
            </div>
            <h1 className="font-display text-[26px] font-bold leading-tight mb-3">No pudimos continuar</h1>
            <p className="text-sm leading-[1.7] text-on-surface-variant mb-8">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-3 rounded-2xl bg-primary text-on-primary text-sm font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90"
            >
              Ir a iniciar sesión
            </button>
          </div>
        )}

        {(estado === 'lista' || estado === 'confirmando') && invitacion && (
          <div>
            <h1 className="font-display text-[30px] font-bold leading-tight mb-3">
              Te invitaron a <span className="text-primary">{invitacion.negocio}</span>
            </h1>
            <p className="text-sm leading-[1.7] text-on-surface-variant mb-8">
              Confirma para crear tu cuenta con el correo{' '}
              <span className="font-semibold text-on-surface">{invitacion.email}</span>.
              Al confirmar te enviaremos tus datos de acceso a ese correo.
            </p>
            <button
              onClick={confirmar}
              disabled={estado === 'confirmando'}
              className="w-full px-5 py-3.5 rounded-2xl bg-primary text-on-primary text-sm font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
            >
              {estado === 'confirmando' ? 'Creando tu cuenta…' : 'Confirmar y crear mi cuenta'}
            </button>
          </div>
        )}

        {estado === 'ok' && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mb-5">
              <Icon name="check" className="text-on-accent text-[26px]" />
            </div>
            <h1 className="font-display text-[28px] font-bold leading-tight mb-3">¡Cuenta creada!</h1>
            <p className="text-sm leading-[1.7] text-on-surface-variant mb-8">
              Enviamos tu usuario y contraseña temporal a{' '}
              <span className="font-semibold text-on-surface">{invitacion?.email}</span>.
              Revisa tu correo e inicia sesión. Recuerda cambiar tu contraseña al entrar.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-3.5 rounded-2xl bg-primary text-on-primary text-sm font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90"
            >
              Ir a iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
