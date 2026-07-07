import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiFetch } from '../../utils/api'
import FiltrosConversaciones from './FiltrosConversaciones'
import ListaConversaciones from './ListaConversaciones'
import VistaConversacion from './VistaConversacion'
import LeadPanel from './LeadPanel'

export default function ConversacionesPanel({ usuarioId }) {
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

  return (
    <div className="flex h-full">
      {/* Contenedor de filtros (asignación) */}
      <div className="w-[176px] shrink-0 bg-surface-container-lowest border-r border-outline-variant/15 overflow-hidden">
        <FiltrosConversaciones
          filtroActivo={filtroAsignacion}
          onCambiar={setFiltroAsignacion}
          noLeidosPorGrupo={noLeidosPorGrupo}
        />
      </div>

      {/* Contenedor de lista */}
      <div className="w-[264px] shrink-0 bg-surface-container-lowest border-r border-outline-variant/15 overflow-hidden">
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
      <div className="flex-1 bg-surface-container overflow-hidden">
        <VistaConversacion
          conversacion={conversacionActiva}
          onEnviar={enviarMensaje}
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
