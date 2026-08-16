// Panel de notificaciones, compartido por los dos dashboards.
//
// Las notificaciones son de la CUENTA, no del panel: una cuenta de tipo 'ambos'
// ve las mismas en Negocio y en Eventos, y marcarlas leídas en uno las marca en
// el otro. Por eso vive aquí y no incrustado en cada página.
import Icon from '../shared/Icon'

export default function PanelNotificaciones({
  notificaciones,
  loading,
  onMarcarLeida,
  localeFecha,
  labels,   // { notificaciones, cargando, sinNotificaciones }
}) {
  return (
    <aside className="w-52 shrink-0 border-l border-outline-variant bg-surface-container flex flex-col overflow-hidden">
      <div className="px-2.5 h-11 flex items-center shrink-0">
        <h3 className="font-display font-bold text-[15px]">{labels.notificaciones}</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="py-10 text-center text-[13px] text-on-surface-variant">{labels.cargando}</div>
        ) : notificaciones.length === 0 ? (
          <div className="py-10 text-center">
            <Icon name="notifications_none" className="text-outline-variant text-[28px] mb-1.5" />
            <p className="text-[13px] text-on-surface-variant">{labels.sinNotificaciones}</p>
          </div>
        ) : (
          <div className="space-y-px">
            {notificaciones.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.leida && onMarcarLeida(n.id)}
                className={`w-full text-left px-2 py-1.5 transition-colors ${
                  !n.leida
                    ? 'bg-primary/3 hover:bg-primary/5 cursor-pointer'
                    : 'bg-surface-container-lowest'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Icon
                    name={n.icono || 'info'}
                    className={`text-[15px] mt-0.5 shrink-0 leading-none ${!n.leida ? 'text-selected' : 'text-on-surface-variant'}`}
                  />
                  <div className="min-w-0">
                    <p className={`text-[13px] font-display leading-tight ${!n.leida ? 'font-bold text-selected' : 'font-medium text-on-surface-variant'}`}>
                      {n.titulo}
                    </p>
                    <p className="text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">{n.mensaje}</p>
                    <p className="text-[11px] text-outline mt-1">
                      {new Date(n.creada).toLocaleDateString(localeFecha, {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
