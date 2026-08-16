// Selector de panel para las cuentas de tipo 'ambos'.
//
// Vive en la barra superior, antes de idioma y notificaciones. Solo se monta
// cuando la cuenta incluye los dos lados: una cuenta de tipo 'negocio' o
// 'evento' no debe ver siquiera que el otro panel existe.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../shared/Icon'

const RUTAS = { negocio: '/dashboard', eventos: '/eventos/dashboard' }

// Preferencia persistida: al volver a entrar, se abre el último panel usado.
// Mismo patrón que aliwa-theme / aliwa-lang / aliwa-sidebar-collapsed.
export const PANEL_KEY = 'aliwa-panel'

export function panelGuardado() {
  try {
    const v = localStorage.getItem(PANEL_KEY)
    return v === 'eventos' || v === 'negocio' ? v : 'negocio'
  } catch {
    return 'negocio'
  }
}

export function rutaDePanel(panel) {
  return RUTAS[panel] || RUTAS.negocio
}

export default function SelectorModo({ modo, labels }) {
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)

  // Cerrar al hacer clic fuera o con Escape: es un menú, no un panel fijo.
  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    const esc = (e) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', esc)
    }
  }, [abierto])

  const elegir = (id) => {
    setAbierto(false)
    if (id === modo) return
    try { localStorage.setItem(PANEL_KEY, id) } catch { /* sin storage */ }
    navigate(RUTAS[id])
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className={`flex items-center gap-2 h-7 pl-2.5 pr-2 text-[13px] font-display border transition-colors ${
          abierto
            ? 'border-outline-variant bg-surface-container-high/50 text-on-surface'
            : 'border-outline-variant/40 text-on-surface hover:bg-surface-container-high/50'
        }`}
      >
        <span className="font-semibold">{labels[modo]}</span>
        <Icon
          name="expand_more"
          className={`text-[16px] leading-none text-on-surface-variant transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-surface-container-lowest border border-outline-variant shadow-lg"
        >
          {['negocio', 'eventos'].map((id) => {
            const activo = id === modo
            return (
              <button
                key={id}
                role="option"
                aria-selected={activo}
                onClick={() => elegir(id)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[13px] font-display transition-colors ${
                  activo
                    ? 'bg-primary/5 text-selected font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                }`}
              >
                <span className="flex-1 text-left">{labels[id]}</span>
                {activo && <Icon name="check" className="text-[16px] leading-none" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
