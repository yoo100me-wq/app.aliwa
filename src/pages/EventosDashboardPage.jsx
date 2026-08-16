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
import SelectorModo from '../components/dashboard/SelectorModo'
import PanelNotificaciones from '../components/dashboard/PanelNotificaciones'
import AvatarEvento from '../components/dashboard/AvatarEvento'
import { GradientBlob } from '../components/shared/BackgroundEffects'
import EditorInvitacion from '../components/eventos/EditorInvitacion'
import InvitadosSection from '../components/eventos/InvitadosSection'
import FormularioFlow from '../components/eventos/FormularioFlow'

// Sidebar plano: solo las cinco secciones de primer nivel. Lo que antes eran
// subitems ahora vive como PESTAÑAS dentro de su contenedor — Confirmados y
// Encuestas son vistas de la misma lista de invitados, no destinos aparte.
// Solo ids/iconos: los labels salen de t.eventos.menu
const menuItems = [
  { id: 'dashboard', icon: 'widgets' },
  { id: 'invitation-builder', icon: 'mail' },
  // Confirmados e Importar/Exportar se quitaron: el estado ya es una columna
  // de la tabla y la importación un botón, no destinos aparte.
  { id: 'guests', icon: 'group', tabs: ['guests', 'rsvp-form', 'survey-results'] },
  { id: 'gift-registry', icon: 'redeem' },
  { id: 'wishlist', icon: 'favorite' },
]

// Evento seleccionado, persistido igual que NEGOCIO_STORAGE_KEY del otro panel.
const EVENTO_KEY = 'aliwa-evento'

export default function EventosDashboardPage() {
  const navigate = useNavigate()
  const { lang, t, toggleLang } = useLang()
  const te = t.eventos
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Misma preferencia persistida que el panel de negocio: el usuario no debería
  // reconfigurar el sidebar por cambiar de panel.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('aliwa-sidebar-collapsed') === '1')
  // activeSection = sección del sidebar; activeTab = pestaña dentro de ella.
  // Se guardan aparte para que al volver a una sección se abra en su pestaña
  // por defecto en vez de recordar una vista que ya no viene al caso.
  const [activeSection, setActiveSection] = useState('dashboard')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dark, toggleDark] = useTheme()
  const [usuario, setUsuario] = useState(null)
  const [notifNoLeidas, setNotifNoLeidas] = useState(0)
  const [notificaciones, setNotificaciones] = useState([])
  // Arranca en true si el panel viene abierto: su contenido se pide en el
  // mismo montaje, y fijarlo dentro del efecto sería un setState en su cuerpo.
  const [notifLoading, setNotifLoading] = useState(
    () => localStorage.getItem('aliwa-panel-notif') === '1'
  )
  // Misma preferencia persistida que el panel de negocio: si dejaste abierto el
  // panel de notificaciones, sigue abierto al cambiar de dashboard.
  const [panelActivo, setPanelActivo] = useState(() =>
    localStorage.getItem('aliwa-panel-notif') === '1' ? 'notificaciones' : null
  )
  const localeFecha = lang === 'en' ? 'en-US' : 'es-MX'
  const [eventos, setEventos] = useState([])
  const [eventoActivo, setEventoActivo] = useState(null)
  const [eventoMenuOpen, setEventoMenuOpen] = useState(false)
  // Forma de nuevo evento
  const [nvNombre, setNvNombre] = useState('')
  const [nvTipo, setNvTipo] = useState('')
  const [nvFecha, setNvFecha] = useState('')
  const [nvHora, setNvHora] = useState('')
  const [nvLugar, setNvLugar] = useState('')
  const [nvDireccion, setNvDireccion] = useState('')
  // Anfitriones: son varios, por eso es una lista y no un campo suelto
  const [nvAnfitriones, setNvAnfitriones] = useState([])
  const [nvAnfitrionInput, setNvAnfitrionInput] = useState('')
  const [nvImagen, setNvImagen] = useState('')
  const [nvRsvp, setNvRsvp] = useState('')
  // null = creando; un id = editando ese evento. Un solo formulario para las
  // dos cosas: los campos son los mismos y solo cambia el verbo.
  const [nvEditandoId, setNvEditandoId] = useState(null)
  // Id del evento cuya fila esta pidiendo confirmacion de borrado. Se confirma
  // EN LA FILA, sin dialogo del navegador.
  const [borrandoId, setBorrandoId] = useState(null)
  // Reloj de la cuenta regresiva. Vive en estado porque el contador tiene que
  // repintarse solo, no cuando algo mas cambie.
  const [ahora, setAhora] = useState(() => Date.now())
  const [tipoOpen, setTipoOpen] = useState(false)
  const [tipoBuscar, setTipoBuscar] = useState('')
  const [nvError, setNvError] = useState('')
  const [nvLoading, setNvLoading] = useState(false)

  const seccion = menuItems.find((m) => m.id === activeSection)
  const pestanas = seccion?.tabs || []
  const current = te.paginas[activeTab]
  // Se deriva del resumen en cada render; guardarlo en estado abriria la puerta
  // a que la barra y los numeros digan cosas distintas.
  const resumen = eventoActivo?.resumen
  // Dias completos entre hoy y una fecha. Se normaliza a medianoche para que
  // "faltan 3 dias" no cambie a 2 solo porque el evento es en la manana.
  const diasHasta = (iso) => {
    if (!iso) return null
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const d = new Date(iso); d.setHours(0, 0, 0, 0)
    return Math.round((d - hoy) / 86400000)
  }
  // Solo para el aviso en rojo del cierre de RSVP: "quedan <=3 dias" se piensa
  // en dias completos, no en segundos.
  const diasRsvp = diasHasta(eventoActivo?.rsvp_cierra_en)
  // Descomposicion exacta de lo que falta. `null` = sin fecha; negativo = ya
  // paso. A diferencia de diasHasta() esto NO redondea a medianoche: aqui se
  // quieren los segundos.
  const restante = (iso) => {
    if (!iso) return null
    const ms = new Date(iso).getTime() - ahora
    if (Number.isNaN(ms)) return null
    if (ms <= 0) return { paso: true }
    const s = Math.floor(ms / 1000)
    return {
      paso: false,
      dias: Math.floor(s / 86400),
      horas: Math.floor((s % 86400) / 3600),
      min: Math.floor((s % 3600) / 60),
      seg: s % 60,
    }
  }
  const p2 = (n) => String(n).padStart(2, '0')
  // Los dias solo aparecen si los hay: "04h 12m 30s" el mismo dia del evento.
  const formatoRestante = (r) =>
    (r.dias > 0 ? `${r.dias}d ` : '') + `${p2(r.horas)}h ${p2(r.min)}m ${p2(r.seg)}s`
  const faltaEvento = restante(eventoActivo?.fecha)
  const faltaRsvp = restante(eventoActivo?.rsvp_cierra_en)
  const fechaCorta = (iso) =>
    new Date(iso).toLocaleDateString(localeFecha, { day: 'numeric', month: 'long' })
  const pctConfirmados = resumen?.invitados
    ? Math.round((resumen.confirmados / resumen.invitados) * 100)
    : 0

  useEffect(() => {
    // Doble guardia: sin sesión → login; con cuenta de negocio → su panel.
    // El backend ya manda a cada quien a su lado al entrar, esto cubre la URL
    // escrita a mano y la sesión que cambió de cuenta.
    apiFetch('/api/auth/me/').then(({ res, data }) => {
      if (!res.ok) { navigate('/login'); return }
      // 'evento' y 'ambos' pueden estar aquí; 'negocio' puro no.
      if (!['evento', 'ambos'].includes(data.cuenta?.tipo)) { navigate('/dashboard'); return }
      setUsuario(data)
    }).catch(() => navigate('/login'))

    apiFetch('/api/notificaciones/conteo/').then(({ res, data }) => {
      if (res.ok) setNotifNoLeidas(data.no_leidas || 0)
    }).catch(() => {})

    // El panel abierto es una preferencia persistida: si se restaura abierto,
    // hay que traer su contenido aqui. Si no, se pinta vacio hasta que el
    // usuario lo cierra y lo abre otra vez.
    if (localStorage.getItem('aliwa-panel-notif') === '1') {
      apiFetch('/api/notificaciones/').then(({ res, data }) => {
        if (res.ok) setNotificaciones(data.results || data || [])
      }).catch(() => setNotificaciones([])).finally(() => setNotifLoading(false))
    }

    apiFetch('/api/eventos/').then(({ res, data }) => {
      if (!res.ok) return
      const lista = data.results || data || []
      setEventos(lista)
      // Preferir el evento persistido si sigue existiendo; si no, el primero.
      const guardado = localStorage.getItem(EVENTO_KEY)
      setEventoActivo(lista.find((e) => e.id === guardado) || lista[0] || null)
    }).catch(() => {})
  }, [navigate])

  useEffect(() => {
    // Sin fecha que contar no se enciende el intervalo: un timer de 1s corriendo
    // en una pestana de fondo sin nada que mostrar es puro desperdicio.
    if (activeSection !== 'dashboard') return
    if (!eventoActivo?.fecha && !eventoActivo?.rsvp_cierra_en) return
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [activeSection, eventoActivo?.fecha, eventoActivo?.rsvp_cierra_en])

  useEffect(() => {
    localStorage.setItem('aliwa-sidebar-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    localStorage.setItem('aliwa-panel-notif', panelActivo === 'notificaciones' ? '1' : '0')
  }, [panelActivo])

  const cargarNotificaciones = () => {
    setNotifLoading(true)
    apiFetch('/api/notificaciones/').then(({ res, data }) => {
      if (res.ok) setNotificaciones(data.results || data || [])
    }).catch(() => setNotificaciones([])).finally(() => setNotifLoading(false))
  }

  const abrirNotificaciones = () => {
    if (panelActivo === 'notificaciones') { setPanelActivo(null); return }
    setPanelActivo('notificaciones')
    cargarNotificaciones()
  }

  const marcarLeida = async (id) => {
    await apiFetch(`/api/notificaciones/${id}/leer/`, { method: 'POST' })
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)))
    setNotifNoLeidas((prev) => Math.max(0, prev - 1))
  }

  // La imagen viaja como data URL, igual que el avatar del usuario: el backend
  // acepta `data:image/` o `https://` y corta arriba de ~150KB, asi que se
  // valida aqui para no mandar un POST condenado a fallar.
  const elegirImagen = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 150 * 1024) { setNvError(te.nuevo.errImagenGrande); return }
    const reader = new FileReader()
    reader.onload = () => { setNvImagen(String(reader.result)); setNvError('') }
    reader.readAsDataURL(file)
  }

  const agregarAnfitrion = () => {
    const nombre = nvAnfitrionInput.trim()
    // Sin duplicados: dos chips con el mismo nombre no aportan nada
    if (!nombre || nvAnfitriones.includes(nombre)) { setNvAnfitrionInput(''); return }
    setNvAnfitriones([...nvAnfitriones, nombre])
    setNvAnfitrionInput('')
  }

  const limpiarForm = () => {
    setNvNombre(''); setNvTipo(''); setNvFecha(''); setNvHora('')
    setNvLugar(''); setNvDireccion(''); setNvRsvp('')
    setNvAnfitriones([]); setNvAnfitrionInput(''); setNvImagen('')
    setNvError(''); setNvEditandoId(null)
  }

  // Parte un ISO en los dos inputs date+time que usa la forma.
  const partirFecha = (iso) => {
    if (!iso) return ['', '']
    const d = new Date(iso)
    const p = (n) => String(n).padStart(2, '0')
    return [`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
            `${p(d.getHours())}:${p(d.getMinutes())}`]
  }

  const abrirEditar = (ev) => {
    if (!ev) return
    const [fecha, hora] = partirFecha(ev.fecha)
    const [rsvp] = partirFecha(ev.rsvp_cierra_en)
    setNvNombre(ev.nombre || ''); setNvTipo(ev.tipo || '')
    setNvFecha(fecha); setNvHora(hora); setNvRsvp(rsvp)
    setNvLugar(ev.lugar_nombre || ''); setNvDireccion(ev.lugar_direccion || '')
    setNvImagen(ev.imagen_url || '')
    // El backend guarda [{nombre}]; la forma trabaja con strings.
    setNvAnfitriones((ev.anfitriones || []).map((a) => a?.nombre || a).filter(Boolean))
    setNvAnfitrionInput(''); setNvError(''); setNvEditandoId(ev.id)
    handleNav('nuevo-evento')
  }

  const eliminarEvento = async (ev) => {
    const { res } = await apiFetch(`/api/eventos/${ev.id}/`, { method: 'DELETE' })
    if (!res.ok) { setBorrandoId(null); return }
    const quedan = eventos.filter((e) => e.id !== ev.id)
    setEventos(quedan)
    setBorrandoId(null)
    // Si se borro el que estaba activo hay que reelegir, si no el panel se
    // queda apuntando a un evento que ya no existe.
    if (eventoActivo?.id === ev.id) {
      const siguiente = quedan[0] || null
      setEventoActivo(siguiente)
      try {
        if (siguiente) localStorage.setItem(EVENTO_KEY, siguiente.id)
        else localStorage.removeItem(EVENTO_KEY)
      } catch { /* sin storage */ }
    }
    if (!quedan.length) setEventoMenuOpen(false)
  }

  const crearEvento = async (e) => {
    e.preventDefault()
    setNvError('')
    setNvLoading(true)
    try {
      const editando = Boolean(nvEditandoId)
      const { res, data } = await apiFetch(
        editando ? `/api/eventos/${nvEditandoId}/` : '/api/eventos/', {
        method: editando ? 'PATCH' : 'POST',
        body: JSON.stringify({
          nombre: nvNombre,
          imagen_url: nvImagen,
          tipo: nvTipo,
          // La hora sin fecha no significa nada; si no hay hora, medianoche.
          fecha: nvFecha ? `${nvFecha}T${nvHora || '00:00'}` : null,
          // El cierre de RSVP es un dia, no un instante: se fija al final del dia
          // para que "cierra el 12" incluya el 12 completo.
          rsvp_cierra_en: nvRsvp ? `${nvRsvp}T23:59` : null,
          lugar_nombre: nvLugar,
          lugar_direccion: nvDireccion,
          // Incluye lo que quedó escrito sin dar Enter: si el usuario
          // teclea un nombre y da Crear, no se le pierde.
          anfitriones: [...nvAnfitriones, nvAnfitrionInput.trim()]
            .filter(Boolean)
            .map((nombre) => ({ nombre })),
        }),
      })
      if (!res.ok) {
        // Se deja la traza en consola: cuando el backend truena con 500 el
        // cuerpo no trae `error` y el mensaje al usuario queda genérico.
        console.error('[eventos] fallo al guardar', res.status, data)
        setNvError(data?.error || `${editando ? te.nuevo.errEditar : te.nuevo.errCrear} (HTTP ${res.status})`)
        return
      }
      setEventos((prev) => editando
        ? prev.map((ev) => (ev.id === data.id ? data : ev))
        : [data, ...prev])
      setEventoActivo(data)
      try { localStorage.setItem(EVENTO_KEY, data.id) } catch { /* sin storage */ }
      limpiarForm()
      handleNav('dashboard')
    } catch {
      setNvError(te.nuevo.errConexion)
    } finally {
      setNvLoading(false)
    }
  }

  const handleNav = (id) => {
    setActiveSection(id)
    setActiveTab(id)   // cada sección abre en su primera pestaña
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
        } ${collapsed ? 'w-[64px]' : 'w-48'}`}>

          {/* Logo — misma altura (h-11) que el top bar */}
          <div className={`relative h-11 flex items-center shrink-0 ${collapsed ? 'justify-center px-0' : 'gap-2 px-4'}`}>
            <AliwaIcon size={collapsed ? 28 : 30} />
            {!collapsed && <span className="text-base font-logo font-bold text-on-surface">Aliwa</span>}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-outline-variant" />
          </div>

          {/* Nav */}
          <nav className={`flex-1 overflow-y-auto py-1 ${collapsed ? 'px-1.5' : 'px-3'}`}>
            {menuItems.map((item) => {
              const activo = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  title={collapsed ? te.menu[item.id] : undefined}
                  className={`w-full flex items-center gap-2 py-1 text-[13px] font-display whitespace-nowrap transition-colors mb-px ${
                    collapsed ? 'justify-center px-0' : 'px-2.5'
                  } ${
                    activo
                      ? 'bg-primary/3 text-selected font-bold'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                  }`}
                >
                  <Icon name={item.icon} fill={activo} className="text-[16px] leading-none" />
                  {!collapsed && te.menu[item.id]}
                </button>
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
              onClick={() => handleNav('settings')}
              title={collapsed ? te.sidebar.configuracion : undefined}
              className={`w-full flex items-center text-[13px] font-display transition-colors ${
                activeSection === 'settings'
                  ? 'bg-primary/3 text-selected font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
              } ${collapsed ? 'justify-center py-1 px-0' : 'px-2.5 py-1 gap-2'}`}
            >
              <Icon name="settings" fill={activeSection === 'settings'} className="text-[16px] leading-none" />
              {!collapsed && <span>{te.sidebar.configuracion}</span>}
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

            {/* Evento activo — MISMO patrón que el selector de negocio:
                popover fixed anclado al costado del sidebar, con backdrop. */}
            <div className="relative">
              {eventos.length === 0 ? (
                <button
                  onClick={() => handleNav('nuevo-evento')}
                  className={`w-full block transition-colors border border-dashed border-outline-variant hover:border-tertiary/40 hover:bg-tertiary/5 ${collapsed ? 'p-1.5 flex justify-center' : 'px-2.5 py-2'}`}
                >
                  {collapsed ? (
                    <div className="w-8 h-8 bg-tertiary/10 flex items-center justify-center">
                      <Icon name="celebration" className="text-tertiary text-[16px] leading-none" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-tertiary/10 flex items-center justify-center shrink-0">
                        <Icon name="celebration" className="text-tertiary text-[16px] leading-none" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-[12px] font-display font-semibold text-on-surface truncate">{te.sidebar.configurarEvento}</div>
                        <div className="text-[11px] text-on-surface-variant truncate">{te.sidebar.aunNoTienes}</div>
                      </div>
                    </div>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => { if (collapsed) setCollapsed(false); setEventoMenuOpen(true) }}
                  className={`w-full transition-colors hover:bg-surface-container-high/50 ${collapsed ? 'p-1.5 flex justify-center' : 'px-2.5 py-2'}`}
                >
                  {collapsed ? (
                    <AvatarEvento evento={eventoActivo} size={32} />
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <AvatarEvento evento={eventoActivo} size={32} />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-[13px] font-display font-semibold truncate">{eventoActivo?.nombre || te.sidebar.miEvento}</div>
                        <div className="text-[12px] text-on-surface-variant truncate">
                          {eventoActivo ? (te.tipos[eventoActivo.tipo] || eventoActivo.tipo) : te.sidebar.sinConfigurar}
                        </div>
                      </div>
                      <Icon name="expand_more" className="text-on-surface-variant text-[16px] shrink-0" />
                    </div>
                  )}
                </button>
              )}

              {/* Popover discreto de eventos — anclado sobre el botón */}
              {eventoMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setEventoMenuOpen(false); setBorrandoId(null) }} />
                  <div className={`fixed bottom-3 z-50 w-72 bg-surface-container-high border border-outline-variant rounded-xl overflow-hidden shadow-xl ${collapsed ? 'left-[70px]' : 'left-[198px]'}`}>
                    <div className="p-1.5 space-y-0.5 max-h-[50vh] overflow-y-auto">
                      {eventos.map((ev) => {
                        const activo = eventoActivo?.id === ev.id
                        const confirmando = borrandoId === ev.id
                        return (
                          // Fila = contenedor, NO boton: adentro van otros
                          // botones y no se pueden anidar.
                          <div
                            key={ev.id}
                            className={`flex items-center gap-1 rounded-lg pl-2 pr-1 py-1.5 transition-colors ${activo ? 'bg-primary/5' : 'hover:bg-surface-container-highest/50'}`}
                          >
                            <button
                              onClick={() => {
                                setEventoActivo(ev)
                                try { localStorage.setItem(EVENTO_KEY, ev.id) } catch { /* sin storage */ }
                                setEventoMenuOpen(false)
                              }}
                              className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
                            >
                              <AvatarEvento evento={ev} size={28} />
                              <div className="flex-1 min-w-0">
                                <div className={`text-[13px] font-display font-semibold truncate ${activo ? 'text-primary' : ''}`}>{ev.nombre}</div>
                                <div className={`text-[12px] truncate ${confirmando ? 'text-error font-display font-semibold' : 'text-on-surface-variant'}`}>
                                  {confirmando
                                    ? te.selector.confirmarBorrar
                                    : (te.tipos[ev.tipo] || ev.tipo) + (ev.resumen ? ` · ${ev.resumen.confirmados}/${ev.resumen.invitados}` : '')}
                                </div>
                              </div>
                            </button>

                            {confirmando ? (
                              // La confirmacion vive EN la fila: sin dialogos del
                              // navegador, y se ve sobre cual evento aplica.
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => eliminarEvento(ev)} title={te.selector.si}
                                  className="p-1 text-error hover:bg-error/10 rounded transition-colors">
                                  <Icon name="check" className="text-[16px] leading-none" />
                                </button>
                                <button onClick={() => setBorrandoId(null)} title={te.selector.no}
                                  className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded transition-colors">
                                  <Icon name="close" className="text-[16px] leading-none" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => { setEventoMenuOpen(false); abrirEditar(ev) }} title={te.panelInicio.editarEvento}
                                  className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-colors">
                                  <Icon name="edit" className="text-[15px] leading-none" />
                                </button>
                                <button onClick={() => setBorrandoId(ev.id)} title={te.selector.eliminar}
                                  className="p-1 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-colors">
                                  <Icon name="delete" className="text-[15px] leading-none" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <button
                        onClick={() => { setEventoMenuOpen(false); handleNav('nuevo-evento') }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-outline-variant px-2 py-1.5 text-[12px] font-display font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50 transition-colors mt-0.5"
                      >
                        <Icon name="add" className="text-[15px] leading-none" />
                        {te.sidebar.agregarEvento}
                      </button>
                    </div>
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
            ${collapsed ? 'left-[64px]' : 'left-[192px]'}`}
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
        collapsed ? 'lg:ml-[64px]' : 'lg:ml-48'
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
            {/* El área SIEMPRE va primero, en cualquier tipo de cuenta: mirando
                solo "Panel" no se sabe si estás en negocio o en eventos. */}
            <span>{te.area}</span>
            <span className="text-outline-variant">/</span>
            <span className={activeTab === activeSection ? 'text-on-surface font-medium' : ''}>
              {te.menu[activeSection]}
            </span>
            {activeTab !== activeSection && (
              <>
                <span className="text-outline-variant">/</span>
                <span className="text-on-surface font-medium">{te.menu[activeTab]}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Selector de panel — solo si la cuenta trae los dos lados */}
            {usuario?.cuenta?.tipo === 'ambos' && (
              <div className="mr-2">
                <SelectorModo modo="eventos" labels={te.selectorModo} />
              </div>
            )}
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

        {/* Contenido + panel lateral */}
        <div className="flex-1 flex min-h-0">
        {/* Fondo gris del área de contenido: hace que los campos casi blancos
            del formulario resalten en vez de fundirse con la página. */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-surface-container px-4 md:px-6 pt-3 pb-4">
          {activeSection === 'nuevo-evento' ? (
            /* Contenedor centrado sobre el fondo gris, con los blobs POR FUERA
               de la tarjeta — mismo recurso que la landing (GradientBlob, dos
               por sección como máximo). */
            <div className="min-h-[calc(100%-1.75rem)] flex items-center justify-center">
            <div className="relative w-full max-w-2xl">
              {/* Verde arriba, morado abajo. Las opacidades NO son iguales ni
                  entre colores ni entre temas:
                    · el lima (#D1FF94) es claro — sobre gris necesita mucha,
                      pero sobre el casi-negro del modo oscuro deslumbra, así
                      que baja fuerte;
                    · el morado (#6C36FF) es saturado — con poca basta en claro,
                      y en oscuro sube un poco para no desaparecer.
                  GradientBlob usa estilos inline, por eso el tema se resuelve
                  aquí con el flag y no con variantes dark: de Tailwind. */}
              <GradientBlob color="green" size={460} top={-140} left={-200} opacity={dark ? 0.26 : 0.55} />
              <GradientBlob color="accent" size={420} bottom={-120} right={-180} opacity={dark ? 0.50 : 0.20} />

              <div className="relative bg-surface-container-lowest border border-outline-variant/50 rounded-xl shadow-lg shadow-primary/5 px-6 py-5 md:px-8 md:py-6">
              <div className="mb-5">
                <h1 className="font-display text-[18px] font-bold mb-1.5">{nvEditandoId ? te.nuevo.tituloEditar : te.nuevo.titulo}</h1>
                <p className="text-[13px] leading-relaxed text-on-surface-variant">{nvEditandoId ? te.nuevo.subtituloEditar : te.nuevo.subtitulo}</p>
              </div>

              {nvError && (
                <div className="mb-3 p-2.5 bg-error/10 text-error text-[13px] font-display">{nvError}</div>
              )}

              <form onSubmit={crearEvento} className="space-y-3.5">
                <div className="flex items-end gap-3">
                  {/* Imagen del evento: opcional. Sin ella, la UI cae al ícono
                      de fiesta (ver AvatarEvento). */}
                  <div className="shrink-0">
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1 tracking-wide uppercase">{te.nuevo.imagenLabel}</label>
                    <label className="w-[58px] h-[38px] border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 flex items-center justify-center cursor-pointer transition-colors overflow-hidden relative">
                      {nvImagen ? (
                        <img src={nvImagen} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="add_photo_alternate" className="text-on-surface-variant text-[18px] leading-none" />
                      )}
                      <input type="file" accept="image/*" onChange={elegirImagen} className="hidden" />
                    </label>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1 tracking-wide uppercase">{te.nuevo.nombreLabel}</label>
                    <input type="text" value={nvNombre} onChange={(e) => setNvNombre(e.target.value)} placeholder={te.nuevo.nombrePlaceholder} autoFocus
                      className="w-full bg-surface-container-lowest border border-primary/25 hover:border-primary/50 px-4 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                </div>

                {/* Tipo, fecha y hora en un renglón: son los datos duros del
                    evento y caben juntos sin apretarse. */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1 tracking-wide uppercase">{te.nuevo.tipoLabel}</label>
                    <button
                      type="button"
                      onClick={() => { setTipoOpen(!tipoOpen); setTipoBuscar('') }}
                      className="w-full flex items-center justify-between bg-surface-container-lowest border border-primary/25 hover:border-primary/50 px-4 py-2 text-[13px] font-display text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    >
                      <span className={nvTipo ? 'text-on-surface' : 'text-outline-variant'}>{nvTipo ? te.tipos[nvTipo] : te.nuevo.seleccionaTipo}</span>
                      <Icon name={tipoOpen ? 'expand_less' : 'expand_more'} className="text-on-surface-variant text-[18px]" />
                    </button>
                    {tipoOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setTipoOpen(false)} />
                        <div className="absolute z-40 left-0 right-0 mt-1 bg-surface-container-high overflow-hidden">
                          <div className="px-3 py-2 border-b border-outline-variant">
                            <div className="flex items-center gap-2 bg-surface-container-high/40 px-3 py-1.5">
                              <Icon name="search" className="text-on-surface-variant text-[16px] leading-none" />
                              <input type="text" value={tipoBuscar} onChange={(e) => setTipoBuscar(e.target.value)} placeholder={te.nuevo.buscarTipo} autoFocus
                                className="flex-1 bg-transparent text-[13px] font-display text-on-surface placeholder:text-outline-variant outline-none" />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto py-1">
                            {Object.entries(te.tipos)
                              .filter(([, etiqueta]) => etiqueta.toLowerCase().includes(tipoBuscar.toLowerCase()))
                              .map(([slug, etiqueta]) => (
                                <button
                                  key={slug}
                                  type="button"
                                  onClick={() => { setNvTipo(slug); setTipoOpen(false) }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-display transition-colors ${
                                    nvTipo === slug
                                      ? 'bg-primary/3 text-selected font-bold'
                                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                                  }`}
                                >
                                  {nvTipo === slug && <Icon name="check" className="text-[15px] leading-none" />}
                                  <span className={nvTipo === slug ? '' : 'pl-[23px]'}>{etiqueta}</span>
                                </button>
                              ))}
                            {Object.values(te.tipos).filter((x) => x.toLowerCase().includes(tipoBuscar.toLowerCase())).length === 0 && (
                              <p className="px-3 py-3 text-[13px] text-on-surface-variant text-center">{te.nuevo.sinResultados}</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1 tracking-wide uppercase">{te.nuevo.fechaLabel}</label>
                    <input type="date" value={nvFecha} onChange={(e) => setNvFecha(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-primary/25 px-4 py-2 text-[13px] font-body text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1 tracking-wide uppercase">{te.nuevo.horaLabel}</label>
                    <input type="time" value={nvHora} onChange={(e) => setNvHora(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-primary/25 px-4 py-2 text-[13px] font-body text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                </div>

                {/* Anfitriones: se escriben de uno en uno a la izquierda y se
                    acumulan en la caja de al lado. Con Enter también, para no
                    obligar al mouse. */}
                <div>
                  <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1 tracking-wide uppercase">{te.nuevo.anfitrionesLabel}</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex gap-2 sm:flex-1 sm:min-w-0">
                      <input
                        type="text"
                        value={nvAnfitrionInput}
                        onChange={(e) => setNvAnfitrionInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarAnfitrion() } }}
                        placeholder={te.nuevo.anfitrionPlaceholder}
                        className="flex-1 min-w-0 h-[38px] bg-surface-container-lowest border border-primary/25 hover:border-primary/50 px-4 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={agregarAnfitrion}
                        disabled={!nvAnfitrionInput.trim()}
                        title={te.nuevo.agregarAnfitrion}
                        className="shrink-0 h-[38px] bg-surface-container-lowest border border-primary/25 hover:border-primary/50 px-3 text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
                      >
                        <Icon name="add" className="text-[18px] leading-none" />
                      </button>
                    </div>
                    {/* Caja al costado, de altura FIJA y punteada igual que el
                        selector de imagen: es una zona que se llena, no un campo
                        donde se escribe. Así el formulario no se mueve. */}
                    <div className="sm:flex-1 sm:min-w-0 h-[38px] overflow-y-auto border border-dashed border-primary/40 px-2 py-1">
                      {nvAnfitriones.length === 0 ? (
                        <p className="text-[12px] text-outline-variant leading-[28px]">{te.nuevo.anfitrionesVacio}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {nvAnfitriones.map((a, i) => (
                            <span key={i} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 bg-primary/5 text-selected text-[12px] font-display font-semibold">
                              {a}
                              <button type="button" onClick={() => setNvAnfitriones(nvAnfitriones.filter((_, k) => k !== i))}
                                className="p-0.5 text-on-surface-variant hover:text-error transition-colors">
                                <Icon name="close" className="text-[14px] leading-none" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1 tracking-wide uppercase">{te.nuevo.lugarLabel}</label>
                    <input type="text" value={nvLugar} onChange={(e) => setNvLugar(e.target.value)} placeholder={te.nuevo.lugarPlaceholder}
                      className="w-full bg-surface-container-lowest border border-primary/25 hover:border-primary/50 px-4 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1 tracking-wide uppercase">{te.nuevo.direccionLabel}</label>
                    <input type="text" value={nvDireccion} onChange={(e) => setNvDireccion(e.target.value)} placeholder={te.nuevo.direccionPlaceholder}
                      className="w-full bg-surface-container-lowest border border-primary/25 hover:border-primary/50 px-4 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <div>
                    {/* Cierre de confirmaciones: alimenta la cuenta regresiva del
                        panel. Sin el, la tarjeta dice "Sin fecha limite". */}
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1 tracking-wide uppercase">{te.nuevo.rsvpLabel}</label>
                    <input type="date" value={nvRsvp} onChange={(e) => setNvRsvp(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-primary/25 hover:border-primary/50 px-4 py-2 text-[13px] font-body text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                </div>

                {/* Acciones al pie, separadas por línea y alineadas a la derecha */}
                <div className="flex items-center justify-end gap-3 pt-2.5 border-t border-outline-variant/30">
                  <button type="button" onClick={() => { limpiarForm(); handleNav('dashboard') }}
                    className="px-4 py-2 text-[13px] font-display text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors">
                    {te.nuevo.cancelar}
                  </button>
                  <button type="submit" disabled={nvLoading || !nvNombre || !nvTipo}
                    className="border border-primary text-primary px-5 py-2 font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:bg-primary/5 disabled:opacity-50 flex items-center gap-1.5">
                    {nvLoading ? (nvEditandoId ? te.nuevo.guardando : te.nuevo.creando)
                      : (nvEditandoId ? te.nuevo.guardar : te.nuevo.crear)}
                    {!nvLoading && <Icon name="arrow_forward" className="text-[15px]" />}
                  </button>
                </div>
              </form>
              </div>
            </div>
            </div>
          ) : activeSection === 'dashboard' ? (
            // Sin tope de ancho, igual que el panel de negocio: con max-w el
            // contenido ya cabía en 896px y abrir el panel de notificaciones no
            // cambiaba nada — se veía como que el panel no ajusta el layout.
            <div>
              <h1 className="font-display text-xl font-bold mb-5">
                {te.bienvenida(usuario.nombre?.split(' ')[0] || '')}
              </h1>

              {/* Fila de arriba: cada contenedor con su propio subtítulo */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="flex-1 min-w-0 flex flex-col">
                  <h2 className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-2">{te.panelInicio.tituloCuentaRegresiva}</h2>
                  <div className="@container flex-1 border border-outline-variant bg-surface-container rounded-2xl p-4 flex flex-col justify-center">
                    {!eventoActivo ? (
                      <div className="text-center py-2">
                        <Icon name="celebration" className="text-[32px] text-primary/40 leading-none" />
                        <p className="text-[13px] font-display font-semibold text-on-surface mt-2">{te.panelInicio.sinEventoTitulo}</p>
                        <p className="text-[13px] text-on-surface-variant mt-1">{te.panelInicio.sinEventoDesc}</p>
                        <button onClick={() => handleNav('nuevo-evento')}
                          className="mt-4 border border-primary text-primary px-5 py-2.5 font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:bg-primary/5 inline-flex items-center gap-1.5">
                          {te.panelInicio.crearPrimero}
                          <Icon name="arrow_forward" className="text-[15px]" />
                        </button>
                      </div>
                    ) : (
                      // Una fila mientras la TARJETA tenga ancho (container query,
                      // no breakpoint de viewport): son la misma idea y se leen juntas.
                      <div className="grid grid-cols-1 @min-[300px]:grid-cols-2 gap-2">
                        {/* Falta para el evento */}
                        <div className="flex items-center gap-2.5 bg-surface-container-high/40 rounded-lg px-3 py-2.5">
                          <Icon name="event" className="text-purple text-[16px] leading-none" />
                          <div className="min-w-0">
                            <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">{te.panelInicio.faltan}</div>
                            {!faltaEvento ? (
                              <div className="text-[13px] font-display text-on-surface-variant">{te.panelInicio.sinFecha}</div>
                            ) : (
                              <>
                                <div className="text-[13px] font-display font-bold tabular-nums truncate">
                                  {faltaEvento.paso ? te.panelInicio.yaPaso : formatoRestante(faltaEvento)}
                                </div>
                                <div className="text-[11px] text-on-surface-variant truncate">{fechaCorta(eventoActivo.fecha)}</div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Cierre de confirmaciones: es el dato accionable */}
                        <div className="flex items-center gap-2.5 bg-surface-container-high/40 rounded-lg px-3 py-2.5">
                          <Icon name="how_to_reg" className={`text-[16px] leading-none ${diasRsvp !== null && diasRsvp <= 3 && diasRsvp >= 0 ? 'text-error' : 'text-on-surface-variant'}`} />
                          <div className="min-w-0">
                            <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">{te.panelInicio.cierreRsvp}</div>
                            {!faltaRsvp ? (
                              <div className="text-[13px] font-display text-on-surface-variant">{te.panelInicio.sinLimite}</div>
                            ) : (
                              <>
                                <div className={`text-[13px] font-display font-bold tabular-nums truncate ${diasRsvp !== null && diasRsvp <= 3 && diasRsvp >= 0 ? 'text-error' : ''}`}>
                                  {faltaRsvp.paso ? te.panelInicio.cerrado : formatoRestante(faltaRsvp)}
                                </div>
                                <div className="text-[11px] text-on-surface-variant truncate">{fechaCorta(eventoActivo.rsvp_cierra_en)}</div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full sm:w-[200px] sm:shrink-0 flex flex-col">
                  <h2 className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-2">{te.panelInicio.tituloSoporte}</h2>
                  <div className="flex-1 border border-outline-variant bg-surface-container rounded-2xl p-4 flex flex-col justify-center gap-3">
                    <div className="flex items-center gap-2.5">
                      <img src="/icons/whatsapp.svg" alt="" className="w-4 h-4" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">{te.card.soporte}</div>
                        <a href="https://wa.me/5218281184756" target="_blank" rel="noopener noreferrer" className="text-[13px] font-display text-primary hover:underline">+52 828 118 4756</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Icon name="rate_review" className="text-tertiary text-[16px] leading-none" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">{te.card.feedback}</div>
                        <a href="mailto:hola@aliwa.mx" className="text-[13px] font-display text-tertiary hover:underline">hola@aliwa.mx</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {eventoActivo && (
                <>
                  <h2 className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-2">{te.panelInicio.tituloResumen}</h2>
                  <div className="@container border border-outline-variant bg-surface-container rounded-2xl p-4 mb-5">
                    {/* Nombre y progreso en el mismo renglón: la barra es el
                        estado DE ese evento, no un dato suelto debajo. */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                      <div className="flex items-center gap-2 min-w-0 sm:w-60 sm:shrink-0">
                        <AvatarEvento evento={eventoActivo} size={40} />
                        <div className="min-w-0">
                          <h3 className="font-display font-bold text-sm truncate">{eventoActivo.nombre}</h3>
                          <p className="text-[12px] text-on-surface-variant">
                            {te.tipos[eventoActivo.tipo] || eventoActivo.tipo}
                          </p>
                        </div>
                        {/* Editar pegado al evento: act�a SOBRE este evento, no
                            sobre la secci�n. Abre la misma forma del alta,
                            precargada. */}
                        <button onClick={() => abrirEditar(eventoActivo)}
                          title={te.panelInicio.editarEvento}
                          className="shrink-0 p-1 text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors">
                          <Icon name="edit" className="text-[16px] leading-none" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden mb-1">
                          <div className="h-full bg-selected rounded-full transition-all" style={{ width: `${pctConfirmados}%` }} />
                        </div>
                        <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase tabular-nums">
                          {pctConfirmados}% {te.panelInicio.confirmado}
                        </p>
                      </div>
                    </div>

                    {/* El estado se dice con TEXTO además del color: nunca solo color */}
                    {/* Los cuatro en un renglón mientras la TARJETA dé el ancho.
                        Container query, no breakpoint: abrir el panel de
                        notificaciones encoge la tarjeta, no la ventana. */}
                    <div className="grid grid-cols-2 @min-[520px]:grid-cols-4 gap-2">
                      {[
                        { k: 'invitados', v: resumen?.invitados ?? 0, icono: 'group', tono: 'text-on-surface' },
                        { k: 'confirmados', v: resumen?.confirmados ?? 0, icono: 'how_to_reg', tono: 'text-selected' },
                        { k: 'declinados', v: resumen?.declinados ?? 0, icono: 'person_off', tono: 'text-error' },
                        { k: 'sinResponder', v: resumen?.sin_responder ?? 0, icono: 'schedule', tono: 'text-on-surface-variant' },
                      ].map(({ k, v, icono, tono }) => (
                        <div key={k} className="flex items-center gap-2.5 bg-surface-container-high/40 rounded-lg px-3 py-2.5">
                          <Icon name={icono} className={`text-[16px] leading-none ${tono}`} />
                          <div className="min-w-0">
                            <div className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase">{te.panelInicio[k]}</div>
                            <div className={`text-[13px] font-display font-bold tabular-nums ${tono}`}>{v}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Guía de inicio — mismo componente visual que la de negocios:
                  riel de progreso detrás de los círculos, paso hecho en tertiary
                  y bloqueado, y botón al siguiente pendiente. */}
              {(() => {
                const guiaSteps = [
                  { icon: 'celebration', label: te.guia.pasos[0], done: !!eventoActivo, nav: 'nuevo-evento' },
                  { icon: 'mail', label: te.guia.pasos[1], done: !!eventoActivo?.invitacion_url, nav: 'invitation-builder' },
                  { icon: 'assignment', label: te.guia.pasos[2], done: false, nav: 'rsvp-form' },
                  { icon: 'group', label: te.guia.pasos[3], done: (resumen?.invitados ?? 0) > 0, nav: 'guests' },
                  { icon: 'redeem', label: te.guia.pasos[4], done: !!(eventoActivo?.datos_pago && Object.keys(eventoActivo.datos_pago).length), nav: 'gift-registry' },
                  { icon: 'favorite', label: te.guia.pasos[5], done: false, nav: 'wishlist' },
                  { icon: 'send', label: te.guia.pasos[6], done: eventoActivo?.estado === 'enviado' || eventoActivo?.estado === 'finalizado', nav: null },
                ]
                const completados = guiaSteps.filter((s) => s.done).length
                const siguiente = guiaSteps.find((s) => !s.done && s.nav)
                const ultimoHecho = guiaSteps.map((s) => s.done).lastIndexOf(true)
                const margenTrack = (0.5 / guiaSteps.length) * 100
                const fillPct = ultimoHecho <= 0 ? 0 : (ultimoHecho / (guiaSteps.length - 1)) * 100

                return (
                  <div className="@container border border-outline-variant bg-surface-container rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <Icon name="rocket_launch" className="text-tertiary text-[16px] leading-none" />
                        <h3 className="font-display font-bold text-sm">{te.guia.titulo}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-display text-on-surface-variant">{te.guia.contador(completados, guiaSteps.length)}</span>
                        {siguiente && (
                          <button
                            onClick={() => handleNav(siguiente.nav)}
                            className="shrink-0 border border-primary text-primary px-4 py-2 font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:bg-primary/5 flex items-center gap-1.5"
                          >
                            {te.guia.siguiente}
                            <Icon name="arrow_forward" className="text-[15px]" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <div
                        className="hidden @min-[760px]:block absolute top-[26px] h-1 bg-surface-container-high rounded-full"
                        style={{ left: `${margenTrack}%`, right: `${margenTrack}%` }}
                      >
                        <div className="h-full bg-tertiary rounded-full transition-all" style={{ width: `${fillPct}%` }} />
                      </div>
                      <div className="relative grid grid-cols-2 @min-[440px]:grid-cols-4 @min-[760px]:grid-cols-7 gap-2">
                        {guiaSteps.map((step, i) => (
                          <button
                            key={i}
                            // Paso completado: bloqueado, no navega. Solo los
                            // pendientes con destino son clickeables.
                            disabled={step.done || !step.nav}
                            onClick={() => !step.done && step.nav && handleNav(step.nav)}
                            className={`flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-lg transition-colors ${
                              step.done ? 'cursor-default' : step.nav ? 'hover:bg-surface-container-high/60 cursor-pointer' : 'cursor-default'
                            }`}
                          >
                            {step.done ? (
                              <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center">
                                <Icon name={step.icon} fill className="text-on-tertiary text-[16px]" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full border-2 border-outline-variant bg-surface-container-lowest flex items-center justify-center">
                                <Icon name={step.icon} className="text-on-surface-variant text-[16px]" />
                              </div>
                            )}
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
            </div>
          ) : activeTab === 'rsvp-form' ? (
            <div>
              <h1 className="text-[18px] font-display font-bold text-on-surface">
                {te.paginas['rsvp-form'].title}
              </h1>
              <p className="text-[13px] font-body text-on-surface-variant mt-1">
                {te.paginas['rsvp-form'].description}
              </p>
              {eventoActivo ? (
                // `key` para que al cambiar de evento el componente se remonte
                // con sus preguntas, en vez de sincronizarlas con un efecto.
                <FormularioFlow
                  key={eventoActivo.id}
                  evento={eventoActivo}
                  onGuardado={(ev) => {
                    setEventoActivo(ev)
                    setEventos((prev) => prev.map((e) => (e.id === ev.id ? ev : e)))
                  }}
                />
              ) : (
                <p className="text-[13px] text-on-surface-variant mt-4">{te.panelInicio.sinEventoDesc}</p>
              )}
            </div>
          ) : activeTab === 'guests' ? (
            <div>
              <h1 className="text-[18px] font-display font-bold text-on-surface">
                {te.menu.guests}
              </h1>
              <p className="text-[13px] font-body text-on-surface-variant mt-1">
                {current?.description}
              </p>
              {eventoActivo
                ? <InvitadosSection evento={eventoActivo} />
                : <p className="text-[13px] text-on-surface-variant mt-4">{te.panelInicio.sinEventoDesc}</p>}
            </div>
          ) : activeTab === 'invitation-builder' ? (
            // El editor manda su propia altura: necesita la ventana completa
            // para que la previa no quede en una rendija.
            <div className="h-full flex flex-col min-h-0">
              <h1 className="text-[18px] font-display font-bold text-on-surface mb-3 shrink-0">
                {te.menu['invitation-builder']}
              </h1>
              {eventoActivo ? (
                <div className="flex-1 min-h-0">
                  <EditorInvitacion
                    evento={eventoActivo}
                    onGuardado={(ev) => {
                      setEventoActivo(ev)
                      setEventos((prev) => prev.map((e) => (e.id === ev.id ? ev : e)))
                    }}
                  />
                </div>
              ) : (
                <p className="text-[13px] text-on-surface-variant">{te.panelInicio.sinEventoDesc}</p>
              )}
            </div>
          ) : (
            <>
              <h1 className="text-[18px] font-display font-bold text-on-surface">
                {te.menu[activeSection] || current?.title}
              </h1>

              {/* Pestañas: las vistas de una misma sección viven aquí, no en el
                  sidebar. Confirmados y Encuestas son cortes de la lista de
                  invitados, no destinos distintos. */}
              {pestanas.length > 1 && (
                <div className="flex items-center gap-1 mt-3 -mb-px border-b border-outline-variant/30">
                  {pestanas.map((tab) => {
                    const activa = activeTab === tab
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        aria-selected={activa}
                        className={`relative px-3 py-1.5 text-[13px] font-display transition-colors ${
                          activa
                            ? 'text-selected font-semibold'
                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                        }`}
                      >
                        {te.menu[tab]}
                        {activa && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-selected" />}
                      </button>
                    )
                  })}
                </div>
              )}

              <p className="text-[13px] font-body text-on-surface-variant mt-4">{current?.description}</p>

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

        {panelActivo === 'notificaciones' && (
          <PanelNotificaciones
            notificaciones={notificaciones}
            loading={notifLoading}
            onMarcarLeida={marcarLeida}
            localeFecha={localeFecha}
            labels={te.panel}
          />
        )}
        </div>
      </main>
    </div>
  )
}
