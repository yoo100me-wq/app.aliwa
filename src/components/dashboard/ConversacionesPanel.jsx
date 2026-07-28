import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiFetch, apiUpload } from '../../utils/api'
import FiltrosConversaciones from './FiltrosConversaciones'
import ListaConversaciones from './ListaConversaciones'
import VistaConversacion from './VistaConversacion'
import LeadPanel from './LeadPanel'
import EnviarPlantillaModal from './EnviarPlantillaModal'
import EnviarInteractivoPanel from './EnviarInteractivoPanel'
import EnviarUbicacionPanel from './EnviarUbicacionPanel'
import EnviarFormularioPanel from './EnviarFormularioPanel'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'

export default function ConversacionesPanel({ usuarioId, numeros = [], numerosCargados = false }) {
  const { t } = useLang()
  const tc = t.chats
  const [conversaciones, setConversaciones] = useState([])
  const [conversacionActiva, setConversacionActiva] = useState(null)
  const [cargandoLista, setCargandoLista] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  // Filtros
  const [filtroAsignacion, setFiltroAsignacion] = useState('todas')
  const [filtroLectura, setFiltroLectura] = useState('todas')
  const [filtroNumero, setFiltroNumero] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  // Números activos del negocio (para el filtro de bandeja). Vienen del padre
  // (DashboardPage), fuente única — evita re-pedir /api/whatsapp/numeros/ aquí.
  const numerosCuenta = useMemo(() => (numeros || [])
    .filter((n) => n.estado === 'activo' && n.numero_telefono)
    .map((n) => ({ telefono: n.numero_telefono, nombre: n.nombre_visible || '' })), [numeros])

  // Sin número activo conectado: pedir conectar uno antes de mostrar la bandeja.
  const sinNumero = numerosCargados && numerosCuenta.length === 0

  // Opciones del filtro de número ({telefono, nombre}): unión de los números
  // activos de la cuenta y los que aparecen en conversaciones (por si alguno
  // llegó por un número extra sin nombre).
  const numerosDisponibles = useMemo(() => {
    const mapa = new Map()
    for (const n of numerosCuenta) mapa.set(n.telefono, n.nombre)
    for (const c of conversaciones) {
      if (c.numero_telefono && !mapa.has(c.numero_telefono)) mapa.set(c.numero_telefono, '')
    }
    return [...mapa.entries()]
      .map(([telefono, nombre]) => ({ telefono, nombre }))
      .sort((a, b) => a.telefono.localeCompare(b.telefono))
  }, [numerosCuenta, conversaciones])

  // Qué ocupa la columna derecha: null | 'lead' | 'plantilla' | 'interactivo'
  // | 'ubicacion'. Son excluyentes: abrir uno cierra el anterior.
  const [panelDerecho, setPanelDerecho] = useState(null)
  const leadModalOpen = panelDerecho === 'lead'

  // Bloqueo del contacto: el estado vive en Meta (Block API), así que se
  // consulta al abrir la conversación y no se guarda en nuestra BD.
  const [bloqueado, setBloqueado] = useState(false)

  // No leídos por grupo de asignación (para los badges del contenedor de filtros)
  const noLeidosPorGrupo = useMemo(() => {
    const conteo = { mias: 0, todas: 0, sin_asignar: 0 }
    for (const conv of conversaciones) {
      if (!(conv.no_leidos > 0)) continue
      conteo.todas += 1
      if (conv.usuario_asignado === usuarioId) conteo.mias += 1
      if (!conv.usuario_asignado) conteo.sin_asignar += 1
    }
    return conteo
  }, [conversaciones, usuarioId])

  // Cargar lista de conversaciones
  const cargarConversaciones = useCallback(async () => {
    try {
      const { res, data } = await apiFetch('/api/conversaciones/')
      if (res.ok) {
        setConversaciones(data)
      }
    } catch (e) {
      console.error('Error cargando conversaciones:', e)
    } finally {
      setCargandoLista(false)
    }
  }, [])

  useEffect(() => {
    cargarConversaciones()
  }, [cargarConversaciones])

  // Polling: refresca lista y conversación activa cada 4s (sin spinners).
  // Los entrantes los escribe el VPS en la BD; sin esto solo se ven al
  // recargar. Se pausa con la pestaña oculta y no pisa el optimistic
  // update de un envío en curso (mensajes temp-).
  const activaId = conversacionActiva?.id
  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return
      cargarConversaciones()
      if (!activaId) return
      try {
        const { res, data } = await apiFetch(`/api/conversaciones/${activaId}/`)
        if (!res.ok) return
        setConversacionActiva((prev) => {
          if (!prev || prev.id !== activaId) return prev
          const hayTemp = prev.mensajes?.some((m) => String(m.id).startsWith('temp-'))
          return hayTemp ? prev : data
        })
        // Llegaron mensajes nuevos con el chat abierto: marcarlos leídos
        // (palomitas azules) igual que al abrir la conversación.
        if (data.no_leidos > 0) {
          apiFetch(`/api/conversaciones/${activaId}/read/`, { method: 'POST' })
          setConversaciones((prev) =>
            prev.map((c) => (c.id === activaId ? { ...c, no_leidos: 0 } : c))
          )
        }
      } catch {
        // Silencioso: el siguiente tick reintenta.
      }
    }
    const intervalo = setInterval(tick, 4000)
    return () => clearInterval(intervalo)
  }, [activaId, cargarConversaciones])

  // Seleccionar conversación
  const seleccionar = async (id) => {
    setCargandoDetalle(true)
    setBloqueado(false)
    // Estado de bloqueo en Meta (no bloquea la carga del chat)
    apiFetch(`/api/conversaciones/${id}/bloquear/`)
      .then(({ res, data }) => { if (res.ok) setBloqueado(Boolean(data.bloqueado)) })
      .catch(() => {})
    try {
      const { res, data } = await apiFetch(`/api/conversaciones/${id}/`)
      if (res.ok) {
        setConversacionActiva(data)
        // Marcar como leídos
        if (data.no_leidos > 0) {
          await apiFetch(`/api/conversaciones/${id}/read/`, { method: 'POST' })
          setConversaciones((prev) =>
            prev.map((c) => (c.id === id ? { ...c, no_leidos: 0 } : c))
          )
        }
      }
    } catch (e) {
      console.error('Error cargando conversación:', e)
    } finally {
      setCargandoDetalle(false)
    }
  }

  // Enviar mensaje
  const enviarMensaje = async (contenido) => {
    if (!conversacionActiva) return

    const id = conversacionActiva.id

    // Optimistic update
    const msgTemp = {
      id: `temp-${Date.now()}`,
      tipo_remitente: 'agente',
      tipo_mensaje: 'texto',
      contenido,
      wa_estado: 'enviado',
      creado_en: new Date().toISOString(),
    }

    setConversacionActiva((prev) => ({
      ...prev,
      mensajes: [...prev.mensajes, msgTemp],
    }))

    try {
      const { res, data } = await apiFetch(`/api/conversaciones/${id}/send/`, {
        method: 'POST',
        body: JSON.stringify({ contenido }),
      })

      if (res.ok) {
        // Recargar conversación para obtener el mensaje real
        const { res: r2, data: d2 } = await apiFetch(`/api/conversaciones/${id}/`)
        if (r2.ok) setConversacionActiva(d2)
      }
    } catch (e) {
      console.error('Error enviando mensaje:', e)
    }

    // Actualizar lista
    cargarConversaciones()
  }

  // Recargar detalle + lista (tras enviar media o interactivo)
  const recargarActiva = async (id) => {
    const { res, data } = await apiFetch(`/api/conversaciones/${id}/`)
    if (res.ok) setConversacionActiva(data)
    cargarConversaciones()
  }

  // Enviar archivo (imagen, video, audio, documento) con caption opcional
  const enviarMedia = async (archivo, caption) => {
    if (!conversacionActiva) return { ok: false }
    const id = conversacionActiva.id
    const form = new FormData()
    form.append('archivo', archivo)
    if (caption) form.append('caption', caption)
    try {
      const { res, data } = await apiUpload(`/api/conversaciones/${id}/send-media/`, form)
      if (res.ok) await recargarActiva(id)
      return { ok: res.ok, error: data?.error }
    } catch {
      return { ok: false, error: tc.errorConexion }
    }
  }

  // Enviar mensaje interactivo (botones o lista)
  const enviarInteractivo = async (payload) => {
    if (!conversacionActiva) return { ok: false }
    const id = conversacionActiva.id
    try {
      const { res, data } = await apiFetch(`/api/conversaciones/${id}/send-interactive/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (res.ok) await recargarActiva(id)
      return { ok: res.ok, error: data?.error }
    } catch {
      return { ok: false, error: tc.errorConexion }
    }
  }

  // Enviar plantilla aprobada (única vía fuera de la ventana de 24h)
  const enviarPlantilla = async (payload) => {
    if (!conversacionActiva) return { ok: false }
    const id = conversacionActiva.id
    try {
      const { res, data } = await apiFetch(`/api/conversaciones/${id}/send-template/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (res.ok) await recargarActiva(id)
      return { ok: res.ok, error: data?.error }
    } catch {
      return { ok: false, error: tc.errorConexion }
    }
  }

  // Reaccionar a un mensaje. `emoji` vacío quita la reacción anterior.
  const enviarReaccion = async (waMensajeId, emoji) => {
    if (!conversacionActiva) return { ok: false }
    const id = conversacionActiva.id
    try {
      const { res, data } = await apiFetch(`/api/conversaciones/${id}/send-reaction/`, {
        method: 'POST',
        body: JSON.stringify({ wa_mensaje_id: waMensajeId, emoji }),
      })
      if (res.ok) await recargarActiva(id)
      return { ok: res.ok, error: data?.error }
    } catch {
      return { ok: false, error: tc.errorConexion }
    }
  }

  // Enviar un formulario (Flow). El payload trae `modo`: 'draft' si el flow
  // sigue sin publicar, 'published' si ya lo está.
  const enviarFormulario = async (payload) => {
    if (!conversacionActiva) return { ok: false }
    const id = conversacionActiva.id
    try {
      const { res, data } = await apiFetch(`/api/conversaciones/${id}/send-flow/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (res.ok) await recargarActiva(id)
      return { ok: res.ok, error: data?.error }
    } catch {
      return { ok: false, error: tc.errorConexion }
    }
  }

  // Enviar una ubicación (el mapa dentro del chat)
  const enviarUbicacion = async (payload) => {
    if (!conversacionActiva) return { ok: false }
    const id = conversacionActiva.id
    try {
      const { res, data } = await apiFetch(`/api/conversaciones/${id}/send-location/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (res.ok) await recargarActiva(id)
      return { ok: res.ok, error: data?.error }
    } catch {
      return { ok: false, error: tc.errorConexion }
    }
  }

  // Bloquear / desbloquear al contacto en Meta
  const alternarBloqueo = async () => {
    if (!conversacionActiva) return { ok: false }
    const siguiente = !bloqueado
    try {
      const { res, data } = await apiFetch(`/api/conversaciones/${conversacionActiva.id}/bloquear/`, {
        method: siguiente ? 'POST' : 'DELETE',
      })
      if (res.ok) setBloqueado(siguiente)
      return { ok: res.ok, error: data?.error }
    } catch {
      return { ok: false, error: tc.errorConexion }
    }
  }

  // "Escribiendo..." en el WhatsApp del cliente (fire-and-forget)
  const notificarTyping = () => {
    if (!conversacionActiva) return
    apiFetch(`/api/conversaciones/${conversacionActiva.id}/typing/`, { method: 'POST' }).catch(() => {})
  }

  // Sin número conectado: pedir conectarlo antes de mostrar la bandeja.
  if (sinNumero) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="flex flex-col items-center text-center max-w-sm">
          <Icon name="inventory_2" className="text-outline-variant text-[44px] mb-3" />
          <h3 className="font-display text-[15px] font-semibold mb-1">{tc.sinNumeroTitulo}</h3>
          <p className="text-[13px] text-on-surface-variant leading-relaxed">{tc.sinNumeroTexto}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Contenedor de filtros (asignación) */}
      <div className="w-[176px] shrink-0 bg-surface-container-lowest border-r border-outline-variant overflow-hidden">
        <FiltrosConversaciones
          filtroActivo={filtroAsignacion}
          onCambiar={setFiltroAsignacion}
          noLeidosPorGrupo={noLeidosPorGrupo}
          numeros={numerosDisponibles}
          filtroNumero={filtroNumero}
          onCambiarNumero={setFiltroNumero}
        />
      </div>

      {/* Contenedor de lista */}
      <div className="w-[264px] shrink-0 bg-surface-container-lowest border-r border-outline-variant overflow-hidden">
        <ListaConversaciones
          conversaciones={conversaciones}
          conversacionActivaId={conversacionActiva?.id}
          onSelect={seleccionar}
          cargando={cargandoLista}
          usuarioId={usuarioId}
          filtroAsignacion={filtroAsignacion}
          filtroLectura={filtroLectura}
          onCambiarLectura={setFiltroLectura}
          filtroNumero={filtroNumero}
          busqueda={busqueda}
          onBuscar={setBusqueda}
        />
      </div>

      {/* Panel derecho - Chat */}
      {/* min-w-0 permite que el chat se encoja cuando el panel de
          notificaciones está abierto (el layout se auto-ajusta) */}
      {/* Lienzo del chat: token propio, porque la escala de superficies se
          invierte en oscuro y dejaba un gris medio más claro que los paneles. */}
      <div className="relative flex-1 min-w-0 bg-lienzo-chat overflow-hidden">
        <VistaConversacion
          conversacion={conversacionActiva}
          onEnviar={enviarMensaje}
          onEnviarMedia={enviarMedia}
          onEnviarInteractivo={enviarInteractivo}
          onEnviarPlantilla={enviarPlantilla}
          onReaccionar={enviarReaccion}
          onTyping={notificarTyping}
          cargando={cargandoDetalle}
          leadPanelAbierto={leadModalOpen}
          onEditarLead={() => conversacionActiva?.prospecto
            && setPanelDerecho((p) => (p === 'lead' ? null : 'lead'))}
          panelActivo={panelDerecho}
          onAbrirPlantilla={() => setPanelDerecho((p) => (p === 'plantilla' ? null : 'plantilla'))}
          onAbrirInteractivo={() => setPanelDerecho((p) => (p === 'interactivo' ? null : 'interactivo'))}
          onAbrirUbicacion={() => setPanelDerecho((p) => (p === 'ubicacion' ? null : 'ubicacion'))}
          onAbrirFormulario={() => setPanelDerecho((p) => (p === 'formulario' ? null : 'formulario'))}
          bloqueado={bloqueado}
          onAlternarBloqueo={alternarBloqueo}
        />

        {/* Plantillas e interactivos FLOTAN sobre el chat: son de paso, y
            darles su propia columna dejaba la conversación muy angosta. */}
        {panelDerecho === 'plantilla' && conversacionActiva && (
          <EnviarPlantillaModal
            presentacion="panel"
            onEnviar={enviarPlantilla}
            onClose={() => setPanelDerecho(null)}
          />
        )}
        {panelDerecho === 'interactivo' && conversacionActiva && (
          <EnviarInteractivoPanel
            onEnviar={enviarInteractivo}
            onClose={() => setPanelDerecho(null)}
          />
        )}
        {panelDerecho === 'ubicacion' && conversacionActiva && (
          <EnviarUbicacionPanel
            onEnviar={enviarUbicacion}
            onClose={() => setPanelDerecho(null)}
          />
        )}
        {panelDerecho === 'formulario' && conversacionActiva && (
          <EnviarFormularioPanel
            onEnviar={enviarFormulario}
            onClose={() => setPanelDerecho(null)}
          />
        )}
      </div>

      {/* El panel del lead SÍ ocupa columna (se trabaja en paralelo al chat) */}
      {leadModalOpen && conversacionActiva?.prospecto && (
        <LeadPanel
          prospectoId={conversacionActiva.prospecto}
          onClose={() => setPanelDerecho(null)}
          onSaved={() => {
            cargarConversaciones()
            seleccionar(conversacionActiva.id)
          }}
        />
      )}
    </div>
  )
}
