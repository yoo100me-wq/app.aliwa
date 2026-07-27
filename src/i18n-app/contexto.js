import { createContext, useContext } from 'react'

// El contexto vive APARTE de index.jsx a propósito. index.jsx importa los ocho
// diccionarios, así que al editar cualquiera de ellos Vite lo re-ejecuta en
// caliente: si `createContext` estuviera ahí, cada edición crearía un contexto
// nuevo y los componentes ya montados (DashboardPage) se quedarían con el
// viejo → `useLang()` devolvía null y la app tronaba hasta recargar a mano.
// Este módulo no depende de nada que cambie, así que su identidad es estable.
export const LangContext = createContext(null)

export function useLang() {
  return useContext(LangContext)
}
