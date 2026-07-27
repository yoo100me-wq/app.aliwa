import { createContext, useContext } from 'react'

// El contexto vive aparte del componente por la misma razón que el de idioma:
// si `createContext` estuviera en el archivo del provider, cualquier edición en
// caliente crearía un contexto nuevo y los componentes ya montados se quedarían
// con el viejo (`useContext` → null). Ver i18n-app/contexto.js.
export const ToastContext = createContext(null)

/** Devuelve { mostrar(mensaje, tipo) }. tipo: 'error' | 'exito' | 'info'. */
export function useToast() {
  return useContext(ToastContext)
}
