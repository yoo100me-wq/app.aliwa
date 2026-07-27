import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { ToastContext } from './toastContexto'

// Notificaciones flotantes arriba a la derecha. Reemplazan a los mensajes de
// error incrustados en cada formulario: antes un fallo podía aparecer fuera de
// la vista (al final de un panel con scroll) y pasar desapercibido.
const DURACION = { error: 7000, exito: 4000, info: 5000 }

const ESTILO = {
  error: { icono: 'error', clase: 'border-l-error' },
  exito: { icono: 'check_circle', clase: 'border-l-accent' },
  info: { icono: 'info', clase: 'border-l-purple' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const siguienteId = useRef(1)

  const quitar = useCallback((id) => {
    setToasts((lista) => lista.filter((t) => t.id !== id))
  }, [])

  const mostrar = useCallback((mensaje, tipo = 'error') => {
    const texto = String(mensaje || '').trim()
    if (!texto) return
    const id = siguienteId.current++
    setToasts((lista) => {
      // No apilar el mismo mensaje si ya está en pantalla (un reintento que
      // falla igual no debe llenar la esquina de copias).
      if (lista.some((t) => t.mensaje === texto && t.tipo === tipo)) return lista
      return [...lista, { id, mensaje: texto, tipo }]
    })
  }, [])

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <div className="fixed top-3 right-3 z-[100] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-1.5rem)] pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onCerrar={() => quitar(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ mensaje, tipo, onCerrar }) {
  const { icono, clase } = ESTILO[tipo] || ESTILO.error

  useEffect(() => {
    const id = setTimeout(onCerrar, DURACION[tipo] || DURACION.info)
    return () => clearTimeout(id)
  }, [onCerrar, tipo])

  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-2 border-l-[3px] ${clase} bg-surface-container-lowest shadow-lg px-3 py-2.5`}
    >
      <Icon
        name={icono}
        className={`text-[16px] leading-none mt-0.5 shrink-0 ${tipo === 'error' ? 'text-error' : 'text-on-surface-variant'}`}
      />
      <p className="flex-1 min-w-0 text-[12px] font-body leading-relaxed break-words">{mensaje}</p>
      <button
        onClick={onCerrar}
        className="shrink-0 p-0.5 text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <Icon name="close" className="text-[14px] leading-none" />
      </button>
    </div>
  )
}
