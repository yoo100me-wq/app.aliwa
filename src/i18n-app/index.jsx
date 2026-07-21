// i18n de la APP autenticada (dashboard). A diferencia de login/registro
// (idioma por ruta /en), aquí la preferencia vive en localStorage('aliwa-lang')
// — igual que el tema — y se hereda del idioma con el que se hizo login.
import { createContext, useContext, useMemo, useState } from 'react'
import * as dash from './dash'
import * as chats from './chats'
import * as equipo from './equipo'
import * as lead from './lead'
import * as plantillas from './plantillas'
import * as numeros from './numeros'
import * as openpay from './openpay'

const NAMESPACES = { dash, chats, equipo, lead, plantillas, numeros, openpay }

function construirT(lang) {
  const t = {}
  for (const [nombre, mod] of Object.entries(NAMESPACES)) t[nombre] = mod[lang]
  return t
}

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('aliwa-lang') || 'es' } catch { return 'es' }
  })

  const value = useMemo(() => ({
    lang,
    t: construirT(lang),
    toggleLang: () => setLang((actual) => {
      const nuevo = actual === 'es' ? 'en' : 'es'
      try { localStorage.setItem('aliwa-lang', nuevo) } catch { /* sin storage */ }
      return nuevo
    }),
  }), [lang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
