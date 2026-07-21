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

export default function WhatsappSection({ onConectado, onSiguiente, gestion = false }) {
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

  const cargar = () =>
    apiFetch('/api/whatsapp/numeros/')
      .then(({ res, data }) => {
        if (res.ok) setNumeros(data.results || data || [])
      })
      .catch(() => {})
      .finally(() => setCargando(false))

  useEffect(() => { cargar() }, [])

  const activos = numeros.filter((n) => n.estado === 'activo')
  const conectado = activos.length > 0
  // En gestión se listan TODOS los números (incluidos pendientes)
  const lista = gestion ? numeros : activos

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
        await cargar()
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

  const togglePerfil = (n) => {
    if (perfilNumeroId === n.id) {
      setPerfilNumeroId('')
      return
    }
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
        await cargar()
      } else {
        setError(data?.error || tn.errDesconectar)
      }
    } catch {
      setError(tn.errConexion)
    } finally {
      setDesconectando(false)
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

  if (cargando) {
    return <p className="text-[13px] text-on-surface-variant py-6">{tn.cargando}</p>
  }

  return (
    <div className="space-y-4">
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

      {(gestion ? lista.length > 0 : conectado) && (
        <>
          {/* Números conectados */}
          {lista.map((n) => {
            const estadoLabel = tn.estados[n.estado] || tn.estados.pendiente
            const estadoClase = ESTADO_CLASES[n.estado] || ESTADO_CLASES.pendiente
            return (
              <div key={n.id} className="border border-outline-variant bg-surface-container rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  {fotos[n.id] ? (
                    <img
                      src={fotos[n.id]}
                      alt={tn.fotoAlt}
                      className="w-11 h-11 rounded-2xl object-cover shrink-0"
                    />
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

                {/* Editor del perfil de negocio (lo que ven los clientes en WhatsApp) */}
                {perfilNumeroId === n.id && (
                  <div className="mt-4 bg-surface-container-lowest/60 dark:bg-surface-container-high/25 rounded-xl p-4">
                    {perfilCargando ? (
                      <p className="text-[13px] text-on-surface-variant py-4 text-center">{tn.perfilCargando}</p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[11px] text-on-surface-variant leading-relaxed">
                          {tn.perfilNota}
                        </p>
                        <div>
                          <label className={label}>{tn.labelAcercaDe}</label>
                          <input
                            className={campo}
                            maxLength={139}
                            placeholder={tn.phAcercaDe}
                            value={perfil.acerca_de}
                            onChange={(e) => setPerfil((p) => ({ ...p, acerca_de: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className={label}>{tn.labelDescripcion}</label>
                          <textarea
                            className={`${campo} min-h-16 resize-y`}
                            maxLength={512}
                            placeholder={tn.phDescripcion}
                            value={perfil.descripcion}
                            onChange={(e) => setPerfil((p) => ({ ...p, descripcion: e.target.value }))}
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <label className={label}>{tn.labelDireccion}</label>
                            <input
                              className={campo}
                              maxLength={256}
                              placeholder={tn.phDireccion}
                              value={perfil.direccion}
                              onChange={(e) => setPerfil((p) => ({ ...p, direccion: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className={label}>{tn.labelCorreo}</label>
                            <input
                              className={campo}
                              type="email"
                              maxLength={128}
                              placeholder={tn.phCorreo}
                              value={perfil.email}
                              onChange={(e) => setPerfil((p) => ({ ...p, email: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <label className={label}>{tn.labelSitio}</label>
                            <input
                              className={campo}
                              maxLength={256}
                              placeholder={tn.phSitio}
                              value={perfil.sitio_web}
                              onChange={(e) => setPerfil((p) => ({ ...p, sitio_web: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className={label}>{tn.labelGiro}</label>
                            <select
                              className={campo}
                              value={perfil.vertical}
                              onChange={(e) => setPerfil((p) => ({ ...p, vertical: e.target.value }))}
                            >
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
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          {tn.syncTexto}
                        </p>
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
                            <Icon
                              name={sync[k] ? 'check_circle' : 'error'}
                              className={`text-[13px] leading-none ${sync[k] ? 'text-on-surface' : 'text-on-surface-variant/50'}`}
                            />
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
                        <p className="text-[12px] text-on-surface-variant">
                          {tn.descConfirmacion}
                        </p>
                        <button
                          onClick={() => desconectar(n)}
                          disabled={desconectando}
                          className="text-[12px] font-display font-semibold text-error hover:opacity-80 disabled:opacity-50"
                        >
                          {desconectando ? tn.desconectando : tn.siDesconectar}
                        </button>
                        <button
                          onClick={() => setConfirmandoDesc('')}
                          className="text-[12px] font-display text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          {tn.cancelar}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setConfirmandoDesc(n.id); setError(''); setAviso('') }}
                        className="flex items-center gap-1 text-[12px] font-display text-on-surface-variant hover:text-error transition-colors"
                      >
                        <Icon name="link_off" className="text-[14px] leading-none" />
                        {tn.desconectarDeAliwa}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {gestion ? (
            <button
              onClick={() => setAgregando((v) => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container text-on-surface text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-80"
            >
              <Icon name={agregando ? 'close' : 'add'} className="text-[16px] leading-none" />
              {agregando ? tn.cancelar : tn.conectarOtro}
            </button>
          ) : (
            <button
              onClick={onSiguiente}
              className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 flex items-center gap-1.5"
            >
              {tn.siguientePaso}
              <Icon name="arrow_forward" className="text-[15px]" />
            </button>
          )}
        </>
      )}

      {(gestion ? (agregando || numeros.length === 0) : !conectado) && (
        <>
          {/* Selector de modo de conexión */}
          <div className="grid md:grid-cols-2 gap-3">
            {MODOS.map((m) => {
              const activo = modo === m.id
              const tm = tn.modos[m.id]
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModo(m.id)}
                  className={`text-left rounded-2xl p-5 transition-colors ${
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
      )}
    </div>
  )
}
