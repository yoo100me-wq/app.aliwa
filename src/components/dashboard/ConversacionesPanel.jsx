import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiFetch, apiUpload } from '../../utils/api'
import FiltrosConversaciones from './FiltrosConversaciones'
import ListaConversaciones from './ListaConversaciones'
import VistaConversacion from './VistaConversacion'
import LeadPanel from './LeadPanel'
import { useLang } from '../../i18n-app'

export default function ConversacionesPanel({ usuarioId }) {
  const { t } = useLang()
  const tc = t.chats
  const [conversaciones, setConversaciones] = useState([])
  const [conversacionActiva, setConversacionActiva] = useState(null)
  const [cargandoLista, setCargandoLista] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  // Filtros
  const [filtroAsignacion, setFiltroAsignacion] = useState('todas')
  const [filtroLectura, setFiltroLectura] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  // Modal de edición de lead
  const [leadModalOpen, setLeadModalOpen] = useState(false)

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

  // Seleccionar conversación
  const seleccionar = async (id) => {
    setCargandoDetalle(true)
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

  // "Escribiendo..." en el WhatsApp del cliente (fire-and-forget)
  const notificarTyping = () => {
    if (!conversacionActiva) return
    apiFetch(`/api/conversaciones/${conversacionActiva.id}/typing/`, { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="flex h-full">
      {/* Contenedor de filtros (asignación) */}
      <div className="w-[176px] shrink-0 bg-surface-container-lowest border-r border-outline-variant overflow-hidden">
        <FiltrosConversaciones
          filtroActivo={filtroAsignacion}
          onCambiar={setFiltroAsignacion}
          noLeidosPorGrupo={noLeidosPorGrupo}
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
          busqueda={busqueda}
          onBuscar={setBusqueda}
        />
      </div>

      {/* Panel derecho - Chat */}
      {/* min-w-0 permite que el chat se encoja cuando el panel de
          notificaciones está abierto (el layout se auto-ajusta) */}
      <div className="flex-1 min-w-0 bg-surface-container overflow-hidden">
        <VistaConversacion
          conversacion={conversacionActiva}
          onEnviar={enviarMensaje}
          onEnviarMedia={enviarMedia}
          onEnviarInteractivo={enviarInteractivo}
          onEnviarPlantilla={enviarPlantilla}
          onTyping={notificarTyping}
          cargando={cargandoDetalle}
          onEditarLead={() => conversacionActiva?.prospecto && setLeadModalOpen(true)}
        />
      </div>

      {/* Panel lateral de edición de lead (ocupa espacio, como notificaciones) */}
      {leadModalOpen && conversacionActiva?.prospecto && (
        <LeadPanel
          prospectoId={conversacionActiva.prospecto}
          onClose={() => setLeadModalOpen(false)}
          onSaved={() => {
            cargarConversaciones()
            seleccionar(conversacionActiva.id)
          }}
        />
      )}
    </div>
  )
}
