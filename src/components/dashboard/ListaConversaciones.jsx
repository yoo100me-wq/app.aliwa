import { useMemo } from 'react'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'
import { colorAvatar } from './avatarColor'

function obtenerIniciales(nombre) {
  if (!nombre) return '?'
  const partes = nombre.trim().split(' ')
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase()
  return partes[0][0].toUpperCase()
}

function formatearHora(iso, locale, etiquetaAyer) {
  if (!iso) return ''
  const fecha = new Date(iso)
  const ahora = new Date()
  const diff = ahora - fecha

  // Hoy
  if (fecha.toDateString() === ahora.toDateString()) {
    return fecha.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }
  // Ayer
  if (diff < 172800000 && new Date(ahora - 86400000).toDateString() === fecha.toDateString()) {
    return etiquetaAyer
  }
  // Esta semana
  if (diff < 604800000) {
    return fecha.toLocaleDateString(locale, { weekday: 'short' })
  }
  // Más antiguo
  return fecha.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
}

// Colores para distinguir conversaciones por número del negocio
// (solo se muestran cuando la cuenta tiene más de un número conectado)
const COLORES_NUMERO = [
  'bg-purple/10 text-purple',
  'bg-tertiary/10 text-tertiary',
  'bg-accent/30 text-on-accent',
  'bg-primary/10 text-primary',
]

// Sub-filtro: por estado de lectura (labels vía t.chats.filtrosLectura)
const FILTROS_LECTURA = ['todas', 'no_leidos', 'leidos']

function coincideAsignacion(conv, filtro, usuarioId) {
  if (filtro === 'mias') return conv.usuario_asignado === usuarioId
  if (filtro === 'sin_asignar') return !conv.usuario_asignado
  return true // todas
}

function coincideLectura(conv, filtro) {
  if (filtro === 'no_leidos') return conv.no_leidos > 0
  if (filtro === 'leidos') return !(conv.no_leidos > 0)
  return true // todas
}

export default function ListaConversaciones({
  conversaciones,
  conversacionActivaId,
  onSelect,
  cargando,
  usuarioId,
  filtroAsignacion,
  filtroLectura,
  onCambiarLectura,
  busqueda,
  onBuscar,
}) {
  const { lang, t } = useLang()
  const tc = t.chats
  const locale = lang === 'en' ? 'en-US' : 'es-MX'
  const tituloFiltro = tc.filtrosAsignacion[filtroAsignacion] || tc.conversaciones

  // Mapa número → color, estable por orden alfabético. null si solo hay un número.
  const colorPorNumero = useMemo(() => {
    const nums = [...new Set(conversaciones.map((c) => c.numero_telefono).filter(Boolean))].sort()
    if (nums.length < 2) return null
    return Object.fromEntries(nums.map((n, i) => [n, COLORES_NUMERO[i % COLORES_NUMERO.length]]))
  }, [conversaciones])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return conversaciones.filter((conv) => {
      if (!coincideAsignacion(conv, filtroAsignacion, usuarioId)) return false
      if (!coincideLectura(conv, filtroLectura)) return false
      if (q) {
        const texto = `${conv.cliente_nombre || ''} ${conv.cliente_telefono || ''}`.toLowerCase()
        if (!texto.includes(q)) return false
      }
      return true
    })
  }, [conversaciones, filtroAsignacion, filtroLectura, busqueda, usuarioId])

  return (
    <div className="flex flex-col h-full">
      {/* Header + buscador */}
      <div className="px-2.5 pt-1.5 pb-1.5">
        <h2 className="font-display font-bold text-[15px] mb-1">{tituloFiltro}</h2>
        <div className="h-px bg-outline-variant -mx-2.5 mb-1.5" />
        <div className="relative">
          <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder={tc.buscarPlaceholder}
            className="w-full bg-surface-container-high/50 pl-8 pr-3 py-1.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none transition-all"
          />
        </div>
      </div>

      {/* Sub-filtro: estado de lectura */}
      <div className="px-2.5 pb-0.5">
        <div className="flex gap-1">
          {FILTROS_LECTURA.map((f) => {
            const activo = filtroLectura === f
            return (
              <button
                key={f}
                onClick={() => onCambiarLectura(f)}
                className={`px-2 py-0.5 text-[12px] font-display transition-colors ${
                  activo
                    ? 'bg-primary/3 text-selected font-bold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                }`}
              >
                {tc.filtrosLectura[f]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Línea decorativa que separa el buscador/filtros de la lista */}
      <div className="h-px bg-outline-variant shrink-0" />

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-1 pt-1 pb-2">
        {cargando ? (
          <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
            <Icon name="hourglass_empty" className="text-[28px] mb-3 animate-pulse" />
            <p className="text-sm font-display">{tc.cargando}</p>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-on-surface-variant px-6">
            <Icon name="chat" className="text-[28px] mb-3 opacity-40" />
            <p className="text-sm font-display text-center">
              {conversaciones.length === 0
                ? tc.sinConversaciones
                : tc.sinConversacionesFiltro}
            </p>
          </div>
        ) : (
          filtradas.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full flex items-center gap-2 px-2 py-1 my-1.5 transition-colors text-left ${
                conversacionActivaId === conv.id
                  ? 'bg-primary/8'
                  : 'hover:bg-surface-container-high/50'
              }`}
            >
              {/* Avatar — color estable por contacto (Meta no da la foto real) */}
              <div className={`w-8 h-8 ${colorAvatar(conv.cliente_telefono || conv.id)} flex items-center justify-center shrink-0`}>
                {(conv.nombre_mostrar || '').startsWith('Lead ') ? (
                  <Icon name="badge" className="text-[16px] leading-none" />
                ) : (
                  <span className="font-display font-semibold text-[12px]">
                    {obtenerIniciales(conv.nombre_mostrar)}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-[13px] truncate">
                    {conv.nombre_mostrar || conv.cliente_telefono}
                  </span>
                  <span className="text-[11px] text-on-surface-variant shrink-0 ml-2">
                    {formatearHora(conv.ultimo_mensaje_en, locale, tc.ayer)}
                  </span>
                </div>
                {/* Apodo de WhatsApp bajo el código del lead */}
                {(conv.nombre_mostrar || '').startsWith('Lead ') && conv.apodo && (
                  <p className="text-[11px] text-on-surface-variant italic truncate">
                    ~ {conv.apodo}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-[12px] text-on-surface-variant truncate">
                    {conv.vista_previa_ultimo || tc.sinMensajes}
                  </p>
                  {colorPorNumero && conv.numero_telefono && (
                    <span className={`shrink-0 ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-display font-semibold ${colorPorNumero[conv.numero_telefono]}`}>
                      ···{conv.numero_telefono.replace(/\D/g, '').slice(-4)}
                    </span>
                  )}
                  {conv.no_leidos > 0 && (
                    <span className="shrink-0 ml-2 w-5 h-5 rounded-full bg-tertiary text-on-tertiary text-[10px] font-display font-bold flex items-center justify-center">
                      {conv.no_leidos > 9 ? '9+' : conv.no_leidos}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
