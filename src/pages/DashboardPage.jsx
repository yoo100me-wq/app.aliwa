import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/shared/Icon'
import AliwaIcon, { AliwaLogo } from '../components/shared/AliwaIcon'
import useTheme from '../hooks/useTheme'
import ConversacionesPanel from '../components/dashboard/ConversacionesPanel'
import EquipoSection from '../components/dashboard/EquipoSection'
import PlantillasSection from '../components/dashboard/PlantillasSection'
import WhatsappSection from '../components/dashboard/WhatsappSection'
import OpenpaySection from '../components/dashboard/OpenpaySection'
import SuscripcionCheckout from '../components/dashboard/SuscripcionCheckout'
import { apiFetch } from '../utils/api'
import { initFacebookSDK } from '../utils/facebook'
import { useLang } from '../i18n-app'

// Solo ids/iconos: los labels salen de t.dash.menu / t.dash.menuGrupos
// Facturación, Pipelines, Citas, Embudo, Pago WhatsApp y Tienda se agregarán
// cuando existan sus funcionalidades (ids: invoiced, process-flow, appointments,
// sales-flow, wa-pay, store). Sus claves i18n se conservan en dash.js.
const menuGroups = [
  { id: 'dashboard', icon: 'widgets' },
  {
    labelKey: 'crm', icon: 'group_work',
    items: [
      { id: 'conversations', icon: 'chat' },
      { id: 'leads', icon: 'person_search' },
      { id: 'numbers', icon: 'call' },
      { id: 'customers', icon: 'stacks' },
    ],
  },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { lang, t, toggleLang } = useLang()
  const td = t.dash
  const localeFecha = lang === 'en' ? 'en-US' : 'es-MX'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Preferencia persistida: sidebar colapsado
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('aliwa-sidebar-collapsed') === '1')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [dark, toggleDark] = useTheme()
  const [usuario, setUsuario] = useState(null)
  const [notificaciones, setNotificaciones] = useState([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifNoLeidas, setNotifNoLeidas] = useState(0)
  const [openGroups, setOpenGroups] = useState({})
  const [negocios, setNegocios] = useState([])
  const [negocioActivo, setNegocioActivo] = useState(null)
  const [negocioMenuOpen, setNegocioMenuOpen] = useState(false)
  // Preferencia persistida: si el panel de notificaciones quedó abierto,
  // se restaura al volver a entrar (settings NO se persiste).
  const [panelActivo, setPanelActivo] = useState(() =>
    localStorage.getItem('aliwa-panel-notif') === '1' ? 'notificaciones' : null
  ) // null | 'notificaciones' (Configuración vive en activeSection === 'settings')
  const [settingsTab, setSettingsTab] = useState('cuenta')
  const [editNombre, setEditNombre] = useState('')
  const [editApellido, setEditApellido] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [emailCodigo, setEmailCodigo] = useState('')
  const [emailPaso, setEmailPaso] = useState('idle') // idle | codigo
  const [cuentaGuardando, setCuentaGuardando] = useState(false)
  const [cuentaEditando, setCuentaEditando] = useState(false)
  const [passActual, setPassActual] = useState('')
  const [passNueva, setPassNueva] = useState('')
  const [passConfirm, setPassConfirm] = useState('')
  const [historialSesiones, setHistorialSesiones] = useState([])
  const [settingsMsg, setSettingsMsg] = useState('')
  // Setup negocio
  const [setupNombre, setSetupNombre] = useState('')
  const [setupGiro, setSetupGiro] = useState('')
  const [setupTelefono, setSetupTelefono] = useState('')
  const [setupCorreo, setSetupCorreo] = useState('')
  const [setupDireccion, setSetupDireccion] = useState('')
  const [setupShowFiscal, setSetupShowFiscal] = useState(false)
  const [setupRfc, setSetupRfc] = useState('')
  const [setupRazonSocial, setSetupRazonSocial] = useState('')
  const [setupRegimen, setSetupRegimen] = useState('')
  const [setupCp, setSetupCp] = useState('')
  const [setupError, setSetupError] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [giroOpen, setGiroOpen] = useState(false)
  const [giroBuscar, setGiroBuscar] = useState('')
  const [waConectado, setWaConectado] = useState(false)
  const [equipoListo, setEquipoListo] = useState(() => localStorage.getItem('aliwa-setup-team-done') === '1')

  const pageContent = td.paginas
  const current = pageContent[activeSection]

  useEffect(() => {
    apiFetch('/api/auth/me/').then(({ res, data }) => {
      if (res.ok) setUsuario(data)
    }).catch(() => {})
    initFacebookSDK()
    apiFetch('/api/notificaciones/conteo/').then(({ res, data }) => {
      if (res.ok) setNotifNoLeidas(data.no_leidas || 0)
    }).catch(() => {})
    apiFetch('/api/negocios/').then(({ res, data }) => {
      if (res.ok) {
        const lista = data.results || data || []
        setNegocios(lista)
        if (lista.length > 0) setNegocioActivo(lista[0])
      }
    }).catch(() => {})
    // Estado de WhatsApp: marca conectado si hay al menos un número activo
    apiFetch('/api/whatsapp/numeros/').then(({ res, data }) => {
      if (res.ok) {
        const nums = data.results || data || []
        setWaConectado(nums.some(n => n.estado === 'activo'))
      }
    }).catch(() => {})
    // Si el panel de notificaciones quedó abierto (preferencia restaurada),
    // cargar su contenido al entrar.
    if (panelActivo === 'notificaciones') {
      setNotifLoading(true)
      apiFetch('/api/notificaciones/').then(({ res, data }) => {
        if (res.ok) setNotificaciones(data.results || data || [])
      }).catch(() => setNotificaciones([])).finally(() => setNotifLoading(false))
    }
  }, [])

  // Persistir preferencias de layout
  useEffect(() => {
    localStorage.setItem('aliwa-sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])
  useEffect(() => {
    localStorage.setItem('aliwa-panel-notif', panelActivo === 'notificaciones' ? '1' : '0')
  }, [panelActivo])

  const nombreUsuario = usuario?.nombre?.split(' ')[0] || ''

  const handleNav = (id) => {
    setActiveSection(id)
    setSidebarOpen(false)
    // Al navegar por el sidebar, salir de la vista de Suscripción del panel principal
    if (settingsTab === 'suscripcion') setSettingsTab('cuenta')
  }

  const girosNegocio = td.giros

  const guardarNegocio = async (e) => {
    e.preventDefault()
    if (!setupNombre || !setupGiro) { setSetupError(td.setup.errRequeridos); return }
    setSetupError('')
    setSetupLoading(true)
    try {
      const { res, data } = await apiFetch('/api/cuentas/setup/', {
        method: 'POST',
        body: JSON.stringify({
          nombre: setupNombre, giro: setupGiro, telefono: setupTelefono,
          correo: setupCorreo, direccion: setupDireccion, rfc: setupRfc,
          razon_social: setupRazonSocial, regimen_fiscal: setupRegimen, codigo_postal: setupCp,
        }),
      })
      if (res.ok) {
        // Recargar negocios y volver al dashboard
        const { res: r2, data: d2 } = await apiFetch('/api/negocios/')
        if (r2.ok) {
          const lista = d2.results || d2 || []
          setNegocios(lista)
          if (lista.length > 0) setNegocioActivo(lista[0])
        }
        handleNav('setup-whatsapp')
      } else {
        setSetupError(data.error || td.setup.errConfigurar)
      }
    } catch {
      setSetupError(td.setup.errConexion)
    } finally {
      setSetupLoading(false)
    }
  }

  const marcarLeida = async (id) => {
    await apiFetch(`/api/notificaciones/${id}/leer/`, { method: 'POST' })
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    setNotifNoLeidas(prev => Math.max(0, prev - 1))
  }

  const abrirNotificaciones = () => {
    if (panelActivo === 'notificaciones') { setPanelActivo(null); return }
    setPanelActivo('notificaciones')
    setNotifLoading(true)
    apiFetch('/api/notificaciones/').then(({ res, data }) => {
      if (res.ok) setNotificaciones(data.results || data || [])
    }).catch(() => setNotificaciones([])).finally(() => setNotifLoading(false))
  }

  // Configuración es una sección del contenido principal (como Chats):
  // abrirla reemplaza la sección activa, pero convive con Notificaciones.
  const abrirSettings = (tab = 'cuenta') => {
    setActiveSection('settings')
    setSidebarOpen(false)
    setSettingsTab(tab)
    setSettingsMsg('')
    if ((tab === 'cuenta' || tab === 'editar-cuenta') && usuario) {
      setEditNombre(usuario.nombre?.split(' ')[0] || '')
      setEditApellido(usuario.apellido || usuario.nombre?.split(' ').slice(1).join(' ') || '')
      setEditAvatar(usuario.avatar || '')
      setEditEmail(usuario.email || '')
      setEmailCodigo('')
      setEmailPaso('idle')
      setCuentaEditando(false)
    }
    if (tab === 'seguridad') {
      setPassActual('')
      setPassNueva('')
      setPassConfirm('')
      apiFetch('/api/auth/historial-sesiones/').then(({ res, data }) => {
        if (res.ok) setHistorialSesiones(data.results || data || [])
      }).catch(() => setHistorialSesiones([]))
    }
  }

  const guardarCuenta = async () => {
    setSettingsMsg('')
    setCuentaGuardando(true)
    try {
      const { res, data } = await apiFetch('/api/auth/actualizar-perfil/', {
        method: 'PATCH',
        body: JSON.stringify({ nombre: editNombre, apellido: editApellido, avatar: editAvatar }),
      })
      if (res.ok) {
        setUsuario((prev) => ({ ...prev, ...data }))
        setSettingsMsg(td.cuentaForm.guardado)
        setCuentaEditando(false)
      } else {
        setSettingsMsg(data.error || td.settingsMsg.errActualizar)
      }
    } catch {
      setSettingsMsg(td.cuentaForm.errConexion)
    } finally {
      setCuentaGuardando(false)
    }
  }

  // Foto de perfil: redimensiona a 256px (cover) y guarda como data URL chica
  const onFotoSeleccionada = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const lado = 256
      const canvas = document.createElement('canvas')
      canvas.width = lado
      canvas.height = lado
      const ctx = canvas.getContext('2d')
      const escala = Math.max(lado / img.width, lado / img.height)
      const w = img.width * escala
      const h = img.height * escala
      ctx.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h)
      setEditAvatar(canvas.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => setSettingsMsg(td.cuentaForm.errFoto)
    img.src = URL.createObjectURL(file)
  }

  const solicitarCambioCorreo = async () => {
    setSettingsMsg('')
    try {
      const { res, data } = await apiFetch('/api/auth/cambiar-correo/solicitar/', {
        method: 'POST',
        body: JSON.stringify({ email: editEmail.trim() }),
      })
      if (res.ok) {
        setEmailPaso('codigo')
        setEmailCodigo('')
      } else {
        setSettingsMsg(data.error || td.cuentaForm.errConexion)
      }
    } catch {
      setSettingsMsg(td.cuentaForm.errConexion)
    }
  }

  const confirmarCambioCorreo = async () => {
    setSettingsMsg('')
    try {
      const { res, data } = await apiFetch('/api/auth/cambiar-correo/confirmar/', {
        method: 'POST',
        body: JSON.stringify({ codigo: emailCodigo.trim() }),
      })
      if (res.ok) {
        setUsuario((prev) => ({ ...prev, email: data.email }))
        setEditEmail(data.email)
        setEmailPaso('idle')
        setEmailCodigo('')
        setSettingsMsg(td.cuentaForm.correoActualizado)
      } else {
        setSettingsMsg(data.error || td.cuentaForm.errConexion)
      }
    } catch {
      setSettingsMsg(td.cuentaForm.errConexion)
    }
  }

  const cambiarPassword = async () => {
    setSettingsMsg('')
    if (passNueva !== passConfirm) { setSettingsMsg(td.settingsMsg.passNoCoincide); return }
    if (passNueva.length < 8) { setSettingsMsg(td.settingsMsg.passMin); return }
    const { res, data } = await apiFetch('/api/auth/cambiar-password/', {
      method: 'POST',
      body: JSON.stringify({ password_actual: passActual, password_nueva: passNueva }),
    })
    if (res.ok) {
      setPassActual('')
      setPassNueva('')
      setPassConfirm('')
      setSettingsMsg(td.settingsMsg.passActualizada)
    } else {
      setSettingsMsg(data.error || td.settingsMsg.errPassword)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar group wrapper — la pestaña aparece al hacer hover */}
      <div className="group/sidebar">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 bg-surface-container flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-[64px]' : 'w-44'}`}>

          {/* Logo — misma altura (h-11) que el top bar; su línea inferior
              continúa la línea del dashboard de borde a borde */}
          <div className={`relative h-11 flex items-center shrink-0 ${collapsed ? 'justify-center px-0' : 'gap-2 px-4'}`}>
            <AliwaIcon size={collapsed ? 28 : 30} />
            {!collapsed && <span className="text-base font-logo font-bold text-on-surface">Aliwa</span>}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-outline-variant" />
          </div>

          {/* Nav */}
          <nav className={`flex-1 overflow-y-auto py-1 ${collapsed ? 'px-1.5' : 'px-3'}`}>
            {menuGroups.map((group) => {
              // Item suelto (Dashboard)
              if (group.id) {
                return (
                  <button
                    key={group.id}
                    onClick={() => handleNav(group.id)}
                    title={collapsed ? td.menu[group.id] : undefined}
                    className={`w-full flex items-center gap-2 py-1 text-[13px] font-display transition-colors mb-px ${
                      collapsed ? 'justify-center px-0' : 'px-2.5'
                    } ${
                      activeSection === group.id
                        ? 'bg-primary/3 text-selected font-bold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                    }`}
                  >
                    <Icon name={group.icon} fill={activeSection === group.id} className="text-[16px] leading-none" />
                    {!collapsed && td.menu[group.id]}
                  </button>
                )
              }

              // Grupo con subitems
              const hasActive = group.items.some((i) => i.id === activeSection)

              return (
                <div key={group.labelKey} className="mt-2 mb-0.5">
                  {!collapsed && (
                    <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1 px-2.5">{td.menuGrupos[group.labelKey]}</p>
                  )}
                  <div className="space-y-px">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        title={collapsed ? td.menu[item.id] : undefined}
                        className={`w-full flex items-center gap-2 py-1 text-[13px] font-display transition-colors ${
                          collapsed ? 'justify-center px-0' : 'px-2.5'
                        } ${
                          activeSection === item.id
                            ? 'bg-primary/3 text-selected font-bold'
                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                        }`}
                      >
                        <Icon name={item.icon} fill={activeSection === item.id} className={`text-[16px] leading-none ${item.iconClass || ''}`} />
                        {!collapsed && td.menu[item.id]}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </nav>

          {/* Línea decorativa sobre el área de tema/salir */}
          <div className="h-px bg-outline-variant shrink-0" />

          {/* Bottom */}
          <div className={`pb-3 space-y-px pt-2 bg-surface-container-low ${collapsed ? 'px-1.5' : 'px-3'}`}>
            {/* Theme toggle */}
            <button
              onClick={toggleDark}
              title={collapsed ? (dark ? td.sidebar.modoOscuro : td.sidebar.modoClaro) : undefined}
              className={`w-full flex items-center text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors ${
                collapsed ? 'justify-center py-1 px-0' : 'px-2.5 py-1 gap-2'
              }`}
            >
              <Icon name={dark ? 'dark_mode' : 'light_mode'} className="text-[16px] leading-none" />
              {!collapsed && <span>{dark ? td.sidebar.modoOscuro : td.sidebar.modoClaro}</span>}
            </button>

            {/* Configuración (panel de ajustes) */}
            <button
              onClick={() => abrirSettings('cuenta')}
              title={collapsed ? td.sidebar.configuracion : undefined}
              className={`w-full flex items-center text-[13px] font-display transition-colors ${
                activeSection === 'settings'
                  ? 'bg-primary/3 text-selected font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
              } ${collapsed ? 'justify-center py-1 px-0' : 'px-2.5 py-1 gap-2'}`}
            >
              <Icon name="settings" fill={activeSection === 'settings'} className="text-[16px] leading-none" />
              {!collapsed && <span>{td.sidebar.configuracion}</span>}
            </button>

            {/* Logout */}
            <button
              onClick={async () => {
                await apiFetch('/api/auth/logout/', { method: 'POST' })
                navigate('/login')
              }}
              title={collapsed ? td.sidebar.salir : undefined}
              className={`w-full flex items-center text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors ${
                collapsed ? 'justify-center py-1 px-0' : 'px-2.5 py-1 gap-2'
              }`}
            >
              <Icon name="logout" className="text-[16px] leading-none" />
              {!collapsed && <span>{td.sidebar.salir}</span>}
            </button>

            {/* Línea decorativa que separa el negocio de tema/salir */}
            <div className={`h-px bg-outline-variant my-1.5 ${collapsed ? '-mx-1.5' : '-mx-3'}`} />

            {/* Negocio */}
            <div className="relative">
              {negocios.length === 0 || (negocios.length === 1 && !negocioActivo?.giro) ? (
                <a
                  href="/configurar-negocio"
                  onClick={(e) => { e.preventDefault(); handleNav('setup') }}
                  className={`w-full block transition-colors border border-dashed border-outline-variant hover:border-tertiary/40 hover:bg-tertiary/5 ${collapsed ? 'p-1.5 flex justify-center' : 'px-2.5 py-2'}`}
                >
                  {collapsed ? (
                    <div className="w-8 h-8 bg-tertiary/10 flex items-center justify-center">
                      <Icon name="add_business" className="text-tertiary text-[16px] leading-none" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-tertiary/10 flex items-center justify-center shrink-0">
                        <Icon name="add_business" className="text-tertiary text-[16px] leading-none" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-[13px] font-display font-semibold text-on-surface truncate">{td.sidebar.configurarNegocio}</div>
                        <div className="text-[12px] text-on-surface-variant truncate">{td.sidebar.aunNoTienes}</div>
                      </div>
                    </div>
                  )}
                </a>
              ) : (
                <button
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false)
                      if (negocios.length > 1) setNegocioMenuOpen(true)
                    } else {
                      if (negocios.length > 1) setNegocioMenuOpen(!negocioMenuOpen)
                    }
                  }}
                  className={`w-full transition-colors hover:bg-surface-container-high/50 ${collapsed ? 'p-1.5 flex justify-center' : 'px-2.5 py-2'}`}
                >
                  {collapsed ? (
                    <div className="w-8 h-8 bg-purple/10 flex items-center justify-center">
                      <Icon name="add_business" className="text-purple text-[16px] leading-none" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-purple/10 flex items-center justify-center shrink-0">
                        <Icon name="add_business" className="text-purple text-[16px] leading-none" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-[13px] font-display font-semibold truncate">{negocioActivo?.nombre || td.sidebar.miNegocio}</div>
                        <div className="text-[12px] text-on-surface-variant truncate">{negocioActivo?.giro || td.sidebar.sinConfigurar}</div>
                      </div>
                      {negocios.length > 1 && (
                        <Icon name="unfold_more" className="text-on-surface-variant text-[16px] shrink-0" />
                      )}
                    </div>
                  )}
                </button>
              )}

              {negocioMenuOpen && negocios.length > 1 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNegocioMenuOpen(false)} />
                  <div className="absolute bottom-full left-0 right-0 z-50 mb-1 bg-surface-container-high overflow-hidden">
                    <div className="px-2.5 py-2 border-b border-outline-variant">
                      <span className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">{td.sidebar.cambiarNegocio}</span>
                    </div>
                    {negocios.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setNegocioActivo(n)
                          setNegocioMenuOpen(false)
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors ${
                          negocioActivo?.id === n.id ? 'bg-primary/5' : 'hover:bg-surface-container-highest/50'
                        }`}
                      >
                        <div className="w-7 h-7 bg-purple/10 flex items-center justify-center shrink-0">
                          <span className="text-purple font-display font-bold text-[10px]">
                            {n.nombre?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-display font-medium truncate">{n.nombre}</div>
                          {n.giro && <div className="text-[12px] text-on-surface-variant truncate">{n.giro}</div>}
                        </div>
                        {negocioActivo?.id === n.id && (
                          <Icon name="check" className="text-primary text-[16px] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Collapse tab — pestañita estilo GDA */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden lg:flex fixed top-5 z-50
            opacity-0 group-hover/sidebar:opacity-100
            px-1 py-3 rounded-r-xl
            bg-surface-container-high
            text-on-surface-variant
            hover:bg-primary/10 hover:text-primary
            transition-all duration-300
            items-center justify-center
            ${collapsed ? 'left-[64px]' : 'left-[176px]'}`}
        >
          <Icon name={collapsed ? 'chevron_right' : 'chevron_left'} className="text-[16px]" />
        </button>
      </div>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-inverse-surface/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main — margen izquierdo dinámico */}
      <main className={`flex-1 flex flex-col h-screen transition-all duration-300 ${
        collapsed ? 'lg:ml-[64px]' : 'lg:ml-44'
      }`}>
        {/* Top bar */}
        <header className="relative flex items-center h-11 bg-surface-container-low px-4 md:px-6 gap-4 shrink-0">
          {/* Línea decorativa (sutil, uniforme) */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-outline-variant" />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 text-on-surface-variant"
          >
            <Icon name="menu" />
          </button>

          <div className="flex-1 hidden lg:flex items-center gap-1.5 text-sm font-display text-on-surface-variant">
            {(() => {
              if (activeSection === 'settings') {
                const tabLabel = {
                  'suscripcion': td.topbar.suscripcion,
                  'editar-cuenta': td.panel.editarCuenta,
                  'crear-usuarios': td.panel.crearUsuarios,
                  'permisos': td.panel.permisos,
                  'analitica-usuarios': td.panel.analitica,
                  'historial-login': td.panel.historialLogin,
                  'cambiar-password': td.panel.cambiarPassword,
                }[settingsTab]
                return <><span>{td.topbar.configuracion}</span>{tabLabel && <><span className="text-outline-variant">/</span><span className="text-on-surface font-medium">{tabLabel}</span></>}</>
              }
              const group = menuGroups.find(g => g.items?.some(i => i.id === activeSection))
              if (group) {
                const item = group.items.find(i => i.id === activeSection)
                return <><span>{td.menuGrupos[group.labelKey]}</span><span className="text-outline-variant">/</span><span className="text-on-surface font-medium">{td.menu[item.id]}</span></>
              }
              return <span className="text-on-surface font-medium">{current?.title || td.topbar.dashboard}</span>
            })()}
          </div>

          <div className="flex items-center gap-1">
            {/* Idioma — junto a notificaciones */}
            <button
              onClick={toggleLang}
              title={td.sidebar.idioma}
              className="p-1.5 transition-colors flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high/50"
            >
              <span className="w-[18px] h-[18px] inline-flex items-center justify-center text-[12px] font-display font-bold tracking-tight leading-none">
                {lang === 'es' ? 'EN' : 'ES'}
              </span>
            </button>
            <button
              onClick={abrirNotificaciones}
              aria-pressed={panelActivo === 'notificaciones'}
              className={`p-1.5 transition-colors flex items-center justify-center relative ${panelActivo === 'notificaciones' ? 'bg-primary/3 text-selected' : 'text-on-surface-variant hover:bg-surface-container-high/50'}`}
            >
              <Icon name="notifications" fill={panelActivo === 'notificaciones'} className="text-[18px] leading-none" />
              {notifNoLeidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-selected text-surface-container-lowest text-[10px] font-display font-bold rounded-full flex items-center justify-center">
                  {notifNoLeidas > 9 ? '9+' : notifNoLeidas}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content + Panel lateral */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar secundario izquierdo — Configuración (y secciones futuras).
              Mismas dimensiones y tipografía que la bandeja de chats. */}
          {activeSection === 'settings' && (
            <aside className="w-44 shrink-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col overflow-hidden">
              <div className="px-2.5 pt-1.5 pb-1.5 shrink-0">
                <h2 className="font-display font-bold text-[15px] mb-1">{td.panel.configuracion}</h2>
              </div>
              <div className="flex-1 overflow-y-auto px-1 pt-1 pb-2">
                <div className="space-y-2">
                  {/* Cuenta */}
                  <div>
                    <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1 px-2">{td.panel.cuenta}</p>
                    <div className="space-y-px">
                      <button onClick={() => abrirSettings('editar-cuenta')} className={`w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display transition-colors ${settingsTab === 'editar-cuenta' ? 'bg-primary/3 text-selected font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'}`}>
                        <Icon name="edit" className="text-[16px] leading-none" />
                        {td.panel.editarCuenta}
                      </button>
                      <button onClick={() => setSettingsTab('suscripcion')} className={`w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display transition-colors ${settingsTab === 'suscripcion' ? 'bg-primary/3 text-selected font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'}`}>
                        <Icon name="card_membership" fill={settingsTab === 'suscripcion'} className="text-[16px] leading-none" />
                        {td.panel.suscripcion}
                      </button>
                    </div>
                  </div>

                  {/* Gestión de usuarios */}
                  <div>
                    <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1 px-2">{td.panel.gestionUsuarios}</p>
                    <div className="space-y-px">
                      <button onClick={() => setSettingsTab('crear-usuarios')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors">
                        <Icon name="person_add" className="text-[16px] leading-none" />
                        {td.panel.crearUsuarios}
                      </button>
                      <button onClick={() => setSettingsTab('permisos')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors">
                        <Icon name="admin_panel_settings" className="text-[16px] leading-none" />
                        {td.panel.permisos}
                      </button>
                      <button onClick={() => setSettingsTab('analitica-usuarios')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors">
                        <Icon name="analytics" className="text-[16px] leading-none" />
                        {td.panel.analitica}
                      </button>
                    </div>
                  </div>

                  {/* Seguridad */}
                  <div>
                    <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1 px-2">{td.panel.seguridad}</p>
                    <div className="space-y-px">
                      <button onClick={() => setSettingsTab('historial-login')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors">
                        <Icon name="history" className="text-[16px] leading-none" />
                        {td.panel.historialLogin}
                      </button>
                      <button onClick={() => setSettingsTab('cambiar-password')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors">
                        <Icon name="lock" className="text-[16px] leading-none" />
                        {td.panel.cambiarPassword}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* Contenido principal */}
          <div className={`flex-1 min-w-0 overflow-y-auto ${activeSection === 'conversations' ? '' : 'px-4 md:px-6 pt-4 pb-6'}`}>
          {activeSection === 'settings' ? (
            settingsTab === 'suscripcion' ? (
              <SuscripcionCheckout />
            ) : settingsTab === 'cuenta' ? (
              /* Vista inicial de Configuración: accesos a Editar datos y Suscripción */
              <div className="max-w-xl mx-auto">
                <div className="mb-6">
                  <h1 className="font-display text-xl font-bold mb-1">{td.panel.configuracion}</h1>
                  <p className="text-[13px] text-on-surface-variant">{td.cuentaForm.subtitulo}</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => abrirSettings('editar-cuenta')}
                    className="w-full flex items-center gap-4 border border-outline-variant bg-surface-container rounded-2xl p-5 text-left transition-colors hover:bg-surface-container-high/40"
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple/8 flex items-center justify-center shrink-0">
                      <Icon name="manage_accounts" className="text-purple text-[20px] leading-none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-[14px] text-on-surface">{td.cuentaForm.titulo}</p>
                      <p className="text-[12px] text-on-surface-variant leading-[1.5]">{td.cuentaForm.subtitulo}</p>
                    </div>
                    <Icon name="chevron_right" className="text-on-surface-variant text-[18px] shrink-0" />
                  </button>

                  <button
                    onClick={() => abrirSettings('suscripcion')}
                    className="w-full flex items-center gap-4 border border-outline-variant bg-surface-container rounded-2xl p-5 text-left transition-colors hover:bg-surface-container-high/40"
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple/8 flex items-center justify-center shrink-0">
                      <Icon name="card_membership" className="text-purple text-[20px] leading-none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-[14px] text-on-surface">{td.panel.suscripcion}</p>
                      <p className="text-[12px] text-on-surface-variant leading-[1.5]">{td.paginas['setup-subscription'].description}</p>
                    </div>
                    <Icon name="chevron_right" className="text-on-surface-variant text-[18px] shrink-0" />
                  </button>

                  <button
                    onClick={() => abrirSettings('crear-usuarios')}
                    className="w-full flex items-center gap-4 border border-outline-variant bg-surface-container rounded-2xl p-5 text-left transition-colors hover:bg-surface-container-high/40"
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple/8 flex items-center justify-center shrink-0">
                      <Icon name="group_add" className="text-purple text-[20px] leading-none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-[14px] text-on-surface">{td.panel.gestionUsuarios}</p>
                      <p className="text-[12px] text-on-surface-variant leading-[1.5]">{td.cuentaForm.usuariosDesc}</p>
                    </div>
                    <Icon name="chevron_right" className="text-on-surface-variant text-[18px] shrink-0" />
                  </button>

                  <button
                    onClick={() => abrirSettings('historial-login')}
                    className="w-full flex items-center gap-4 border border-outline-variant bg-surface-container rounded-2xl p-5 text-left transition-colors hover:bg-surface-container-high/40"
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple/8 flex items-center justify-center shrink-0">
                      <Icon name="security" className="text-purple text-[20px] leading-none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-[14px] text-on-surface">{td.panel.seguridad}</p>
                      <p className="text-[12px] text-on-surface-variant leading-[1.5]">{td.cuentaForm.seguridadDesc}</p>
                    </div>
                    <Icon name="chevron_right" className="text-on-surface-variant text-[18px] shrink-0" />
                  </button>
                </div>
              </div>
            ) : settingsTab === 'editar-cuenta' ? (
              /* Perfil de cuenta con edición inline: el mismo layout se vuelve editable */
              <div className="max-w-xl mx-auto">
                {settingsMsg && (
                  <div className="mb-4 p-3 rounded-lg border border-outline-variant text-on-surface text-[13px] font-display">{settingsMsg}</div>
                )}

                <div className="flex flex-col items-center text-center pt-4">
                  {/* Foto grande; en edición se puede cambiar dando clic */}
                  <div className="relative mb-4">
                    {cuentaEditando ? (
                      <label className="block w-28 h-28 rounded-full overflow-hidden bg-surface-container-high cursor-pointer group" title={td.cuentaForm.cambiarFoto}>
                        {editAvatar ? (
                          <img src={editAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center font-display font-bold text-[36px] text-on-surface-variant">
                            {(usuario?.nombre || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="absolute inset-0 rounded-full bg-inverse-surface/0 group-hover:bg-inverse-surface/30 transition-colors flex items-center justify-center">
                          <Icon name="photo_camera" className="text-inverse-on-surface text-[22px] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                        <input type="file" accept="image/*" onChange={onFotoSeleccionada} className="hidden" />
                      </label>
                    ) : (
                      <div className="w-28 h-28 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center">
                        {usuario?.avatar ? (
                          <img src={usuario.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-display font-bold text-[36px] text-on-surface-variant">
                            {(usuario?.nombre || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {cuentaEditando && editAvatar && (
                    <button type="button" onClick={() => setEditAvatar('')}
                      className="-mt-2 mb-2 text-[11px] font-display text-on-surface-variant hover:text-error transition-colors">
                      {td.cuentaForm.quitarFoto}
                    </button>
                  )}

                  {/* Nombre y apellidos, en su lugar */}
                  {cuentaEditando ? (
                    <div className="flex gap-2 w-full max-w-sm">
                      <input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                        placeholder={td.cuentaForm.nombre}
                        className="flex-1 min-w-0 bg-surface-container-high/50 rounded-lg px-3 py-2 text-center font-display font-bold text-[15px] text-on-surface placeholder:font-normal placeholder:text-outline outline-none" />
                      <input type="text" value={editApellido} onChange={(e) => setEditApellido(e.target.value)}
                        placeholder={td.cuentaForm.apellido}
                        className="flex-1 min-w-0 bg-surface-container-high/50 rounded-lg px-3 py-2 text-center font-display font-bold text-[15px] text-on-surface placeholder:font-normal placeholder:text-outline outline-none" />
                    </div>
                  ) : (
                    <h1 className="font-display text-xl font-bold">{usuario?.nombre || '—'}</h1>
                  )}

                  {/* Correo, en su lugar */}
                  {cuentaEditando ? (
                    <div className="w-full max-w-sm mt-2">
                      <input type="email" value={editEmail} onChange={(e) => { setEditEmail(e.target.value); setEmailPaso('idle') }}
                        className="w-full bg-surface-container-high/50 rounded-lg px-3 py-2 text-center text-[13px] font-body text-on-surface outline-none" />
                      <div className="flex items-start justify-center gap-1.5 mt-1.5 text-[11px] text-on-surface-variant leading-[1.5]">
                        <Icon name="info" className="text-[13px] leading-none mt-0.5 shrink-0" />
                        {td.cuentaForm.avisoCorreo}
                      </div>
                      {editEmail.trim().toLowerCase() !== (usuario?.email || '').toLowerCase() && emailPaso === 'idle' && (
                        <button type="button" onClick={solicitarCambioCorreo}
                          className="mt-2 border border-outline-variant hover:bg-surface-container-high/40 px-3 py-2 rounded-lg text-[12px] font-display font-semibold text-on-surface transition-colors">
                          {td.cuentaForm.enviarCodigo}
                        </button>
                      )}
                      {emailPaso === 'codigo' && (
                        <div className="mt-3 border border-outline-variant rounded-lg p-3.5">
                          <p className="text-[12px] text-on-surface-variant mb-2">{td.cuentaForm.codigoEnviado(editEmail.trim())}</p>
                          <div className="flex items-center justify-center gap-2">
                            <input type="text" inputMode="numeric" value={emailCodigo}
                              onChange={(e) => setEmailCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000" maxLength={6}
                              className="w-28 bg-surface-container-high/50 rounded-lg px-3 py-2 text-[13px] font-body text-on-surface text-center tracking-[0.3em] outline-none" />
                            <button type="button" onClick={confirmarCambioCorreo} disabled={emailCodigo.length !== 6}
                              className="bg-primary text-on-primary px-3 py-2 rounded-lg text-[12px] font-display font-semibold transition-all active:scale-[0.98] disabled:opacity-50">
                              {td.cuentaForm.confirmarCorreo}
                            </button>
                            <button type="button" onClick={() => { setEmailPaso('idle'); setEditEmail(usuario?.email || '') }}
                              className="px-2 py-2 text-[12px] font-display text-on-surface-variant hover:text-on-surface transition-colors">
                              {td.cuentaForm.cancelar}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[13px] text-on-surface-variant mt-1">{usuario?.email}</p>
                  )}

                  {/* Acción: Editar ↔ Guardar/Cancelar, en el mismo lugar */}
                  {cuentaEditando ? (
                    <div className="flex items-center gap-2 mt-5">
                      <button onClick={guardarCuenta} disabled={cuentaGuardando || !editNombre.trim()}
                        className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50">
                        {cuentaGuardando ? td.cuentaForm.guardando : td.cuentaForm.guardar}
                      </button>
                      <button onClick={() => { setCuentaEditando(false); setSettingsMsg(''); abrirSettings('editar-cuenta') }}
                        className="px-4 py-2.5 text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors">
                        {td.cuentaForm.cancelar}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setCuentaEditando(true); setSettingsMsg('') }}
                      className="mt-5 bg-primary text-on-primary px-6 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 flex items-center gap-1.5">
                      <Icon name="edit" className="text-[15px] leading-none" />
                      {td.cuentaForm.editar}
                    </button>
                  )}
                </div>

                {/* Plan y límites */}
                {usuario?.suscripcion && (
                  <div className="mt-8">
                    {/* Línea divisoria entre el perfil y el plan */}
                    <div className="h-px bg-outline-variant mb-5" />
                    <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-2">{td.card.plan}</p>
                    <div className="space-y-2">
                    <div className="flex items-center gap-3 border border-outline-variant rounded-xl p-3.5">
                      <div className="w-9 h-9 rounded-lg bg-purple/8 flex items-center justify-center shrink-0">
                        <Icon name="workspace_premium" className="text-purple text-[18px] leading-none" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-[13px] text-on-surface">Aliwa {usuario.suscripcion.plan}</p>
                        <p className="text-[12px] text-on-surface-variant capitalize">
                          {usuario.suscripcion.estado}
                          {usuario.suscripcion.modalidad_pago && usuario.suscripcion.estado === 'activa' && (
                            <> · {{
                              mensual: 'Mensual automático',
                              adelantado: 'Meses por adelantado',
                              unico: 'Pago único',
                            }[usuario.suscripcion.modalidad_pago] || usuario.suscripcion.modalidad_pago}</>
                          )}
                          {usuario.suscripcion.periodo_fin && usuario.suscripcion.estado === 'activa' && (
                            <> · hasta {new Date(usuario.suscripcion.periodo_fin).toLocaleDateString(localeFecha)}</>
                          )}
                        </p>
                      </div>
                      <button type="button" onClick={() => abrirSettings('suscripcion')}
                        className="text-[12px] font-display font-semibold text-primary hover:underline shrink-0">
                        {td.panel.suscripcion} →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-3 border border-outline-variant rounded-xl p-3.5">
                        <Icon name="group" className="text-on-surface-variant text-[18px] leading-none shrink-0" />
                        <div className="min-w-0">
                          <p className="font-display font-semibold text-[14px] text-on-surface">{usuario.suscripcion.qty_usuarios ?? '—'}</p>
                          <p className="text-[11px] text-on-surface-variant">{td.cuentaForm.usuariosIncluidos}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 border border-outline-variant rounded-xl p-3.5">
                        <Icon name="call" className="text-on-surface-variant text-[18px] leading-none shrink-0" />
                        <div className="min-w-0">
                          <p className="font-display font-semibold text-[14px] text-on-surface">{usuario.suscripcion.qty_numeros ?? '—'}</p>
                          <p className="text-[11px] text-on-surface-variant">{td.cuentaForm.numerosWa}</p>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-outline-variant bg-surface-container rounded-2xl p-10 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple/8 mb-4">
                  <Icon name="settings" className="text-purple text-[22px]" />
                </div>
                <h3 className="font-display text-sm font-semibold mb-2">
                  {{
                    'editar-cuenta': td.panel.editarCuenta,
                    'crear-usuarios': td.panel.crearUsuarios,
                    'permisos': td.panel.permisos,
                    'analitica-usuarios': td.panel.analitica,
                    'historial-login': td.panel.historialLogin,
                    'cambiar-password': td.panel.cambiarPassword,
                  }[settingsTab] || td.panel.configuracion}
                </h3>
                <p className="text-[13px] text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                  {td.emptyState.texto}
                </p>
              </div>
            )
          ) : activeSection === 'setup' ? (
            <div className="max-w-xl">
              <div className="mb-6">
                <h1 className="font-display text-xl font-bold mb-1">{td.setup.titulo}</h1>
                <p className="text-[13px] text-on-surface-variant">{td.setup.subtitulo}</p>
              </div>

              {setupError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-[13px] font-display">{setupError}</div>
              )}

              <form onSubmit={guardarNegocio} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">{td.setup.nombreLabel}</label>
                  <input type="text" value={setupNombre} onChange={(e) => setSetupNombre(e.target.value)} placeholder={td.setup.nombrePlaceholder} autoFocus
                    className="w-full bg-surface-container-high/50 rounded-lg px-4 py-2.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">{td.setup.giroLabel}</label>
                  <button
                    type="button"
                    onClick={() => { setGiroOpen(!giroOpen); setGiroBuscar('') }}
                    className="w-full flex items-center justify-between bg-surface-container hover:bg-surface-container-high/60 rounded-lg px-4 py-2.5 text-[13px] font-display text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    <span className={setupGiro ? 'text-on-surface' : 'text-outline-variant'}>{setupGiro || td.setup.seleccionaGiro}</span>
                    <Icon name={giroOpen ? 'expand_less' : 'expand_more'} className="text-on-surface-variant text-[18px]" />
                  </button>
                  {giroOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setGiroOpen(false)} />
                      <div className="absolute z-40 left-0 right-0 mt-1 bg-surface-container-high rounded-lg overflow-hidden">
                        <div className="px-3 py-2 border-b border-outline-variant">
                          <div className="flex items-center gap-2 bg-surface-container-high/40 rounded-md px-3 py-1.5">
                            <Icon name="search" className="text-on-surface-variant text-[16px] leading-none" />
                            <input
                              type="text"
                              value={giroBuscar}
                              onChange={(e) => setGiroBuscar(e.target.value)}
                              placeholder={td.setup.buscarGiro}
                              autoFocus
                              className="flex-1 bg-transparent text-[13px] font-display text-on-surface placeholder:text-outline-variant outline-none"
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1">
                          {girosNegocio
                            .filter(g => g.toLowerCase().includes(giroBuscar.toLowerCase()))
                            .map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => { setSetupGiro(g); setGiroOpen(false) }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-display transition-colors ${
                                  setupGiro === g
                                    ? 'bg-primary/3 text-selected font-bold'
                                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                                }`}
                              >
                                {setupGiro === g && <Icon name="check" className="text-[15px] leading-none" />}
                                <span className={setupGiro === g ? '' : 'pl-[23px]'}>{g}</span>
                              </button>
                            ))}
                          {girosNegocio.filter(g => g.toLowerCase().includes(giroBuscar.toLowerCase())).length === 0 && (
                            <p className="px-3 py-3 text-[13px] text-on-surface-variant text-center">{td.setup.sinResultados}</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">{td.setup.telefonoLabel}</label>
                    <input type="tel" value={setupTelefono} onChange={(e) => setSetupTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="614 123 4567"
                      className="w-full bg-surface-container-high/50 rounded-lg px-4 py-2.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">{td.setup.correoLabel}</label>
                    <input type="email" value={setupCorreo} onChange={(e) => setSetupCorreo(e.target.value)} placeholder={td.setup.correoPlaceholder}
                      className="w-full bg-surface-container-high/50 rounded-lg px-4 py-2.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">{td.setup.direccionLabel}</label>
                  <input type="text" value={setupDireccion} onChange={(e) => setSetupDireccion(e.target.value)} placeholder={td.setup.direccionPlaceholder}
                    className="w-full bg-surface-container-high/50 rounded-lg px-4 py-2.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={setupLoading || !setupNombre || !setupGiro}
                    className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
                    {setupLoading ? td.setup.guardando : td.setup.guardarContinuar}
                    {!setupLoading && <Icon name="arrow_forward" className="text-[15px]" />}
                  </button>
                  <button type="button" onClick={() => handleNav('dashboard')}
                    className="text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors">
                    {td.setup.omitirAhora}
                  </button>
                </div>
              </form>
            </div>
          ) : activeSection === 'setup-whatsapp' ? (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h1 className="font-display text-xl font-bold mb-1">{td.setupWhatsapp.titulo}</h1>
                <p className="text-[13px] text-on-surface-variant">{td.setupWhatsapp.subtitulo}</p>
              </div>
              <WhatsappSection
                onConectado={() => {
                  setWaConectado(true)
                  apiFetch('/api/negocios/').then(({ res, data }) => {
                    if (res.ok) {
                      const lista = data.results || data || []
                      setNegocios(lista)
                      if (lista.length > 0) setNegocioActivo(lista[0])
                    }
                  }).catch(() => {})
                }}
                onSiguiente={() => handleNav('setup-team')}
              />
            </div>
          ) : activeSection === 'setup-payments' ? (
            <div className="max-w-xl">
              <div className="mb-6">
                <h1 className="font-display text-xl font-bold mb-1">{current.title}</h1>
                <p className="text-[13px] text-on-surface-variant">{current.description}</p>
              </div>
              <OpenpaySection
                negocio={negocioActivo}
                onConectado={() => {
                  apiFetch('/api/negocios/').then(({ res, data }) => {
                    if (res.ok) {
                      const lista = data.results || data || []
                      setNegocios(lista)
                      if (lista.length > 0) setNegocioActivo(lista[0])
                    }
                  }).catch(() => {})
                }}
                onSiguiente={() => handleNav('setup-invoicing')}
                onOmitir={() => handleNav('dashboard')}
              />
            </div>
          ) : ['setup-invoicing', 'setup-subscription'].includes(activeSection) ? (
            <div className="max-w-xl">
              <div className="mb-6">
                <h1 className="font-display text-xl font-bold mb-1">{current.title}</h1>
                <p className="text-[13px] text-on-surface-variant">{current.description}</p>
              </div>
              <div className="border border-outline-variant bg-surface-container rounded-2xl p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple/8 mb-4">
                  <Icon name={{
                    'setup-invoicing': 'description',
                    'setup-subscription': 'account_balance_wallet',
                  }[activeSection]} className="text-purple text-[22px]" />
                </div>
                <p className="text-[13px] text-on-surface-variant mb-6">
                  {td.setupPlaceholder.disponible}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {{
                    'setup-invoicing': 'setup-subscription',
                    'setup-subscription': null,
                  }[activeSection] ? (
                    <button
                      onClick={() => handleNav({
                        'setup-invoicing': 'setup-subscription',
                      }[activeSection])}
                      className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 flex items-center gap-1.5"
                    >
                      {td.setupPlaceholder.siguiente}
                      <Icon name="arrow_forward" className="text-[15px]" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleNav('dashboard')}
                      className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 flex items-center gap-1.5"
                    >
                      {td.setupPlaceholder.irDashboard}
                    </button>
                  )}
                  <button
                    onClick={() => handleNav('dashboard')}
                    className="text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    {td.setupPlaceholder.omitir}
                  </button>
                </div>
              </div>
            </div>
          ) : activeSection === 'conversations' ? (
            <ConversacionesPanel usuarioId={usuario?.id} />
          ) : (
            <>
              <div className="mb-6">
                <h1 className="font-display text-xl font-bold mb-1">
                  {activeSection === 'dashboard'
                    ? td.bienvenida(nombreUsuario || '')
                    : current.title
                  }
                </h1>
                <p className="text-[13px] text-on-surface-variant">{current.description}</p>
              </div>

              {/* Tu equipo — usuarios existentes + agregar (con límite del plan) */}
              {activeSection === 'setup-team' && (
                <>
                  <EquipoSection
                    limite={usuario?.suscripcion?.qty_usuarios}
                    usuarioActualId={usuario?.id}
                  />
                  <div className="max-w-2xl flex items-center gap-3 mt-5">
                    <button
                      onClick={() => {
                        localStorage.setItem('aliwa-setup-team-done', '1')
                        setEquipoListo(true)
                        handleNav('setup-payments')
                      }}
                      className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 flex items-center gap-1.5"
                    >
                      {td.setupTeam.continuar}
                      <Icon name="arrow_forward" className="text-[15px]" />
                    </button>
                    <button
                      onClick={() => handleNav('dashboard')}
                      className="text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      {td.setupTeam.omitir}
                    </button>
                  </div>
                </>
              )}

              {/* Plantillas de mensajes de WhatsApp */}
              {activeSection === 'customers' && <PlantillasSection />}

              {/* Números de WhatsApp (gestión + perfil) */}
              {activeSection === 'numbers' && (
                <div className="max-w-2xl">
                  <WhatsappSection gestion onConectado={() => setWaConectado(true)} />
                </div>
              )}

              {/* Card de usuario + Soporte - solo en dashboard */}
              {activeSection === 'dashboard' && usuario && (
                <div className="flex gap-3 mb-4">
                  {/* Card usuario */}
                  <div className="flex-1 border border-outline-variant bg-surface-container rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center shrink-0">
                        <span className="text-purple font-display font-bold text-sm">
                          {usuario.nombre ? usuario.nombre.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : '?'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm">{usuario.nombre || td.card.sinNombre}</h3>
                        <p className="text-[12px] text-on-surface-variant">{usuario.rol === 'owner' ? td.roles.owner : usuario.rol === 'admin' ? td.roles.admin : td.roles.agente}</p>
                      </div>
                    </div>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${!panelActivo && collapsed ? 'lg:grid-cols-4' : ''}`}>
                      <div className="flex items-center gap-2.5 bg-surface-container-high/40 rounded-lg px-3 py-2.5">
                        <Icon name="mail" className="text-on-surface-variant text-[16px] leading-none" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">{td.card.correo}</div>
                          <div className="text-[13px] font-display truncate">{usuario.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 bg-surface-container-high/40 rounded-lg px-3 py-2.5">
                        <Icon name="account_balance_wallet" className="text-on-surface-variant text-[16px] leading-none" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">{td.card.saldo}</div>
                          <div className="text-[13px] font-display">$0.00 MXN</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 bg-surface-container-high/40 rounded-lg px-3 py-2.5">
                        <Icon name="workspace_premium" className="text-on-surface-variant text-[16px] leading-none" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">{td.card.plan}</div>
                          <div className="text-[13px] font-display">{usuario.suscripcion?.plan || td.card.sinPlan}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 bg-surface-container-high/40 rounded-lg px-3 py-2.5">
                        <Icon name="timer" className="text-on-surface-variant text-[16px] leading-none" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">{td.card.pruebaGratis}</div>
                          <div className="text-[13px] font-display">{usuario.suscripcion?.prueba_termina_en ? td.card.diasRestantes(Math.max(0, Math.ceil((new Date(usuario.suscripcion.prueba_termina_en) - new Date()) / 86400000))) : '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Card soporte */}
                  <div className="w-[200px] shrink-0 border border-outline-variant bg-surface-container rounded-2xl p-4 flex flex-col justify-center gap-3">
                    <div className="flex items-center gap-2.5">
                      <img src="/icons/whatsapp.svg" alt="" className="w-4 h-4" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">{td.card.soporte}</div>
                        <a href="https://wa.me/5218281184756" target="_blank" rel="noopener noreferrer" className="text-[13px] font-display text-primary hover:underline">+52 828 118 4756</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Icon name="rate_review" className="text-tertiary text-[16px] leading-none" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">{td.card.feedback}</div>
                        <a href="mailto:hola@aliwa.mx" className="text-[13px] font-display text-tertiary hover:underline">hola@aliwa.mx</a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Guía de inicio - solo en dashboard */}
              {activeSection === 'dashboard' && (() => {
                const negocioConfigurado = negocioActivo?.giro
                const guiaSteps = [
                  { icon: 'person_add', label: td.guia.pasos[0], done: true, nav: null },
                  { icon: 'add_business', label: td.guia.pasos[1], done: !!negocioConfigurado, nav: 'setup' },
                  { icon: 'whatsapp', label: td.guia.pasos[2], done: waConectado, nav: 'setup-whatsapp' },
                  { icon: 'group_add', label: td.guia.pasos[3], done: equipoListo, nav: 'setup-team' },
                  { icon: 'assured_workload', label: td.guia.pasos[4], done: !!negocioActivo?.openpay_conectado, nav: 'setup-payments' },
                  { icon: 'receipt_long', label: td.guia.pasos[5], done: false, nav: 'setup-invoicing' },
                  { icon: 'add_card', label: td.guia.pasos[6], done: false, nav: 'setup-subscription' },
                ]
                const completados = guiaSteps.filter(s => s.done).length
                const siguiente = guiaSteps.find(s => !s.done)
                const ultimoHecho = guiaSteps.map(s => s.done).lastIndexOf(true)
                // Track de centro a centro de columna: cada centro está en (i+0.5)/n
                const margenTrack = (0.5 / guiaSteps.length) * 100
                const fillPct = ultimoHecho <= 0 ? 0 : (ultimoHecho / (guiaSteps.length - 1)) * 100

                return (
                  <div className="border border-outline-variant bg-surface-container rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <Icon name="rocket_launch" className="text-tertiary text-[16px] leading-none" />
                        <h3 className="font-display font-bold text-sm">{td.guia.titulo}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-display text-on-surface-variant">{td.guia.contador(completados, guiaSteps.length)}</span>
                        {siguiente && (
                          <button
                            onClick={() => handleNav(siguiente.nav)}
                            className="shrink-0 bg-primary text-on-primary px-4 py-2 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 flex items-center gap-1.5"
                          >
                            {td.guia.siguiente}
                            <Icon name="arrow_forward" className="text-[15px]" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Pasos con la barra de progreso sobrepuesta (pasa detrás de los círculos) */}
                    <div className="relative">
                      <div
                        className="hidden lg:block absolute top-[26px] h-1 bg-surface-container-high rounded-full"
                        style={{ left: `${margenTrack}%`, right: `${margenTrack}%` }}
                      >
                        <div className="h-full bg-tertiary rounded-full transition-all" style={{ width: `${fillPct}%` }} />
                      </div>
                      <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
                        {guiaSteps.map((step, i) => (
                          <button
                            key={i}
                            onClick={() => step.nav && handleNav(step.nav)}
                            className={`flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-lg transition-colors ${step.nav ? 'hover:bg-surface-container-high/60 cursor-pointer' : ''}`}
                          >
                            {/* Completado: se resalta el ícono del paso (no se cambia por check).
                                'whatsapp' usa el logo SVG coloreado vía máscara. */}
                            {(() => {
                              const iconoWa = (clase) => (
                                <span
                                  aria-hidden="true"
                                  className={`w-4 h-4 inline-block ${clase}`}
                                  style={{
                                    WebkitMaskImage: 'url(/icons/whatsapp.svg)',
                                    maskImage: 'url(/icons/whatsapp.svg)',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center',
                                    maskPosition: 'center',
                                    WebkitMaskSize: 'contain',
                                    maskSize: 'contain',
                                  }}
                                />
                              )
                              return step.done ? (
                                <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center">
                                  {step.icon === 'whatsapp'
                                    ? iconoWa('bg-on-tertiary')
                                    : <Icon name={step.icon} fill className="text-on-tertiary text-[16px]" />}
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full border-2 border-outline-variant bg-surface-container-lowest flex items-center justify-center">
                                  {step.icon === 'whatsapp'
                                    ? iconoWa('bg-on-surface-variant')
                                    : <Icon name={step.icon} className="text-on-surface-variant text-[16px]" />}
                                </div>
                              )
                            })()}
                            <span className={`text-[11px] font-display text-center leading-tight ${step.done ? 'text-tertiary font-bold' : 'text-on-surface-variant'}`}>
                              {step.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Empty state - solo en secciones que no son dashboard */}
              {!['dashboard', 'setup-team', 'customers', 'numbers'].includes(activeSection) && (
                <div className="border border-outline-variant bg-surface-container rounded-2xl p-10 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple/8 mb-4">
                    <Icon name={menuGroups.flatMap(g => g.items ? g.items : [g]).find(m => m.id === activeSection)?.icon || 'info'} className="text-purple text-[22px]" />
                  </div>
                  <h3 className="font-display text-sm font-semibold mb-2">
                    {td.emptyState.titulo(current.title)}
                  </h3>
                  <p className="text-[13px] text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                    {td.emptyState.texto}
                  </p>
                  <button
                    onClick={() => handleNav('dashboard')}
                    className="mt-5 bg-primary text-on-primary px-5 py-2 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98]"
                  >
                    {td.emptyState.irDashboard}
                  </button>
                </div>
              )}
            </>
          )}
          </div>

          {/* Panel lateral derecho — exclusivo para notificaciones */}
          {panelActivo === 'notificaciones' && (
            <aside className="w-52 shrink-0 border-l border-outline-variant bg-surface-container flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-2.5 h-11 flex items-center shrink-0">
                <h3 className="font-display font-bold text-[15px]">{td.panel.notificaciones}</h3>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-3">

                {/* Notificaciones */}
                {(
                  notifLoading ? (
                    <div className="py-10 text-center text-[13px] text-on-surface-variant">{td.panel.cargando}</div>
                  ) : notificaciones.length === 0 ? (
                    <div className="py-10 text-center">
                      <Icon name="notifications_none" className="text-outline-variant text-[28px] mb-1.5" />
                      <p className="text-[13px] text-on-surface-variant">{td.panel.sinNotificaciones}</p>
                    </div>
                  ) : (
                    <div className="space-y-px">
                      {notificaciones.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => !n.leida && marcarLeida(n.id)}
                          className={`w-full text-left px-2 py-1.5 transition-colors ${!n.leida ? 'bg-primary/3 hover:bg-primary/5 cursor-pointer' : 'bg-surface-container-lowest'}`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon name={n.icono || 'info'} className={`text-[15px] mt-0.5 shrink-0 leading-none ${!n.leida ? 'text-selected' : 'text-on-surface-variant'}`} />
                            <div className="min-w-0">
                              <p className={`text-[13px] font-display leading-tight ${!n.leida ? 'font-bold text-selected' : 'font-medium text-on-surface-variant'}`}>{n.titulo}</p>
                              <p className="text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">{n.mensaje}</p>
                              <p className="text-[11px] text-outline mt-1">{new Date(n.creada).toLocaleDateString(localeFecha, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  )
}
