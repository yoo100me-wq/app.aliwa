import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/shared/Icon'
import AliwaIcon, { AliwaLogo } from '../components/shared/AliwaIcon'
import useTheme from '../hooks/useTheme'
import ConversacionesPanel from '../components/dashboard/ConversacionesPanel'
import EquipoSection from '../components/dashboard/EquipoSection'
import { apiFetch } from '../utils/api'
import { initFacebookSDK, launchWhatsAppSignup } from '../utils/facebook'

const menuGroups = [
  { id: 'dashboard', icon: 'widgets', label: 'Panel' },
  {
    label: 'CRM', icon: 'group_work',
    items: [
      { id: 'conversations', icon: 'chat', label: 'Chats' },
      { id: 'leads', icon: 'person_search', label: 'Contactos' },
      { id: 'customers', icon: 'stacks', label: 'Plantillas' },
      { id: 'sales-flow', icon: 'filter_list', label: 'Embudo', iconClass: '-rotate-90' },
      { id: 'process-flow', icon: 'graph_1', label: 'Pipelines' },
      { id: 'appointments', icon: 'view_week', label: 'Citas' },
    ],
  },
  {
    label: 'Facturas', icon: 'description',
    items: [
      { id: 'invoiced', icon: 'task_alt', label: 'Facturación' },
    ],
  },
]

const pageContent = {
  setup: { title: 'Configurar negocio', description: 'Completa la información de tu negocio para empezar.' },
  'setup-whatsapp': { title: 'Conectar WhatsApp', description: 'Vincula tu número de WhatsApp Business.' },
  'setup-team': { title: 'Tu equipo', description: 'Invita a tu equipo y asigna permisos.' },
  'setup-payments': { title: 'Cobros', description: 'Configura OpenPay para cobrar a tus clientes.' },
  'setup-invoicing': { title: 'Facturación', description: 'Configura la emisión de facturas CFDI.' },
  'setup-subscription': { title: 'Suscripción', description: 'Agrega tu método de pago para continuar después de la prueba.' },
  dashboard: { title: null, description: 'Aquí verás el resumen de tu negocio.' },
  conversations: { title: 'Chats', description: 'Gestiona los chats de WhatsApp con tus clientes.' },
  leads: { title: 'Contactos', description: 'Prospectos y clientes de tu negocio.' },
  customers: { title: 'Plantillas', description: 'Plantillas de mensajes para WhatsApp.' },
  'sales-flow': { title: 'Embudo', description: 'Pipelines de venta personalizados.' },
  'process-flow': { title: 'Pipelines', description: 'Seguimiento de procesos y tratamientos.' },
  appointments: { title: 'Citas', description: 'Agenda y gestiona las citas de tus clientes.' },
  charges: { title: 'Cargos', description: 'Cobra a tus clientes con tarjeta o transferencia.' },
  transactions: { title: 'Transacciones', description: 'Historial de pagos recibidos.' },
  invoiced: { title: 'Facturación', description: 'Facturas CFDI emitidas.' },
  'pending-invoice': { title: 'Pendiente de facturar', description: 'Pagos que aún no se han facturado.' },
  'report-financial': { title: 'Reporte financiero', description: 'Ingresos, egresos y flujo de efectivo.' },
  'report-fiscal': { title: 'Reporte fiscal', description: 'Resumen para declaraciones fiscales.' },
  'report-operative': { title: 'Reporte operativo', description: 'Métricas de operación del negocio.' },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
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
  const [panelActivo, setPanelActivo] = useState(null) // null | 'notificaciones' | 'settings'
  const [settingsTab, setSettingsTab] = useState('cuenta')
  const [editNombre, setEditNombre] = useState('')
  const [editApellido, setEditApellido] = useState('')
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
  const [waLoading, setWaLoading] = useState(false)
  const [waError, setWaError] = useState('')
  const [waConectado, setWaConectado] = useState(false)
  const [equipoListo, setEquipoListo] = useState(() => localStorage.getItem('aliwa-setup-team-done') === '1')

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
  }, [])

  const nombreUsuario = usuario?.nombre?.split(' ')[0] || ''

  const handleNav = (id) => {
    setActiveSection(id)
    setSidebarOpen(false)
  }

  const girosNegocio = [
    'Dentista', 'Consultorio médico', 'Restaurante', 'Cafetería',
    'Estética / Salón', 'Barbería', 'Gimnasio', 'Spa',
    'Veterinaria', 'Terapia / Psicología', 'Taller mecánico',
    'Tienda / Abarrotes', 'Tutorías / Clases', 'Otro',
  ]

  const guardarNegocio = async (e) => {
    e.preventDefault()
    if (!setupNombre || !setupGiro) { setSetupError('Nombre y giro son requeridos'); return }
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
        setSetupError(data.error || 'Error al configurar')
      }
    } catch {
      setSetupError('Error de conexión')
    } finally {
      setSetupLoading(false)
    }
  }

  const conectarWhatsApp = async () => {
    setWaError('')
    setWaLoading(true)
    try {
      const { code, sessionData, origin, href, wabaId, phoneNumberId } = await launchWhatsAppSignup()
      const { res, data } = await apiFetch('/api/whatsapp/conectar/', {
        method: 'POST',
        body: JSON.stringify({ code, session_data: sessionData, origin, href, waba_id: wabaId, phone_number_id: phoneNumberId }),
      })
      if (res.ok) {
        setWaConectado(true)
        // Recargar negocios para actualizar estado
        const { res: r2, data: d2 } = await apiFetch('/api/negocios/')
        if (r2.ok) {
          const lista = d2.results || d2 || []
          setNegocios(lista)
          if (lista.length > 0) setNegocioActivo(lista[0])
        }
      } else {
        setWaError(data.error || 'Error al conectar WhatsApp')
      }
    } catch (e) {
      if (e.message !== 'cancel') setWaError('Error al conectar. Intenta de nuevo.')
    } finally {
      setWaLoading(false)
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

  const abrirSettings = (tab = 'cuenta') => {
    setPanelActivo('settings')
    setSettingsTab(tab)
    setSettingsMsg('')
    if (tab === 'cuenta' && usuario) {
      setEditNombre(usuario.nombre?.split(' ')[0] || '')
      setEditApellido(usuario.apellido || usuario.nombre?.split(' ').slice(1).join(' ') || '')
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
    const { res, data } = await apiFetch('/api/auth/actualizar-perfil/', {
      method: 'PATCH',
      body: JSON.stringify({ nombre: editNombre, apellido: editApellido }),
    })
    if (res.ok) {
      setUsuario(data)
      setSettingsMsg('Datos actualizados')
    } else {
      setSettingsMsg(data.error || 'Error al actualizar')
    }
  }

  const cambiarPassword = async () => {
    setSettingsMsg('')
    if (passNueva !== passConfirm) { setSettingsMsg('Las contraseñas no coinciden'); return }
    if (passNueva.length < 8) { setSettingsMsg('Mínimo 8 caracteres'); return }
    const { res, data } = await apiFetch('/api/auth/cambiar-password/', {
      method: 'POST',
      body: JSON.stringify({ password_actual: passActual, password_nueva: passNueva }),
    })
    if (res.ok) {
      setPassActual('')
      setPassNueva('')
      setPassConfirm('')
      setSettingsMsg('Contraseña actualizada')
    } else {
      setSettingsMsg(data.error || 'Error al cambiar contraseña')
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar group wrapper — la pestaña aparece al hacer hover */}
      <div className="group/sidebar">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 bg-surface-container flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-[72px]' : 'w-52'}`}>

          {/* Logo */}
          <div className={`h-11 mt-3 flex items-center shrink-0 ${collapsed ? 'justify-center px-0' : 'gap-2 px-4'}`}>
            <AliwaIcon size={collapsed ? 28 : 30} />
            {!collapsed && <span className="text-base font-logo font-bold text-on-surface">Aliwa</span>}
          </div>

          {/* Línea decorativa bajo el logo */}
          <div className="h-px bg-outline-variant/30 mt-3 shrink-0" />

          {/* Nav */}
          <nav className={`flex-1 overflow-y-auto py-1 ${collapsed ? 'px-1.5' : 'px-3'}`}>
            {menuGroups.map((group) => {
              // Item suelto (Dashboard)
              if (group.id) {
                return (
                  <button
                    key={group.id}
                    onClick={() => handleNav(group.id)}
                    title={collapsed ? group.label : undefined}
                    className={`w-full flex items-center gap-2 py-1 text-[13px] font-display transition-colors mb-px ${
                      collapsed ? 'justify-center px-0' : 'px-2.5'
                    } ${
                      activeSection === group.id
                        ? 'bg-primary/5 text-primary font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest'
                    }`}
                  >
                    <Icon name={group.icon} fill={activeSection === group.id} className="text-[16px] leading-none" />
                    {!collapsed && group.label}
                  </button>
                )
              }

              // Grupo con subitems
              const hasActive = group.items.some((i) => i.id === activeSection)

              return (
                <div key={group.label} className="mt-2 mb-0.5">
                  {!collapsed && (
                    <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1 px-2.5">{group.label}</p>
                  )}
                  <div className="space-y-px">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        title={collapsed ? item.label : undefined}
                        className={`w-full flex items-center gap-2 py-1 text-[13px] font-display transition-colors ${
                          collapsed ? 'justify-center px-0' : 'px-2.5'
                        } ${
                          activeSection === item.id
                            ? 'bg-primary/5 text-primary font-semibold'
                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest'
                        }`}
                      >
                        <Icon name={item.icon} fill={activeSection === item.id} className={`text-[16px] leading-none ${item.iconClass || ''}`} />
                        {!collapsed && item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </nav>

          {/* Línea decorativa sobre el área de tema/salir */}
          <div className="h-px bg-outline-variant/30 shrink-0" />

          {/* Bottom */}
          <div className={`pb-3 space-y-px pt-2 bg-surface-container-low ${collapsed ? 'px-1.5' : 'px-3'}`}>
            {/* Theme toggle */}
            <button
              onClick={toggleDark}
              title={collapsed ? (dark ? 'Modo oscuro' : 'Modo claro') : undefined}
              className={`w-full flex items-center text-[13px] font-display text-on-surface-variant hover:bg-surface-container-lowest transition-colors ${
                collapsed ? 'justify-center py-1 px-0' : 'justify-between px-2.5 py-1'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon name={dark ? 'dark_mode' : 'light_mode'} className="text-[16px] leading-none" />
                {!collapsed && <span>{dark ? 'Modo oscuro' : 'Modo claro'}</span>}
              </div>
              {!collapsed && (
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${dark ? 'bg-purple' : 'bg-outline-variant'}`}>
                  <div className={`w-4 h-4 rounded-full bg-surface-container-lowest transition-transform duration-300 ${dark ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={async () => {
                await apiFetch('/api/auth/logout/', { method: 'POST' })
                navigate('/login')
              }}
              title={collapsed ? 'Salir' : undefined}
              className={`w-full flex items-center text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors ${
                collapsed ? 'justify-center py-1 px-0' : 'px-2.5 py-1 gap-2'
              }`}
            >
              <Icon name="logout" className="text-[16px] leading-none" />
              {!collapsed && <span>Salir</span>}
            </button>

            {/* Línea decorativa que separa el negocio de tema/salir */}
            <div className={`h-px bg-outline-variant/30 my-1.5 ${collapsed ? '-mx-1.5' : '-mx-3'}`} />

            {/* Negocio */}
            <div className="relative">
              {negocios.length === 0 || (negocios.length === 1 && !negocioActivo?.giro) ? (
                <a
                  href="/configurar-negocio"
                  onClick={(e) => { e.preventDefault(); handleNav('setup') }}
                  className={`w-full block transition-colors border border-dashed border-outline-variant/40 hover:border-tertiary/40 hover:bg-tertiary/5 ${collapsed ? 'p-1.5 flex justify-center' : 'px-2.5 py-2'}`}
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
                        <div className="text-[13px] font-display font-semibold text-on-surface truncate">Configurar negocio</div>
                        <div className="text-[12px] text-on-surface-variant truncate">Aún no tienes uno</div>
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
                  className={`w-full transition-colors hover:bg-surface-container-lowest ${collapsed ? 'p-1.5 flex justify-center' : 'px-2.5 py-2'}`}
                >
                  {collapsed ? (
                    <div className="w-8 h-8 bg-purple/10 flex items-center justify-center">
                      <Icon name="storefront" className="text-purple text-[16px] leading-none" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-purple/10 flex items-center justify-center shrink-0">
                        <Icon name="storefront" className="text-purple text-[16px] leading-none" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-[13px] font-display font-semibold truncate">{negocioActivo?.nombre || 'Mi Negocio'}</div>
                        <div className="text-[12px] text-on-surface-variant truncate">{negocioActivo?.giro || 'Sin configurar'}</div>
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
                    <div className="px-2.5 py-2 border-b border-outline-variant/15">
                      <span className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">Cambiar negocio</span>
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
            ${collapsed ? 'left-[72px]' : 'left-[208px]'}`}
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
        collapsed ? 'lg:ml-[72px]' : 'lg:ml-52'
      }`}>
        {/* Top bar */}
        <header className="relative flex items-center h-11 bg-surface-container-low px-4 md:px-6 gap-4 shrink-0">
          {/* Línea decorativa (sutil, uniforme) */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-outline-variant/30" />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 text-on-surface-variant"
          >
            <Icon name="menu" />
          </button>

          <div className="flex-1 hidden lg:flex items-center gap-1.5 text-sm font-display text-on-surface-variant">
            {(() => {
              const group = menuGroups.find(g => g.items?.some(i => i.id === activeSection))
              if (group) {
                const item = group.items.find(i => i.id === activeSection)
                return <><span>{group.label}</span><span className="text-outline-variant">/</span><span className="text-on-surface font-medium">{item.label}</span></>
              }
              return <span className="text-on-surface font-medium">{current?.title || 'Dashboard'}</span>
            })()}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={abrirNotificaciones}
              className={`p-1.5 transition-colors flex items-center justify-center relative ${panelActivo === 'notificaciones' ? 'bg-primary/5 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              <Icon name="notifications" className="text-[18px] leading-none" />
              {notifNoLeidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error text-on-error text-[10px] font-display font-bold rounded-full flex items-center justify-center">
                  {notifNoLeidas > 9 ? '9+' : notifNoLeidas}
                </span>
              )}
            </button>
            <button
              onClick={() => panelActivo === 'settings' ? setPanelActivo(null) : abrirSettings('cuenta')}
              className={`p-1.5 transition-colors flex items-center justify-center ${panelActivo === 'settings' ? 'bg-primary/5 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              <Icon name="settings" className="text-[18px] leading-none" />
            </button>
          </div>
        </header>

        {/* Content + Panel lateral */}
        <div className="flex-1 flex min-h-0">
          {/* Contenido principal */}
          <div className={`flex-1 min-w-0 overflow-y-auto ${activeSection === 'conversations' ? '' : 'px-4 md:px-6 pt-4 pb-6'}`}>
          {activeSection === 'setup' ? (
            <div className="max-w-xl">
              <div className="mb-6">
                <h1 className="font-display text-xl font-bold mb-1">Configura tu negocio</h1>
                <p className="text-[13px] text-on-surface-variant">Esta información aparecerá en tus mensajes, facturas y perfil.</p>
              </div>

              {setupError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-[13px] font-display">{setupError}</div>
              )}

              <form onSubmit={guardarNegocio} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">Nombre del negocio *</label>
                  <input type="text" value={setupNombre} onChange={(e) => setSetupNombre(e.target.value)} placeholder="Ej: Estética María, Consultorio Dr. López" autoFocus
                    className="w-full bg-surface-container rounded-lg px-4 py-2.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">Giro del negocio *</label>
                  <button
                    type="button"
                    onClick={() => { setGiroOpen(!giroOpen); setGiroBuscar('') }}
                    className="w-full flex items-center justify-between bg-surface-container hover:bg-surface-container-high/60 rounded-lg px-4 py-2.5 text-[13px] font-display text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    <span className={setupGiro ? 'text-on-surface' : 'text-outline-variant'}>{setupGiro || 'Selecciona el giro'}</span>
                    <Icon name={giroOpen ? 'expand_less' : 'expand_more'} className="text-on-surface-variant text-[18px]" />
                  </button>
                  {giroOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setGiroOpen(false)} />
                      <div className="absolute z-40 left-0 right-0 mt-1 bg-surface-container-high rounded-lg overflow-hidden">
                        <div className="px-3 py-2 border-b border-outline-variant/15">
                          <div className="flex items-center gap-2 bg-surface-container-lowest rounded-md px-3 py-1.5">
                            <Icon name="search" className="text-on-surface-variant text-[16px] leading-none" />
                            <input
                              type="text"
                              value={giroBuscar}
                              onChange={(e) => setGiroBuscar(e.target.value)}
                              placeholder="Buscar giro..."
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
                                    ? 'bg-primary/5 text-primary font-semibold'
                                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest'
                                }`}
                              >
                                {setupGiro === g && <Icon name="check" className="text-[15px] leading-none" />}
                                <span className={setupGiro === g ? '' : 'pl-[23px]'}>{g}</span>
                              </button>
                            ))}
                          {girosNegocio.filter(g => g.toLowerCase().includes(giroBuscar.toLowerCase())).length === 0 && (
                            <p className="px-3 py-3 text-[13px] text-on-surface-variant text-center">Sin resultados</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">Teléfono</label>
                    <input type="tel" value={setupTelefono} onChange={(e) => setSetupTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="614 123 4567"
                      className="w-full bg-surface-container rounded-lg px-4 py-2.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">Correo</label>
                    <input type="email" value={setupCorreo} onChange={(e) => setSetupCorreo(e.target.value)} placeholder="contacto@minegocio.com"
                      className="w-full bg-surface-container rounded-lg px-4 py-2.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">Dirección</label>
                  <input type="text" value={setupDireccion} onChange={(e) => setSetupDireccion(e.target.value)} placeholder="Calle, número, colonia, ciudad"
                    className="w-full bg-surface-container rounded-lg px-4 py-2.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={setupLoading || !setupNombre || !setupGiro}
                    className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
                    {setupLoading ? 'Guardando...' : 'Guardar y continuar'}
                    {!setupLoading && <Icon name="arrow_forward" className="text-[15px]" />}
                  </button>
                  <button type="button" onClick={() => handleNav('dashboard')}
                    className="text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors">
                    Omitir por ahora
                  </button>
                </div>
              </form>
            </div>
          ) : activeSection === 'setup-whatsapp' ? (
            <div className="max-w-xl">
              <div className="mb-6">
                <h1 className="font-display text-xl font-bold mb-1">Conectar WhatsApp</h1>
                <p className="text-[13px] text-on-surface-variant">Vincula tu número de WhatsApp Business para enviar y recibir mensajes desde Aliwa.</p>
              </div>

              {waError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-[13px] font-display">{waError}</div>
              )}

              {waConectado ? (
                <div className="bg-surface-container rounded-2xl p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-tertiary/10 mb-4">
                    <Icon name="check_circle" className="text-tertiary text-[24px]" />
                  </div>
                  <h3 className="font-display font-semibold text-sm mb-2">WhatsApp conectado</h3>
                  <p className="text-[13px] text-on-surface-variant mb-5">Tu número está listo para enviar y recibir mensajes.</p>
                  <button
                    onClick={() => handleNav('setup-team')}
                    className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 flex items-center gap-1.5 mx-auto"
                  >
                    Siguiente paso
                    <Icon name="arrow_forward" className="text-[15px]" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pasos */}
                  <div className="bg-surface-container rounded-2xl p-5 space-y-3">
                    {[
                      { num: 1, text: 'Inicia sesión con tu cuenta de Facebook' },
                      { num: 2, text: 'Selecciona o crea tu cuenta de WhatsApp Business' },
                      { num: 3, text: 'Registra y verifica tu número de teléfono' },
                    ].map((s) => (
                      <div key={s.num} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[11px] font-display font-bold text-primary">{s.num}</span>
                        </div>
                        <p className="text-[13px] text-on-surface-variant">{s.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Info */}
                  <div className="bg-surface-container rounded-2xl p-4 flex items-start gap-3">
                    <Icon name="info" className="text-on-surface-variant text-[16px] mt-0.5 shrink-0 leading-none" />
                    <p className="text-[12px] text-on-surface-variant leading-relaxed">
                      Puedes usar un número nuevo o tu número de WhatsApp Business actual. Los números personales de WhatsApp Messenger deben desvincularse primero.
                    </p>
                  </div>

                  {/* Botón */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={conectarWhatsApp}
                      disabled={waLoading}
                      className="bg-[#25D366] text-white px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:bg-[#20bd5a] disabled:opacity-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      {waLoading ? 'Conectando...' : 'Conectar WhatsApp'}
                    </button>
                    <button
                      onClick={() => handleNav('setup-team')}
                      className="text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      Omitir por ahora
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : ['setup-payments', 'setup-invoicing', 'setup-subscription'].includes(activeSection) ? (
            <div className="max-w-xl">
              <div className="mb-6">
                <h1 className="font-display text-xl font-bold mb-1">{current.title}</h1>
                <p className="text-[13px] text-on-surface-variant">{current.description}</p>
              </div>
              <div className="bg-surface-container rounded-2xl p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple/8 mb-4">
                  <Icon name={{
                    'setup-whatsapp': 'chat',
                    'setup-team': 'group_add',
                    'setup-payments': 'credit_card',
                    'setup-invoicing': 'description',
                    'setup-subscription': 'account_balance_wallet',
                  }[activeSection]} className="text-purple text-[22px]" />
                </div>
                <p className="text-[13px] text-on-surface-variant mb-6">
                  Esta sección estará disponible pronto. Puedes continuar con el siguiente paso.
                </p>
                <div className="flex items-center justify-center gap-3">
                  {{
                    'setup-whatsapp': 'setup-team',
                    'setup-team': 'setup-payments',
                    'setup-payments': 'setup-invoicing',
                    'setup-invoicing': 'setup-subscription',
                    'setup-subscription': null,
                  }[activeSection] ? (
                    <button
                      onClick={() => handleNav({
                        'setup-whatsapp': 'setup-team',
                        'setup-team': 'setup-payments',
                        'setup-payments': 'setup-invoicing',
                        'setup-invoicing': 'setup-subscription',
                      }[activeSection])}
                      className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 flex items-center gap-1.5"
                    >
                      Siguiente paso
                      <Icon name="arrow_forward" className="text-[15px]" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleNav('dashboard')}
                      className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 flex items-center gap-1.5"
                    >
                      Ir al Dashboard
                    </button>
                  )}
                  <button
                    onClick={() => handleNav('dashboard')}
                    className="text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    Omitir
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
                    ? `Bienvenida, ${nombreUsuario || ''}!`
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
                      Continuar
                      <Icon name="arrow_forward" className="text-[15px]" />
                    </button>
                    <button
                      onClick={() => handleNav('dashboard')}
                      className="text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      Omitir
                    </button>
                  </div>
                </>
              )}

              {/* Card de usuario + Soporte - solo en dashboard */}
              {activeSection === 'dashboard' && usuario && (
                <div className="flex gap-3 mb-4">
                  {/* Card usuario */}
                  <div className="flex-1 bg-surface-container rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center shrink-0">
                        <span className="text-purple font-display font-bold text-sm">
                          {usuario.nombre ? usuario.nombre.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : '?'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm">{usuario.nombre || 'Sin nombre'}</h3>
                        <p className="text-[12px] text-on-surface-variant">{usuario.rol === 'owner' ? 'Propietario' : usuario.rol === 'admin' ? 'Administrador' : 'Agente'}</p>
                      </div>
                    </div>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${!panelActivo && collapsed ? 'lg:grid-cols-4' : ''}`}>
                      <div className="flex items-center gap-2.5 bg-surface-container-lowest rounded-lg px-3 py-2.5">
                        <Icon name="mail" className="text-on-surface-variant text-[16px] leading-none" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">Correo</div>
                          <div className="text-[13px] font-display truncate">{usuario.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 bg-surface-container-lowest rounded-lg px-3 py-2.5">
                        <Icon name="account_balance_wallet" className="text-on-surface-variant text-[16px] leading-none" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">Saldo</div>
                          <div className="text-[13px] font-display">$0.00 MXN</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 bg-surface-container-lowest rounded-lg px-3 py-2.5">
                        <Icon name="workspace_premium" className="text-on-surface-variant text-[16px] leading-none" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">Plan</div>
                          <div className="text-[13px] font-display">{usuario.suscripcion?.plan || 'Sin plan'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 bg-surface-container-lowest rounded-lg px-3 py-2.5">
                        <Icon name="timer" className="text-on-surface-variant text-[16px] leading-none" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">Prueba gratis</div>
                          <div className="text-[13px] font-display">{usuario.suscripcion?.prueba_termina_en ? `${Math.max(0, Math.ceil((new Date(usuario.suscripcion.prueba_termina_en) - new Date()) / 86400000))} días restantes` : '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Card soporte */}
                  <div className="w-[200px] shrink-0 bg-surface-container rounded-2xl p-4 flex flex-col justify-center gap-3">
                    <div className="flex items-center gap-2.5">
                      <img src="/icons/whatsapp.svg" alt="" className="w-4 h-4" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">Soporte</div>
                        <a href="https://wa.me/5218281184756" target="_blank" rel="noopener noreferrer" className="text-[13px] font-display text-[#25D366] hover:underline">+52 828 118 4756</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Icon name="rate_review" className="text-tertiary text-[16px] leading-none" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">Feedback</div>
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
                  { icon: 'check_circle', label: 'Crear cuenta', done: true, nav: null },
                  { icon: 'storefront', label: 'Tu negocio', done: !!negocioConfigurado, nav: 'setup' },
                  { icon: 'chat', label: 'WhatsApp', done: waConectado, nav: 'setup-whatsapp' },
                  { icon: 'group_add', label: 'Tu equipo', done: equipoListo, nav: 'setup-team' },
                  { icon: 'credit_card', label: 'Cobros', done: false, nav: 'setup-payments' },
                  { icon: 'description', label: 'Facturación', done: false, nav: 'setup-invoicing' },
                  { icon: 'account_balance_wallet', label: 'Suscripción', done: false, nav: 'setup-subscription' },
                ]
                const completados = guiaSteps.filter(s => s.done).length
                const siguiente = guiaSteps.find(s => !s.done)
                const pct = Math.round((completados / guiaSteps.length) * 100)

                return (
                  <div className="bg-surface-container rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <Icon name="rocket_launch" className="text-tertiary text-[16px] leading-none" />
                        <h3 className="font-display font-bold text-sm">Guía de inicio</h3>
                      </div>
                      <span className="text-[13px] font-display text-on-surface-variant">{completados} de {guiaSteps.length}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-1 bg-surface-container-high rounded-full">
                        <div className="h-full bg-tertiary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      {siguiente && (
                        <button
                          onClick={() => handleNav(siguiente.nav)}
                          className="shrink-0 bg-primary text-on-primary px-4 py-2 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 flex items-center gap-1.5"
                        >
                          Siguiente paso
                          <Icon name="arrow_forward" className="text-[15px]" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
                      {guiaSteps.map((step, i) => (
                        <button
                          key={i}
                          onClick={() => step.nav && handleNav(step.nav)}
                          className={`flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-lg bg-surface-container-lowest transition-colors ${step.nav ? 'hover:bg-surface-container-high/60 cursor-pointer' : ''}`}
                        >
                          {step.done ? (
                            <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center">
                              <Icon name="check" className="text-on-tertiary text-[16px]" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-outline-variant/40 flex items-center justify-center">
                              <Icon name={step.icon} className="text-on-surface-variant text-[16px]" />
                            </div>
                          )}
                          <span className={`text-[11px] font-display text-center leading-tight ${step.done ? 'text-tertiary font-semibold' : 'text-on-surface-variant'}`}>
                            {step.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Empty state - solo en secciones que no son dashboard */}
              {activeSection !== 'dashboard' && activeSection !== 'setup-team' && (
                <div className="bg-surface-container rounded-2xl p-10 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple/8 mb-4">
                    <Icon name={menuGroups.flatMap(g => g.items ? g.items : [g]).find(m => m.id === activeSection)?.icon || 'info'} className="text-purple text-[22px]" />
                  </div>
                  <h3 className="font-display text-sm font-semibold mb-2">
                    {`${current.title} estará disponible pronto`}
                  </h3>
                  <p className="text-[13px] text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                    Esta sección se activará cuando configures tu negocio.
                  </p>
                  <button
                    onClick={() => handleNav('dashboard')}
                    className="mt-5 bg-primary text-on-primary px-5 py-2 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98]"
                  >
                    Ir al Dashboard
                  </button>
                </div>
              )}
            </>
          )}
          </div>

          {/* Panel lateral derecho */}
          {panelActivo && (
            <aside className="w-60 shrink-0 border-l border-outline-variant/15 bg-surface-container/50 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-2.5 h-11 flex items-center shrink-0">
                <h3 className="font-display font-bold text-[15px]">
                  {panelActivo === 'notificaciones' ? 'Notificaciones' : 'Configuración'}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-3">

                {/* Notificaciones */}
                {panelActivo === 'notificaciones' && (
                  notifLoading ? (
                    <div className="py-10 text-center text-[13px] text-on-surface-variant">Cargando...</div>
                  ) : notificaciones.length === 0 ? (
                    <div className="py-10 text-center">
                      <Icon name="notifications_none" className="text-outline-variant text-[28px] mb-1.5" />
                      <p className="text-[13px] text-on-surface-variant">No tienes notificaciones</p>
                    </div>
                  ) : (
                    <div className="space-y-px">
                      {notificaciones.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => !n.leida && marcarLeida(n.id)}
                          className={`w-full text-left px-2 py-1.5 transition-colors ${!n.leida ? 'bg-primary/5 hover:bg-primary/8 cursor-pointer' : 'bg-surface-container-lowest'}`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon name={n.icono || 'info'} className={`text-[15px] mt-0.5 shrink-0 leading-none ${!n.leida ? 'text-primary' : 'text-on-surface-variant'}`} />
                            <div className="min-w-0">
                              <p className={`text-[13px] font-display leading-tight ${!n.leida ? 'font-semibold' : 'font-medium text-on-surface-variant'}`}>{n.titulo}</p>
                              <p className="text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">{n.mensaje}</p>
                              <p className="text-[11px] text-outline mt-1">{new Date(n.creada).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}

                {/* Settings — menú de opciones agrupadas */}
                {panelActivo === 'settings' && (
                  <div className="space-y-2">
                    {/* Cuenta */}
                    <div>
                      <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1 px-2">Cuenta</p>
                      <div className="space-y-px">
                        <button onClick={() => setSettingsTab('editar-cuenta')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors">
                          <Icon name="edit" className="text-[16px] leading-none" />
                          Editar datos de la cuenta
                        </button>
                        <button onClick={() => setSettingsTab('cambiar-plan')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors">
                          <Icon name="workspace_premium" className="text-[16px] leading-none" />
                          Cambiar plan
                        </button>
                        <button onClick={() => setSettingsTab('metodo-pago')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors">
                          <Icon name="credit_card" className="text-[16px] leading-none" />
                          Modificar método de pago
                        </button>
                      </div>
                    </div>

                    {/* Gestión de usuarios */}
                    <div>
                      <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1 px-2">Gestión de usuarios</p>
                      <div className="space-y-px">
                        <button onClick={() => setSettingsTab('crear-usuarios')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors">
                          <Icon name="person_add" className="text-[16px] leading-none" />
                          Crear usuarios
                        </button>
                        <button onClick={() => setSettingsTab('permisos')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors">
                          <Icon name="admin_panel_settings" className="text-[16px] leading-none" />
                          Manejar permisos
                        </button>
                        <button onClick={() => setSettingsTab('analitica-usuarios')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors">
                          <Icon name="analytics" className="text-[16px] leading-none" />
                          Analítica de usuarios
                        </button>
                      </div>
                    </div>

                    {/* Seguridad */}
                    <div>
                      <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1 px-2">Seguridad</p>
                      <div className="space-y-px">
                        <button onClick={() => setSettingsTab('historial-login')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors">
                          <Icon name="history" className="text-[16px] leading-none" />
                          Mi historial de login
                        </button>
                        <button onClick={() => setSettingsTab('cambiar-password')} className="w-full flex items-center gap-2 px-2 py-1 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-colors">
                          <Icon name="lock" className="text-[16px] leading-none" />
                          Cambiar contraseña
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  )
}
