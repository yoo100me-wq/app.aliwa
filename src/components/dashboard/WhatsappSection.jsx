import { useState, useEffect } from 'react'
import { apiFetch } from '../../utils/api'
import { launchWhatsAppSignup } from '../../utils/facebook'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'

// Clases visuales por estado (los labels salen de t.numeros.estados)
const ESTADO_CLASES = {
  activo: 'bg-accent/20 text-on-surface',
  pendiente: 'bg-purple/10 text-purple',
  suspendido: 'bg-error/10 text-error',
  desconectado: 'bg-outline-variant/20 text-on-surface-variant',
}

// Solo ids e iconos: títulos/descripciones/puntos salen de t.numeros.modos
const MODOS = [
  { id: 'coexistencia', icon: 'sync_alt' },
  { id: 'nuevo', icon: 'add_circle' },
]

const VERTICALES = [
  'UNDEFINED', 'OTHER', 'AUTO', 'BEAUTY', 'APPAREL', 'EDU', 'ENTERTAIN',
  'EVENT_PLAN', 'FINANCE', 'GROCERY', 'GOVT', 'HOTEL', 'HEALTH',
  'NONPROFIT', 'PROF_SERVICES', 'RETAIL', 'TRAVEL', 'RESTAURANT',
]

const campo =
  'w-full bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg px-3 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none'
const label = 'block text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1'

const PERFIL_VACIO = { acerca_de: '', descripcion: '', direccion: '', email: '', sitio_web: '', vertical: 'UNDEFINED' }

export default function WhatsappSection({ onConectado, onSiguiente, onCambio, gestion = false }) {
  const { t } = useLang()
  const tn = t.numeros
  const [numeros, setNumeros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modo, setModo] = useState('coexistencia')
  const [conectando, setConectando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [sincronizando, setSincronizando] = useState(false)
  const [sync, setSync] = useState(null)
  const [perfilNumeroId, setPerfilNumeroId] = useState('')
  const [perfil, setPerfil] = useState(PERFIL_VACIO)
  const [fotos, setFotos] = useState({})
  const [perfilCargando, setPerfilCargando] = useState(false)
  const [perfilGuardando, setPerfilGuardando] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [confirmandoDesc, setConfirmandoDesc] = useState('')
  const [desconectando, setDesconectando] = useState(false)
  const [seleccionadoId, setSeleccionadoId] = useState('') // gestión: número mostrado a la derecha
  // Activación de un número 'pendiente': modo según lo que pida Meta
  const [modoActivar, setModoActivar] = useState('')  // '' | 'pin' | 'verificar'
  const [pin, setPin] = useState('')          // PIN 2FA que ingresa el usuario (133005)
  const [codigo, setCodigo] = useState('')    // código OTP de verificación (133006)
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [tabDetalle, setTabDetalle] = useState('info')   // gestión: info | perfil | stats
  const [confirmandoEliminar, setConfirmandoEliminar] = useState('')
  const [stats, setStats] = useState(null)               // estado en vivo (Meta)
  const [statsCargando, setStatsCargando] = useState(false)

  // notificar=true → avisa al padre (DashboardPage) para refrescar su lista
  // única de números tras una mutación (conectar/desconectar/ocultar/registrar).
  const cargar = (notificar = false) =>
    apiFetch('/api/whatsapp/numeros/')
      .then(({ res, data }) => {
        if (res.ok) setNumeros(data.results || data || [])
        if (notificar) onCambio?.()
      })
      .catch(() => {})
      .finally(() => setCargando(false))

  useEffect(() => { cargar() }, [])

  const activos = numeros.filter((n) => n.estado === 'activo')
  const conectado = activos.length > 0
  // En gestión se listan TODOS los números (incluidos pendientes)
  const lista = gestion ? numeros : activos

  // En gestión, autoseleccionar el primer número cuando cargue (si no hay uno)
  // y abrir su perfil directamente.
  useEffect(() => {
    if (gestion && !seleccionadoId && !agregando && numeros.length > 0) {
      const n = numeros[0]
      setSeleccionadoId(n.id)
      if (n.estado === 'activo') abrirPerfil(n)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestion, numeros, seleccionadoId, agregando])

  const conectar = async () => {
    setError('')
    setAviso('')
    setConectando(true)
    try {
      const { code, sessionData, origin, href, wabaId, phoneNumberId, coexistencia } = await launchWhatsAppSignup()
      const { res, data } = await apiFetch('/api/whatsapp/conectar/', {
        method: 'POST',
        body: JSON.stringify({
          code, session_data: sessionData, origin, href,
          waba_id: wabaId, phone_number_id: phoneNumberId, coexistencia,
        }),
      })
      if (res.ok) {
        if (data.coexistencia) {
          setSync(data.sincronizacion || null)
          setAviso(tn.avisoCoex)
        } else {
          setAviso(tn.avisoApi)
        }
        await cargar(true)
        setAgregando(false)
        onConectado?.()
      } else {
        setError(data?.error || tn.errConectar)
      }
    } catch (e) {
      if (e.message !== 'cancel') setError(tn.errConectarReintenta)
    } finally {
      setConectando(false)
    }
  }

  // Método de pago de WhatsApp: lo cobra META, no Aliwa. La tarjeta se agrega
  // en el billing hub de Meta (no se puede embeber en Aliwa por X-Frame-Options),
  // así que se abre en un popup centrado sobre la plataforma en vez de mandar a
  // otra pestaña. Al cerrarlo el usuario sigue en el dashboard.
  const abrirPagoMeta = (wabaId) => {
    const w = 560
    const h = 760
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - w) / 2))
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - h) / 2))
    window.open(
      `https://business.facebook.com/billing_hub/payment_settings?asset_id=${wabaId}`,
      'aliwa-pago-meta',
      `popup=yes,width=${w},height=${h},left=${left},top=${top}`,
    )
  }

  // Carga y abre el perfil de un número (lo trae de Meta)
  const abrirPerfil = (n) => {
    setPerfilNumeroId(n.id)
    setPerfil(PERFIL_VACIO)
    setPerfilCargando(true)
    apiFetch(`/api/whatsapp/perfil/?numero=${n.id}`)
      .then(({ res, data }) => {
        if (res.ok) {
          const { foto_url, ...campos } = data
          setPerfil({ ...PERFIL_VACIO, ...campos, vertical: campos.vertical || 'UNDEFINED' })
          setFotos((f) => ({ ...f, [n.id]: foto_url || '' }))
        }
      })
      .catch(() => {})
      .finally(() => setPerfilCargando(false))
  }

  const togglePerfil = (n) => {
    if (perfilNumeroId === n.id) {
      setPerfilNumeroId('')
      return
    }
    abrirPerfil(n)
  }

  // Trae el estado en vivo del número desde Meta (calidad, límite, etc.)
  const cargarStats = (n) => {
    setStats(null)
    if (n.estado !== 'activo') return
    setStatsCargando(true)
    apiFetch(`/api/whatsapp/numeros/${n.id}/estado/`)
      .then(({ res, data }) => { if (res.ok && data.ok) setStats(data) })
      .catch(() => {})
      .finally(() => setStatsCargando(false))
  }

  // Gestión: al seleccionar un número, cargar su perfil y su estado en vivo
  const seleccionarNumero = (n) => {
    setSeleccionadoId(n.id)
    setAgregando(false)
    setError('')
    setAviso('')
    setTabDetalle('info')
    cargarStats(n)
    if (n.estado === 'activo') {
      if (perfilNumeroId !== n.id) abrirPerfil(n)
    } else {
      setPerfilNumeroId('')
    }
  }

  const guardarPerfil = async () => {
    setPerfilGuardando(true)
    setError('')
    setAviso('')
    try {
      const { res, data } = await apiFetch('/api/whatsapp/perfil/', {
        method: 'POST',
        body: JSON.stringify({ ...perfil, numero_id: perfilNumeroId }),
      })
      if (res.ok) {
        setAviso(tn.avisoPerfil)
        setPerfilNumeroId('')
      } else {
        setError(data?.error || tn.errPerfil)
      }
    } catch {
      setError(tn.errConexion)
    } finally {
      setPerfilGuardando(false)
    }
  }

  const desconectar = async (n) => {
    setDesconectando(true)
    setError('')
    setAviso('')
    try {
      const { res, data } = await apiFetch(`/api/whatsapp/numeros/${n.id}/desconectar/`, { method: 'POST' })
      if (res.ok) {
        setAviso(tn.avisoDesconectado)
        setConfirmandoDesc('')
        await cargar(true)
      } else {
        setError(data?.error || tn.errDesconectar)
      }
    } catch {
      setError(tn.errConexion)
    } finally {
      setDesconectando(false)
    }
  }

  // Procesa la respuesta del registro: éxito, o ramifica a pedir PIN / verificar.
  const _tras_registro = async (data) => {
    if (data.ok) {
      setAviso(tn.pinOk)
      setModoActivar(''); setPin(''); setCodigo(''); setCodigoEnviado(false)
      await cargar(true)
      onConectado?.()
      return true
    }
    if (data.requiere_pin) { setModoActivar('pin'); setError(data.error || ''); return false }
    if (data.requiere_verificacion) { setModoActivar('verificar'); setError(data.error || ''); return false }
    setError(data?.error || tn.pinError)
    return false
  }

  // Activar: intenta registrar (con el PIN del usuario si ya lo escribió, o el
  // derivado). Meta decidirá si pide PIN (133005) o verificación (133006).
  const activar = async (n) => {
    setRegistrando(true); setError(''); setAviso('')
    try {
      const body = modoActivar === 'pin' && /^\d{6}$/.test(pin) ? { pin } : {}
      const { res, data } = await apiFetch(`/api/whatsapp/numeros/${n.id}/registrar/`, {
        method: 'POST', body: JSON.stringify(body),
      })
      if (!res.ok && !data?.requiere_pin && !data?.requiere_verificacion) {
        setError(data?.error || tn.pinError)
      } else {
        await _tras_registro(data)
      }
    } catch { setError(tn.errConexion) } finally { setRegistrando(false) }
  }

  // Pide el código OTP a Meta (SMS)
  const solicitarCodigo = async (n) => {
    setRegistrando(true); setError(''); setAviso('')
    try {
      const { res, data } = await apiFetch(`/api/whatsapp/numeros/${n.id}/solicitar-codigo/`, {
        method: 'POST', body: JSON.stringify({ metodo: 'SMS' }),
      })
      if (res.ok && data.ok) { setCodigoEnviado(true); setAviso(tn.codigoEnviado) }
      else setError(data?.error || tn.pinError)
    } catch { setError(tn.errConexion) } finally { setRegistrando(false) }
  }

  // Verifica el OTP y registra
  const verificarCodigo = async (n) => {
    if (!/^\d{6}$/.test(codigo)) { setError(tn.codigoInvalido); return }
    setRegistrando(true); setError(''); setAviso('')
    try {
      const { res, data } = await apiFetch(`/api/whatsapp/numeros/${n.id}/verificar-codigo/`, {
        method: 'POST', body: JSON.stringify({ codigo }),
      })
      if (!res.ok && !data?.requiere_pin && !data?.requiere_verificacion) {
        setError(data?.error || tn.pinError)
      } else {
        await _tras_registro(data)
      }
    } catch { setError(tn.errConexion) } finally { setRegistrando(false) }
  }

  // "Eliminar" un número desconectado: lo oculta de la lista SIN borrar la fila
  // ni sus datos (oculto=True en la BD).
  const eliminar = async (n) => {
    setError('')
    setAviso('')
    try {
      const { res, data } = await apiFetch(`/api/whatsapp/numeros/${n.id}/ocultar/`, { method: 'POST' })
      if (res.ok && data.ok) {
        setSeleccionadoId('')
        await cargar(true)
      } else {
        setError(data?.error || tn.errConexion)
      }
    } catch {
      setError(tn.errConexion)
    }
  }

  const sincronizar = async () => {
    setSincronizando(true)
    setError('')
    try {
      const { res, data } = await apiFetch('/api/whatsapp/sincronizar/', { method: 'POST' })
      if (res.ok) {
        setSync(data.sincronizacion || null)
        setAviso(tn.avisoSync)
      } else {
        setError(data?.error || tn.errSync)
      }
    } catch {
      setError(tn.errConexion)
    } finally {
      setSincronizando(false)
    }
  }

  // ---- Alertas (error / aviso) ----
  const alertas = (
    <>
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-error/10 px-3 py-2.5">
          <Icon name="error" className="text-error text-[16px] leading-none mt-0.5" />
          <p className="text-[12px] text-error">{error}</p>
        </div>
      )}
      {aviso && (
        <div className="flex items-start gap-2 rounded-xl bg-accent/15 px-3 py-2.5">
          <Icon name="check_circle" className="text-on-accent text-[16px] leading-none mt-0.5" />
          <p className="text-[12px] text-on-surface">{aviso}</p>
        </div>
      )}
    </>
  )

  // ---- Editor del perfil de negocio (reutilizado en tarjeta y en pestaña) ----
  const editorPerfil = (n) => (
    <div className="bg-surface-container-lowest/60 dark:bg-surface-container-high/25 rounded-xl p-4">
      {perfilCargando ? (
        <p className="text-[13px] text-on-surface-variant py-4 text-center">{tn.perfilCargando}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] text-on-surface-variant leading-relaxed">{tn.perfilNota}</p>
          <div>
            <label className={label}>{tn.labelAcercaDe}</label>
            <input className={campo} maxLength={139} placeholder={tn.phAcercaDe} value={perfil.acerca_de}
              onChange={(e) => setPerfil((p) => ({ ...p, acerca_de: e.target.value }))} />
          </div>
          <div>
            <label className={label}>{tn.labelDescripcion}</label>
            <textarea className={`${campo} min-h-16 resize-y`} maxLength={512} placeholder={tn.phDescripcion} value={perfil.descripcion}
              onChange={(e) => setPerfil((p) => ({ ...p, descripcion: e.target.value }))} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className={label}>{tn.labelDireccion}</label>
              <input className={campo} maxLength={256} placeholder={tn.phDireccion} value={perfil.direccion}
                onChange={(e) => setPerfil((p) => ({ ...p, direccion: e.target.value }))} />
            </div>
            <div>
              <label className={label}>{tn.labelCorreo}</label>
              <input className={campo} type="email" maxLength={128} placeholder={tn.phCorreo} value={perfil.email}
                onChange={(e) => setPerfil((p) => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className={label}>{tn.labelSitio}</label>
              <input className={campo} maxLength={256} placeholder={tn.phSitio} value={perfil.sitio_web}
                onChange={(e) => setPerfil((p) => ({ ...p, sitio_web: e.target.value }))} />
            </div>
            <div>
              <label className={label}>{tn.labelGiro}</label>
              <select className={campo} value={perfil.vertical}
                onChange={(e) => setPerfil((p) => ({ ...p, vertical: e.target.value }))}>
                {VERTICALES.map((valor) => (
                  <option key={valor} value={valor}>{tn.verticales[valor]}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={guardarPerfil}
            disabled={perfilGuardando}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
          >
            <Icon name="save" className="text-[15px] leading-none" />
            {perfilGuardando ? tn.guardando : tn.guardarPerfil}
          </button>
        </div>
      )}
    </div>
  )

  // ---- Panel de activación (número 'pendiente': activar / PIN / verificar) ----
  const panelActivacion = (n) => (
    <div className="bg-purple/8 rounded-xl p-4">
      {modoActivar === 'verificar' ? (
        <>
          <div className="flex items-start gap-2 mb-3">
            <Icon name="sms" className="text-purple text-[16px] leading-none mt-0.5" />
            <div>
              <p className="text-[12px] font-display font-semibold text-on-surface">{tn.verifTitulo}</p>
              <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">{tn.verifTexto}</p>
            </div>
          </div>
          {!codigoEnviado ? (
            <button onClick={() => solicitarCodigo(n)} disabled={registrando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50">
              <Icon name="send" className="text-[15px] leading-none" />
              {registrando ? tn.verifEnviando : tn.verifEnviar}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input inputMode="numeric" maxLength={6} placeholder="••••••" value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-32 bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg px-3 py-2 text-[15px] font-body text-on-surface tracking-[0.4em] text-center outline-none" />
              <button onClick={() => verificarCodigo(n)} disabled={registrando || codigo.length !== 6}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                <Icon name="check" className="text-[15px] leading-none" />
                {registrando ? tn.pinRegistrando : tn.verifActivar}
              </button>
              <button onClick={() => solicitarCodigo(n)} disabled={registrando}
                className="text-[12px] font-display text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50">
                {tn.verifReenviar}
              </button>
            </div>
          )}
        </>
      ) : modoActivar === 'pin' ? (
        <>
          <div className="flex items-start gap-2 mb-3">
            <Icon name="lock" className="text-purple text-[16px] leading-none mt-0.5" />
            <div>
              <p className="text-[12px] font-display font-semibold text-on-surface">{tn.pinTitulo}</p>
              <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">{tn.pinTexto}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input inputMode="numeric" maxLength={6} placeholder="••••••" value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-32 bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg px-3 py-2 text-[15px] font-body text-on-surface tracking-[0.4em] text-center outline-none" />
            <button onClick={() => activar(n)} disabled={registrando || pin.length !== 6}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
              <Icon name="check" className="text-[15px] leading-none" />
              {registrando ? tn.pinRegistrando : tn.pinActivar}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center text-center">
          <Icon name="link" className="text-purple text-[22px] leading-none mb-2" />
          <p className="text-[12px] font-display font-semibold text-on-surface">{tn.activarTitulo}</p>
          <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5 mb-3 max-w-xs">{tn.activarTexto}</p>
          <button onClick={() => activar(n)} disabled={registrando}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50">
            <Icon name="check" className="text-[15px] leading-none" />
            {registrando ? tn.pinRegistrando : tn.pinActivar}
          </button>
        </div>
      )}
    </div>
  )

  // ---- Tarjeta / detalle de un número (con perfil, sync y desconectar).
  // `plano`: sin marco de tarjeta (para el panel de detalle en gestión). ----
  const renderTarjeta = (n, plano = false) => {
    const estadoLabel = tn.estados[n.estado] || tn.estados.pendiente
    const estadoClase = ESTADO_CLASES[n.estado] || ESTADO_CLASES.pendiente
    return (
      <div key={n.id} className={plano ? '' : 'border border-outline-variant bg-surface-container rounded-2xl p-5'}>
        <div className="flex items-start gap-4">
          {fotos[n.id] ? (
            <img src={fotos[n.id]} alt={tn.fotoAlt} className="w-11 h-11 rounded-2xl object-cover shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon name="chat" fill className="text-primary text-[20px]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-bold text-[15px] truncate">
                {n.nombre_visible || tn.numeroDefault}
              </h3>
              <span className={`text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full ${estadoClase}`}>
                {estadoLabel}
              </span>
              {n.es_coexistencia ? (
                <span className="text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full bg-purple/10 text-purple inline-flex items-center gap-1">
                  <Icon name="sync_alt" className="text-[11px] leading-none" />
                  {tn.badgeCoex}
                </span>
              ) : (
                <span className="text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full bg-surface-container-high/60 dark:bg-surface-container-high text-on-surface-variant inline-flex items-center gap-1">
                  <Icon name="cloud" className="text-[11px] leading-none" />
                  {tn.badgeApi}
                </span>
              )}
              {n.es_principal && (
                <span className="text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full bg-outline-variant/20 text-on-surface-variant">
                  {tn.badgePrincipal}
                </span>
              )}
            </div>
            <p className="text-[13px] text-on-surface-variant mt-0.5">{n.numero_telefono}</p>
            <p className="text-[12px] text-on-surface-variant mt-2 leading-relaxed">
              {n.estado === 'desconectado'
                ? tn.descDesconectado
                : n.es_coexistencia
                  ? tn.descCoex
                  : tn.descApi}
            </p>
          </div>
          {n.estado === 'activo' && n.waba_id && (
            <button
              onClick={() => abrirPagoMeta(n.waba_id)}
              title={tn.pagoMetaTitulo}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-lowest dark:bg-surface-container-high/50 text-on-surface text-[12px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-80"
            >
              <Icon name="credit_card" className="text-[15px] leading-none" />
              {tn.pagoMeta}
            </button>
          )}
          {n.estado === 'activo' && (
            <button
              onClick={() => togglePerfil(n)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-lowest dark:bg-surface-container-high/50 text-on-surface text-[12px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-80"
            >
              <Icon name={perfilNumeroId === n.id ? 'close' : 'edit'} className="text-[15px] leading-none" />
              {perfilNumeroId === n.id ? tn.cerrar : tn.editarPerfil}
            </button>
          )}
          {n.estado === 'desconectado' && (
            <button
              onClick={conectar}
              disabled={conectando}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-display font-semibold transition-all active:scale-[0.98] hover:bg-primary/90 disabled:opacity-50"
            >
              <Icon name="refresh" className="text-[15px] leading-none" />
              {conectando ? tn.conectando : tn.reconectar}
            </button>
          )}
        </div>

        {/* Activación — número conectado pero NO registrado en Cloud API (pendiente).
            El backend ramifica según Meta: activar directo, pedir PIN (133005) o
            verificar por OTP (133006). */}
        {n.estado === 'pendiente' && !n.es_coexistencia && (
          <div className="mt-4 bg-purple/8 rounded-xl p-4">
            {modoActivar === 'verificar' ? (
              /* --- 133006: verificación por código (OTP) --- */
              <>
                <div className="flex items-start gap-2 mb-3">
                  <Icon name="sms" className="text-purple text-[16px] leading-none mt-0.5" />
                  <div>
                    <p className="text-[12px] font-display font-semibold text-on-surface">{tn.verifTitulo}</p>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">{tn.verifTexto}</p>
                  </div>
                </div>
                {!codigoEnviado ? (
                  <button
                    onClick={() => solicitarCodigo(n)}
                    disabled={registrando}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
                  >
                    <Icon name="send" className="text-[15px] leading-none" />
                    {registrando ? tn.verifEnviando : tn.verifEnviar}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      inputMode="numeric" maxLength={6} placeholder="••••••"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-32 bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg px-3 py-2 text-[15px] font-body text-on-surface tracking-[0.4em] text-center outline-none"
                    />
                    <button
                      onClick={() => verificarCodigo(n)}
                      disabled={registrando || codigo.length !== 6}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Icon name="check" className="text-[15px] leading-none" />
                      {registrando ? tn.pinRegistrando : tn.verifActivar}
                    </button>
                    <button onClick={() => solicitarCodigo(n)} disabled={registrando}
                      className="text-[12px] font-display text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50">
                      {tn.verifReenviar}
                    </button>
                  </div>
                )}
              </>
            ) : modoActivar === 'pin' ? (
              /* --- 133005: el número tiene 2FA con otro PIN --- */
              <>
                <div className="flex items-start gap-2 mb-3">
                  <Icon name="lock" className="text-purple text-[16px] leading-none mt-0.5" />
                  <div>
                    <p className="text-[12px] font-display font-semibold text-on-surface">{tn.pinTitulo}</p>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">{tn.pinTexto}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    inputMode="numeric" maxLength={6} placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-32 bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg px-3 py-2 text-[15px] font-body text-on-surface tracking-[0.4em] text-center outline-none"
                  />
                  <button
                    onClick={() => activar(n)}
                    disabled={registrando || pin.length !== 6}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon name="check" className="text-[15px] leading-none" />
                    {registrando ? tn.pinRegistrando : tn.pinActivar}
                  </button>
                </div>
              </>
            ) : (
              /* --- inicial: intentar activar (Meta dirá si pide PIN o verificación) --- */
              <>
                <div className="flex items-start gap-2 mb-3">
                  <Icon name="link" className="text-purple text-[16px] leading-none mt-0.5" />
                  <div>
                    <p className="text-[12px] font-display font-semibold text-on-surface">{tn.activarTitulo}</p>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">{tn.activarTexto}</p>
                  </div>
                </div>
                <button
                  onClick={() => activar(n)}
                  disabled={registrando}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
                >
                  <Icon name="check" className="text-[15px] leading-none" />
                  {registrando ? tn.pinRegistrando : tn.pinActivar}
                </button>
              </>
            )}
          </div>
        )}

        {/* Editor del perfil de negocio (lo que ven los clientes en WhatsApp) */}
        {perfilNumeroId === n.id && (
          <div className="mt-4 bg-surface-container-lowest/60 dark:bg-surface-container-high/25 rounded-xl p-4">
            {perfilCargando ? (
              <p className="text-[13px] text-on-surface-variant py-4 text-center">{tn.perfilCargando}</p>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-on-surface-variant leading-relaxed">{tn.perfilNota}</p>
                <div>
                  <label className={label}>{tn.labelAcercaDe}</label>
                  <input className={campo} maxLength={139} placeholder={tn.phAcercaDe} value={perfil.acerca_de}
                    onChange={(e) => setPerfil((p) => ({ ...p, acerca_de: e.target.value }))} />
                </div>
                <div>
                  <label className={label}>{tn.labelDescripcion}</label>
                  <textarea className={`${campo} min-h-16 resize-y`} maxLength={512} placeholder={tn.phDescripcion} value={perfil.descripcion}
                    onChange={(e) => setPerfil((p) => ({ ...p, descripcion: e.target.value }))} />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className={label}>{tn.labelDireccion}</label>
                    <input className={campo} maxLength={256} placeholder={tn.phDireccion} value={perfil.direccion}
                      onChange={(e) => setPerfil((p) => ({ ...p, direccion: e.target.value }))} />
                  </div>
                  <div>
                    <label className={label}>{tn.labelCorreo}</label>
                    <input className={campo} type="email" maxLength={128} placeholder={tn.phCorreo} value={perfil.email}
                      onChange={(e) => setPerfil((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className={label}>{tn.labelSitio}</label>
                    <input className={campo} maxLength={256} placeholder={tn.phSitio} value={perfil.sitio_web}
                      onChange={(e) => setPerfil((p) => ({ ...p, sitio_web: e.target.value }))} />
                  </div>
                  <div>
                    <label className={label}>{tn.labelGiro}</label>
                    <select className={campo} value={perfil.vertical}
                      onChange={(e) => setPerfil((p) => ({ ...p, vertical: e.target.value }))}>
                      {VERTICALES.map((valor) => (
                        <option key={valor} value={valor}>{tn.verticales[valor]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={guardarPerfil}
                  disabled={perfilGuardando}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
                >
                  <Icon name="save" className="text-[15px] leading-none" />
                  {perfilGuardando ? tn.guardando : tn.guardarPerfil}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Panel de sincronización — solo coexistencia activa */}
        {n.es_coexistencia && n.estado === 'activo' && (
          <div className="mt-4 bg-surface-container-lowest/60 dark:bg-surface-container-high/25 rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-display font-semibold">{tn.syncTitulo}</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">{tn.syncTexto}</p>
              </div>
              <button
                onClick={sincronizar}
                disabled={sincronizando}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
              >
                <Icon name="sync" className={`text-[15px] leading-none ${sincronizando ? 'animate-spin' : ''}`} />
                {sincronizando ? tn.solicitando : tn.sincronizarBtn}
              </button>
            </div>
            {sync && (
              <div className="flex items-center gap-4 mt-2.5">
                {[['contactos', tn.syncContactos], ['historial', tn.syncHistorial]].map(([k, texto]) => (
                  <span key={k} className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant">
                    <Icon name={sync[k] ? 'check_circle' : 'error'}
                      className={`text-[13px] leading-none ${sync[k] ? 'text-on-surface' : 'text-on-surface-variant/50'}`} />
                    {texto} {sync[k] ? tn.syncSolicitado : tn.syncFallo}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Desconectar (conserva datos) — solo en la sección Números */}
        {gestion && n.estado !== 'desconectado' && (
          <div className="mt-4 flex items-center justify-end gap-3">
            {confirmandoDesc === n.id ? (
              <div className="flex items-center gap-3 flex-wrap justify-end">
                <p className="text-[12px] text-on-surface-variant">{tn.descConfirmacion}</p>
                <button onClick={() => desconectar(n)} disabled={desconectando}
                  className="text-[12px] font-display font-semibold text-error hover:opacity-80 disabled:opacity-50">
                  {desconectando ? tn.desconectando : tn.siDesconectar}
                </button>
                <button onClick={() => setConfirmandoDesc('')}
                  className="text-[12px] font-display text-on-surface-variant hover:text-on-surface transition-colors">
                  {tn.cancelar}
                </button>
              </div>
            ) : (
              <button onClick={() => { setConfirmandoDesc(n.id); setError(''); setAviso('') }}
                className="flex items-center gap-1 text-[12px] font-display text-on-surface-variant hover:text-error transition-colors">
                <Icon name="link_off" className="text-[14px] leading-none" />
                {tn.desconectarDeAliwa}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ---- Detalle con pestañas (estilo WhatsApp Manager de Meta) ----
  const statCard = (icono, etiqueta, valor) => (
    <div className="bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-on-surface-variant mb-1">
        <Icon name={icono} className="text-[15px] leading-none" />
        <span className="text-[11px] font-display font-semibold uppercase tracking-wide">{etiqueta}</span>
      </div>
      <p className="text-[15px] font-display font-bold text-on-surface">{valor || '—'}</p>
    </div>
  )

  const renderDetalleGestion = (n) => {
    const estadoLabel = tn.estados[n.estado] || tn.estados.pendiente
    const estadoClase = ESTADO_CLASES[n.estado] || ESTADO_CLASES.pendiente
    const tabs = [
      { id: 'info', icon: 'info', label: tn.tabInfo },
      { id: 'perfil', icon: 'badge', label: tn.tabPerfil },
      { id: 'stats', icon: 'insights', label: tn.tabStats },
      { id: 'config', icon: 'settings', label: tn.tabConfig },
    ]
    return (
      <div>
        {/* Encabezado del número */}
        <div className="flex items-start gap-4 mb-4">
          {fotos[n.id] ? (
            <img src={fotos[n.id]} alt={tn.fotoAlt} className="w-12 h-12 rounded-2xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon name="chat" fill className="text-primary text-[22px]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-bold text-[18px] truncate">{n.nombre_visible || tn.numeroDefault}</h3>
              <span className={`text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full ${estadoClase}`}>{estadoLabel}</span>
              {n.es_coexistencia ? (
                <span className="text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full bg-purple/10 text-purple inline-flex items-center gap-1">
                  <Icon name="sync_alt" className="text-[11px] leading-none" />{tn.badgeCoex}
                </span>
              ) : (
                <span className="text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full bg-surface-container-high/60 dark:bg-surface-container-high text-on-surface-variant inline-flex items-center gap-1">
                  <Icon name="cloud" className="text-[11px] leading-none" />{tn.badgeApi}
                </span>
              )}
              {n.es_principal && (
                <span className="text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full bg-outline-variant/20 text-on-surface-variant">{tn.badgePrincipal}</span>
              )}
            </div>
            <p className="text-[13px] text-on-surface-variant mt-0.5">{n.numero_telefono}</p>
          </div>
          {/* Desconectar / Eliminar — junto al tipo de conexión */}
          <div className="shrink-0">
            {n.estado !== 'desconectado' ? (
              confirmandoDesc === n.id ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => desconectar(n)} disabled={desconectando}
                    className="text-[12px] font-display font-semibold text-error hover:opacity-80 disabled:opacity-50">
                    {desconectando ? tn.desconectando : tn.siDesconectar}
                  </button>
                  <button onClick={() => setConfirmandoDesc('')}
                    className="text-[12px] font-display text-on-surface-variant hover:text-on-surface transition-colors">{tn.cancelar}</button>
                </div>
              ) : (
                <button onClick={() => { setConfirmandoDesc(n.id); setError(''); setAviso('') }} title={tn.desconectarDeAliwa}
                  className="flex items-center gap-1 text-[12px] font-display text-on-surface-variant hover:text-error transition-colors">
                  <Icon name="link_off" className="text-[15px] leading-none" />{tn.desconectarDeAliwa}
                </button>
              )
            ) : (
              /* Número desconectado: eliminar (oculta sin borrar datos) */
              confirmandoEliminar === n.id ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => eliminar(n)}
                    className="text-[12px] font-display font-semibold text-error hover:opacity-80">{tn.eliminarSi}</button>
                  <button onClick={() => setConfirmandoEliminar('')}
                    className="text-[12px] font-display text-on-surface-variant hover:text-on-surface transition-colors">{tn.cancelar}</button>
                </div>
              ) : (
                <button onClick={() => { setConfirmandoEliminar(n.id); setError(''); setAviso('') }} title={tn.eliminar}
                  className="flex items-center gap-1 text-[12px] font-display text-on-surface-variant hover:text-error transition-colors">
                  <Icon name="delete" className="text-[15px] leading-none" />{tn.eliminar}
                </button>
              )
            )}
          </div>
        </div>

        {/* Barra de pestañas */}
        <div className="flex items-center gap-1 border-b border-outline-variant mb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTabDetalle(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-display font-semibold border-b-2 -mb-px transition-colors ${
                tabDetalle === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon name={t.icon} className="text-[16px] leading-none" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido de la pestaña */}
        {tabDetalle === 'perfil' ? (
          n.estado === 'activo' ? editorPerfil(n) : (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <Icon name="badge" className="text-outline-variant text-[40px] mb-3" />
              <p className="text-[13px] text-on-surface-variant max-w-xs">{tn.perfilSoloActivo}</p>
            </div>
          )
        ) : tabDetalle === 'stats' ? (
          <>
            {n.estado !== 'activo' ? (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <Icon name="insights" className="text-outline-variant text-[40px] mb-3" />
                <p className="text-[13px] text-on-surface-variant max-w-xs">{tn.statsSoloActivo}</p>
              </div>
            ) : statsCargando ? (
              <p className="text-[13px] text-on-surface-variant py-16 text-center">{tn.cargando}</p>
            ) : stats ? (
              <div className="grid grid-cols-2 gap-3 max-w-xl">
                {statCard('verified', tn.statCalidad, tn.calidades?.[stats.quality_rating] || stats.quality_rating)}
                {statCard('trending_up', tn.statLimite, tn.niveles?.[stats.messaging_limit_tier] || stats.messaging_limit_tier)}
                {statCard('power_settings_new', tn.statEstado, tn.metaEstados?.[stats.status] || stats.status)}
                {statCard('shield', tn.statVerif, tn.verifEstados?.[stats.code_verification_status] || stats.code_verification_status)}
                {statCard('cloud', tn.statPlataforma, stats.platform_type)}
                {statCard('label', tn.statNombre, stats.name_status)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <Icon name="insights" className="text-outline-variant text-[40px] mb-3" />
                <p className="text-[13px] text-on-surface-variant max-w-xs">{tn.statsVacio}</p>
              </div>
            )}
          </>
        ) : tabDetalle === 'config' ? (
          /* --- Configuración: método de pago, llamadas, enlaces, etc. --- */
          <div className="space-y-2 max-w-xl">
            {/* Método de pago (lo cobra Meta) */}
            <button
              onClick={() => n.waba_id && abrirPagoMeta(n.waba_id)}
              disabled={!n.waba_id}
              className="w-full flex items-center gap-3 text-left rounded-xl bg-surface-container-lowest dark:bg-surface-container-high/40 px-4 py-3 transition-colors hover:bg-surface-container-high/50 disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-lg bg-purple/8 flex items-center justify-center shrink-0">
                <Icon name="credit_card" className="text-purple text-[18px] leading-none" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-display font-semibold text-on-surface">{tn.configPagoTitulo}</p>
                <p className="text-[12px] text-on-surface-variant">{tn.configPagoTexto}</p>
              </div>
              <Icon name="open_in_new" className="text-on-surface-variant text-[16px] leading-none shrink-0" />
            </button>

            {/* Placeholder de lo que viene */}
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 opacity-60">
              <div className="w-9 h-9 rounded-lg bg-surface-container-high/50 flex items-center justify-center shrink-0">
                <Icon name="more_horiz" className="text-on-surface-variant text-[18px] leading-none" />
              </div>
              <p className="text-[12px] text-on-surface-variant">{tn.configVacio}</p>
            </div>
          </div>
        ) : (
          /* --- Información general --- */
          <div className="space-y-4">
            {n.estado !== 'desconectado' && (
              <p className="text-[12px] text-on-surface-variant leading-relaxed text-center">
                {n.es_coexistencia ? tn.descCoex : tn.descApi}
              </p>
            )}

            {n.estado === 'pendiente' && !n.es_coexistencia && panelActivacion(n)}

            {/* Reconectar — mismo contenedor que activar */}
            {n.estado === 'desconectado' && (
              <div className="bg-purple/8 rounded-xl p-4">
                <div className="flex flex-col items-center text-center">
                  <Icon name="refresh" className="text-purple text-[22px] leading-none mb-2" />
                  <p className="text-[12px] font-display font-semibold text-on-surface">{tn.reconectarTitulo}</p>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5 mb-3 max-w-xs">{tn.descDesconectado}</p>
                  <button onClick={conectar} disabled={conectando}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50">
                    <Icon name="refresh" className="text-[15px] leading-none" />{conectando ? tn.conectando : tn.reconectar}
                  </button>
                </div>
              </div>
            )}

            {/* Sincronización — coexistencia activa */}
            {n.es_coexistencia && n.estado === 'activo' && (
              <div className="bg-surface-container-lowest/60 dark:bg-surface-container-high/25 rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-display font-semibold">{tn.syncTitulo}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">{tn.syncTexto}</p>
                  </div>
                  <button onClick={sincronizar} disabled={sincronizando}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50">
                    <Icon name="sync" className={`text-[15px] leading-none ${sincronizando ? 'animate-spin' : ''}`} />
                    {sincronizando ? tn.solicitando : tn.sincronizarBtn}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    )
  }

  // ---- Selector de modo de conexión + botón conectar ----
  const selectorConexion = (
    <>
      <div className="grid md:grid-cols-2 gap-3">
        {MODOS.map((m) => {
          const activo = modo === m.id
          const tm = tn.modos[m.id]
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setModo(m.id)}
              className={`text-left rounded-none p-5 transition-colors ${
                activo ? 'bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/30' : 'bg-surface-container hover:bg-surface-container-high/50/60 dark:hover:bg-surface-container-high/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activo ? 'bg-primary/10' : 'bg-purple/8'}`}>
                  <Icon name={m.icon} className={`text-[18px] ${activo ? 'text-primary' : 'text-purple'}`} />
                </div>
                <div className="flex items-center gap-1.5">
                  {tm.tag && (
                    <span className="text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full bg-accent/25 text-on-surface">
                      {tm.tag}
                    </span>
                  )}
                  <Icon
                    name={activo ? 'radio_button_checked' : 'radio_button_unchecked'}
                    className={`text-[17px] ${activo ? 'text-primary' : 'text-outline-variant dark:text-outline'}`}
                  />
                </div>
              </div>
              <h3 className="font-display font-bold text-[13px] mb-1">{tm.titulo}</h3>
              <p className="text-[12px] text-on-surface-variant leading-relaxed mb-3">{tm.descripcion}</p>
              <ul className="space-y-1">
                {tm.puntos.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-[12px] text-on-surface-variant">
                    <Icon name="check" className="text-[13px] leading-none mt-0.5 text-primary shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {/* Cómo funciona el asistente según el modo */}
      <div className="border border-outline-variant bg-surface-container rounded-2xl p-4 flex items-start gap-3">
        <Icon name="info" className="text-on-surface-variant text-[16px] mt-0.5 shrink-0 leading-none" />
        <p className="text-[12px] text-on-surface-variant leading-relaxed">
          {modo === 'coexistencia' ? tn.infoCoex : tn.infoNuevo}
        </p>
      </div>

      {/* Botón conectar */}
      <div className="flex items-center gap-3">
        <button
          onClick={conectar}
          disabled={conectando}
          className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          {conectando ? tn.conectando : tn.conectarWhatsApp}
        </button>
        {!gestion && (
          <button
            onClick={onSiguiente}
            className="text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors"
          >
            {tn.omitir}
          </button>
        )}
      </div>
    </>
  )

  if (cargando) {
    return <p className="text-[13px] text-on-surface-variant py-6 px-4">{tn.cargando}</p>
  }

  // ================= GESTIÓN: maestro-detalle estilo Chats =================
  if (gestion) {
    const selNum = numeros.find((n) => n.id === seleccionadoId) || null
    return (
      <div className="flex h-full">
        {/* IZQUIERDA: lista de números */}
        <aside className="w-[300px] shrink-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col overflow-hidden">
          <div className="flex items-center px-3 h-11 shrink-0">
            <h3 className="font-display font-bold text-[15px] truncate">{tn.tituloNumeros}</h3>
          </div>
          <div className="h-px bg-outline-variant" />
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {numeros.map((n) => {
              const activo = seleccionadoId === n.id && !agregando
              const estadoClase = ESTADO_CLASES[n.estado] || ESTADO_CLASES.pendiente
              return (
                <button
                  key={n.id}
                  onClick={() => seleccionarNumero(n)}
                  className={`w-full text-left rounded-lg px-2.5 py-2 transition-colors ${
                    activo ? 'bg-primary/5' : 'hover:bg-surface-container-high/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[13px] font-display font-semibold truncate ${activo ? 'text-primary' : ''}`}>
                      {n.nombre_visible || tn.numeroDefault}
                    </span>
                    <span className={`shrink-0 text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full ${estadoClase}`}>
                      {tn.estados[n.estado] || tn.estados.pendiente}
                    </span>
                  </div>
                  <p className="text-[12px] text-on-surface-variant truncate mt-0.5">{n.numero_telefono}</p>
                </button>
              )
            })}

            {/* Botón "+" con contorno punteado para conectar otro número */}
            <button
              onClick={() => { setAgregando(true); setSeleccionadoId(''); setError(''); setAviso('') }}
              className={`w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-2.5 py-2 text-[12px] font-display font-semibold transition-colors mt-1 ${
                agregando
                  ? 'border-primary/40 text-primary bg-primary/5'
                  : 'border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
              }`}
            >
              <Icon name="add" className="text-[16px] leading-none" />
              {tn.conectarOtro}
            </button>
          </div>
        </aside>

        {/* DERECHA: detalle del número seleccionado o alta de uno nuevo */}
        <div className="flex-1 min-w-0 bg-surface-container overflow-y-auto">
          {(error || aviso) && <div className="p-4 pb-0 space-y-2">{alertas}</div>}
          {agregando ? (
            <div className="p-5 space-y-4">{selectorConexion}</div>
          ) : selNum ? (
            <div className="p-5">{renderDetalleGestion(selNum)}</div>
          ) : numeros.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <Icon name="inventory_2" className="text-outline-variant text-[44px] mb-3" />
              <p className="text-[13px] text-on-surface-variant max-w-xs">{tn.listaVacia}</p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <Icon name="call" className="text-outline-variant text-[44px] mb-3" />
              <p className="text-[13px] text-on-surface-variant max-w-xs">{tn.seleccionaVacio}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ================= GUÍA DE INICIO: flujo de una columna =================
  return (
    <div className="space-y-4">
      {alertas}

      {conectado && (
        <>
          {activos.map((n) => renderTarjeta(n))}
          <button
            onClick={onSiguiente}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 flex items-center gap-1.5"
          >
            {tn.siguientePaso}
            <Icon name="arrow_forward" className="text-[15px]" />
          </button>
        </>
      )}

      {!conectado && selectorConexion}
    </div>
  )
}
