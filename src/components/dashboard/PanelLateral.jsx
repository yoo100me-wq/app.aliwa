import Icon from '../shared/Icon'

// Marco del panel derecho del dashboard. Replica el chrome de LeadPanel (ancho,
// fondo, header de 44px y divisoria) para que todo lo que se abra a la derecha
// —lead, plantillas, interactivos— se sienta del mismo sistema y no como una
// ventana flotante encima del chat.
// `flotante`: se monta ENCIMA del chat en vez de ocupar su propia columna.
// Es lo que usan plantillas e interactivos: son paneles de paso, y partir el
// layout dejaba la conversación demasiado angosta mientras armas el mensaje.
export default function PanelLateral({ titulo, onClose, children, flotante = false }) {
  return (
    <div
      className={`w-[300px] bg-surface-container-lowest border-l border-outline-variant flex flex-col overflow-hidden ${
        flotante ? 'absolute inset-y-0 right-0 z-20 shadow-xl' : 'shrink-0'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-4 h-11 shrink-0">
        <h2 className="font-display font-bold text-[15px] truncate min-w-0">{titulo}</h2>
        <button
          onClick={onClose}
          className="p-1 text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
        >
          <Icon name="close" className="text-[18px] leading-none" />
        </button>
      </div>
      <div className="h-px bg-outline-variant" />
      <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
    </div>
  )
}
