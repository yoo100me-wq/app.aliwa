// i18n de la APP autenticada (dashboard). A diferencia de login/registro
// (idioma por ruta /en), aquí la preferencia vive en localStorage('aliwa-lang')
// — igual que el tema — y se hereda del idioma con el que se hizo login.
import { useMemo, useState } from 'react'
import { LangContext, useLang } from './contexto'
import * as dash from './dash'
import * as chats from './chats'
import * as equipo from './equipo'
import * as lead from './lead'
import * as plantillas from './plantillas'
import * as numeros from './numeros'
import * as openpay from './openpay'
import * as contactos from './contactos'
import * as formularios from './formularios'

const NAMESPACES = { dash, chats, equipo, lead, plantillas, numeros, openpay, contactos, formularios }

function construirT(lang) {
  const t = {}
  for (const [nombre, mod] of Object.entries(NAMESPACES)) t[nombre] = mod[lang]
  return t
}

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

// Se re-exporta para no tocar los ~15 archivos que ya lo importan de aquí.
export { useLang }
