import Icon from '../shared/Icon'
import { FILTROS_ASIGNACION } from './filtrosAsignacion'

export default function FiltrosConversaciones({ filtroActivo, onCambiar, noLeidosPorGrupo }) {
  return (
    <div className="flex flex-col h-full px-1.5 py-1.5">
      {/* Título */}
      <h2 className="font-display font-bold text-[15px] px-2 mb-1">Bandeja</h2>
      <div className="h-px bg-outline-variant/30 -mx-1.5 mb-1.5" />

      {/* Grupo: Asignación */}
      <div className="mb-0.5 px-2">
        <span className="text-[11px] tracking-wide uppercase text-on-surface-variant font-display font-semibold">
          Asignación
        </span>
      </div>

      <div className="space-y-px">
        {FILTROS_ASIGNACION.map((f) => {
          const activo = filtroActivo === f.id
          const badge = noLeidosPorGrupo?.[f.id] || 0
          return (
            <button
              key={f.id}
              onClick={() => onCambiar(f.id)}
              className={`w-full flex items-center gap-2 px-2 py-0.5 text-[13px] font-display transition-colors ${
                activo
                  ? 'bg-primary/5 text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
              }`}
            >
              <Icon name={f.icon} className="text-[16px] leading-none" />
              <span className="flex-1 text-left truncate">{f.label}</span>
              {badge > 0 && (
                <span className="shrink-0 min-w-[16px] h-4 px-1 rounded-full bg-tertiary text-on-tertiary text-[10px] font-bold flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
