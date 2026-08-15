// Dashboard de Aliwa Eventos (/eventos/dashboard).
//
// Página aparte del panel de negocio a propósito: una cuenta de tipo 'evento'
// no debe ver NADA de negocios, y al revés. Comparte el lenguaje visual del
// dashboard (mismas clases, misma densidad, mismos tokens) pero no su
// maquinaria de guía de inicio, WhatsApp, cobros ni facturación, que aquí no
// aplican. Los textos viven en i18n-app/eventos.js.
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/shared/Icon'
import AliwaIcon from '../components/shared/AliwaIcon'
import useTheme from '../hooks/useTheme'
import { apiFetch } from '../utils/api'
import { useLang } from '../i18n-app'

// Solo ids/iconos: los labels salen de t.eventos.menu / t.eventos.menuGrupos
const menuGroups = [
  { id: 'dashboard', icon: 'widgets' },
  {
    labelKey: 'invitados', icon: 'group',
    items: [
      { id: 'guests', icon: 'group' },
      { id: 'confirmed', icon: 'how_to_reg' },
      { id: 'survey-results', icon: 'ballot' },
      { id: 'import-export', icon: 'swap_vert' },
      { id: 'gift-registry', icon: 'redeem' },
      { id: 'wishlist', icon: 'favorite' },
    ],
  },
  {
    labelKey: 'invitacion', icon: 'mail',
    items: [
      { id: 'invitation-builder', icon: 'mail' },
      { id: 'rsvp-form', icon: 'assignment' },
    ],
  },
]

export default function EventosDashboardPage() {
  const navigate = useNavigate()
  const { lang, t, toggleLang } = useLang()
  const te = t.eventos
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Misma preferencia persistida que el panel de negocio: el usuario no debería
  // reconfigurar el sidebar por cambiar de panel.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('aliwa-sidebar-collapsed') === '1')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [dark, toggleDark] = useTheme()
  const [usuario, setUsuario] = useState(null)
  const [notifNoLeidas, setNotifNoLeidas] = useState(0)

  const current = te.paginas[activeSection]

  useEffect(() => {
    // Doble guardia: sin sesión → login; con cuenta de negocio → su panel.
    // El backend ya manda a cada quien a su lado al entrar, esto cubre la URL
    // escrita a mano y la sesión que cambió de cuenta.
    apiFetch('/api/auth/me/').then(({ res, data }) => {
      if (!res.ok) { navigate('/login'); return }
      if (data.cuenta?.tipo !== 'evento') { navigate('/dashboard'); return }
      setUsuario(data)
    }).catch(() => navigate('/login'))

    apiFetch('/api/notificaciones/conteo/').then(({ res, data }) => {
      if (res.ok) setNotifNoLeidas(data.no_leidas || 0)
    }).catch(() => {})
  }, [navigate])

  useEffect(() => {
    localStorage.setItem('aliwa-sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  const handleNav = (id) => {
    setActiveSection(id)
    setSidebarOpen(false)
  }

  // Hasta que el usuario pase el guardia no se pinta nada: evita el parpadeo
  // del panel de eventos en una cuenta de negocio que va de salida.
  if (!usuario) return <div className="min-h-screen bg-background" />

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar group wrapper — la pestaña aparece al hacer hover */}
      <div className="group/sidebar">
        <aside className={`fixed inset-y-0 left-0 z-40 bg-surface-container border-r border-outline-variant flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-[64px]' : 'w-44'}`}>

          {/* Logo — misma altura (h-11) que el top bar */}
          <div className={`relative h-11 flex items-center shrink-0 ${collapsed ? 'justify-center px-0' : 'gap-2 px-4'}`}>
            <AliwaIcon size={collapsed ? 28 : 30} />
            {!collapsed && <span className="text-base font-logo font-bold text-on-surface">Aliwa</span>}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-outline-variant" />
          </div>

          {/* Nav */}
          <nav className={`flex-1 overflow-y-auto py-1 ${collapsed ? 'px-1.5' : 'px-3'}`}>
            {menuGroups.map((group) => {
              // Item suelto (Panel)
              if (group.id) {
                return (
                  <button
                    key={group.id}
                    onClick={() => handleNav(group.id)}
                    title={collapsed ? te.menu[group.id] : undefined}
                    className={`w-full flex items-center gap-2 py-1 text-[13px] font-display transition-colors mb-px ${
                      collapsed ? 'justify-center px-0' : 'px-2.5'
                    } ${
                      activeSection === group.id
                        ? 'bg-primary/3 text-selected font-bold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                    }`}
                  >
                    <Icon name={group.icon} fill={activeSection === group.id} className="text-[16px] leading-none" />
                    {!collapsed && te.menu[group.id]}
                  </button>
                )
              }

              return (
                <div key={group.labelKey} className="mt-2 mb-0.5">
                  {!collapsed && (
                    <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1 px-2.5">{te.menuGrupos[group.labelKey]}</p>
                  )}
                  <div className="space-y-px">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        title={collapsed ? te.menu[item.id] : undefined}
                        className={`w-full flex items-center gap-2 py-1 text-[13px] font-display transition-colors ${
                          collapsed ? 'justify-center px-0' : 'px-2.5'
                        } ${
                          activeSection === item.id
                            ? 'bg-primary/3 text-selected font-bold'
                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                        }`}
                      >
                        <Icon name={item.icon} fill={activeSection === item.id} className="text-[16px] leading-none" />
                        {!collapsed && te.menu[item.id]}
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
            <button
              onClick={toggleDark}
              title={collapsed ? (dark ? te.sidebar.modoOscuro : te.sidebar.modoClaro) : undefined}
              className={`w-full flex items-center text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors ${
                collapsed ? 'justify-center py-1 px-0' : 'px-2.5 py-1 gap-2'
              }`}
            >
              <Icon name={dark ? 'dark_mode' : 'light_mode'} className="text-[16px] leading-none" />
              {!collapsed && <span>{dark ? te.sidebar.modoOscuro : te.sidebar.modoClaro}</span>}
            </button>

            <button
              onClick={async () => {
                await apiFetch('/api/auth/logout/', { method: 'POST' })
                navigate('/login')
              }}
              title={collapsed ? te.sidebar.salir : undefined}
              className={`w-full flex items-center text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors ${
                collapsed ? 'justify-center py-1 px-0' : 'px-2.5 py-1 gap-2'
              }`}
            >
              <Icon name="logout" className="text-[16px] leading-none" />
              {!collapsed && <span>{te.sidebar.salir}</span>}
            </button>

            <div className={`h-px bg-outline-variant my-1.5 ${collapsed ? '-mx-1.5' : '-mx-3'}`} />

            {/* Evento activo — el equivalente al selector de negocio */}
            <div className={`flex items-center gap-2 py-1 ${collapsed ? 'justify-center px-0' : 'px-2.5'}`}>
              <div className="w-6 h-6 bg-primary/10 flex items-center justify-center shrink-0">
                <Icon name="celebration" className="text-[14px] text-primary leading-none" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-[13px] font-display font-semibold text-on-surface truncate">{te.sidebar.miEvento}</div>
                  <div className="text-[12px] text-on-surface-variant truncate">{te.sidebar.sinConfigurar}</div>
                </div>
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

      {/* Main */}
      <main className={`flex-1 flex flex-col h-screen transition-all duration-300 ${
        collapsed ? 'lg:ml-[64px]' : 'lg:ml-44'
      }`}>
        {/* Top bar */}
        <header className="relative flex items-center h-11 bg-surface-container-low px-4 md:px-6 gap-4 shrink-0">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-outline-variant" />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 text-on-surface-variant"
          >
            <Icon name="menu" />
          </button>

          <div className="flex-1 hidden lg:flex items-center gap-1.5 text-sm font-display text-on-surface-variant">
            {(() => {
              const group = menuGroups.find((g) => g.items?.some((i) => i.id === activeSection))
              if (group) {
                return <><span>{te.menuGrupos[group.labelKey]}</span><span className="text-outline-variant">/</span><span className="text-on-surface font-medium">{te.menu[activeSection]}</span></>
              }
              return <span className="text-on-surface font-medium">{current?.title || te.topbar.dashboard}</span>
            })()}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleLang}
              title={te.sidebar.idioma}
              className="p-1.5 transition-colors flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high/50"
            >
              <span className="w-[18px] h-[18px] inline-flex items-center justify-center text-[12px] font-display font-bold tracking-tight leading-none">
                {lang === 'es' ? 'EN' : 'ES'}
              </span>
            </button>
            <button
              className="p-1.5 transition-colors flex items-center justify-center relative text-on-surface-variant hover:bg-surface-container-high/50"
            >
              <Icon name="notifications" className="text-[18px] leading-none" />
              {notifNoLeidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-selected text-surface-container-lowest text-[10px] font-display font-bold rounded-full flex items-center justify-center">
                  {notifNoLeidas > 9 ? '9+' : notifNoLeidas}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Contenido */}
        <div className="flex-1 min-w-0 overflow-y-auto px-4 md:px-6 pt-4 pb-6">
          {activeSection === 'dashboard' ? (
            <>
              <h1 className="text-[18px] font-display font-bold text-on-surface">
                {te.bienvenida(usuario.nombre?.split(' ')[0] || '')}
              </h1>
              <p className="text-[13px] font-body text-on-surface-variant mt-1">{current.description}</p>
            </>
          ) : (
            <>
              <h1 className="text-[18px] font-display font-bold text-on-surface">{current?.title}</h1>
              <p className="text-[13px] font-body text-on-surface-variant mt-1">{current?.description}</p>

              {/* Las secciones se irán montando una por una; mientras, el
                  encabezado real ya orienta y esto marca que falta. */}
              <div className="mt-6 bg-surface-container px-5 py-6 max-w-lg">
                <div className="flex items-center gap-2">
                  <Icon name="schedule" className="text-[18px] text-primary leading-none" />
                  <span className="text-[13px] font-display font-semibold text-on-surface">{te.proximamente}</span>
                </div>
                <p className="text-[13px] font-body text-on-surface-variant mt-2">{te.proximamenteDesc}</p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
