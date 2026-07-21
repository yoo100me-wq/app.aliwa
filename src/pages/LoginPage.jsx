import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Icon from '../components/shared/Icon'
import AliwaIcon from '../components/shared/AliwaIcon'
import { apiFetch } from '../utils/api'
import WaitlistModal from '../components/landing/WaitlistModal'
import useTheme from '../hooks/useTheme'
import { useT, otherLangPath } from '../i18n'

// Sitio de marketing (landing). El logo del login lleva de vuelta ahí.
const MARKETING_URL = 'https://aliwa.mx'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [dark, toggleDark] = useTheme()
  const { lang, t } = useT()
  const isEn = lang === 'en'
  const cambiarIdioma = () => navigate(otherLangPath(location.pathname))
  const tl = t.login
  // Al dar clic en el logo se vuelve a la landing (aliwa.mx), preservando idioma
  const home = isEn ? `${MARKETING_URL}/en` : MARKETING_URL
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { res, data } = await apiFetch('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        // El dashboard hereda el idioma con el que se hizo login
        try { localStorage.setItem('aliwa-lang', lang) } catch { /* sin storage */ }
        navigate('/dashboard')
      } else {
        setError(data.error || tl.errorCredentials)
      }
    } catch {
      setError(tl.errorConnection)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Barra superior estilo dashboard: logo (→ landing) + idioma/tema */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6">
        <a
          href={home}
          title={isEn ? 'Back to aliwa.mx' : 'Volver a aliwa.mx'}
          className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <AliwaIcon size={36} />
          <span className="text-xl font-logo font-bold text-primary dark:text-on-background">Aliwa</span>
        </a>
        <div className="flex items-center gap-1">
          <button
            onClick={cambiarIdioma}
            title={isEn ? 'Cambiar a español' : 'Switch to English'}
            className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface px-2.5 py-2 rounded-lg font-display text-[13px] font-semibold transition-colors hover:bg-surface-container-high/50"
          >
            <Icon name="language" className="text-[18px] leading-none" />
            {isEn ? 'ES' : 'EN'}
          </button>
          <button
            onClick={toggleDark}
            title={dark ? (isEn ? 'Light mode' : 'Modo claro') : (isEn ? 'Dark mode' : 'Modo oscuro')}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors"
          >
            <Icon name={dark ? 'light_mode' : 'dark_mode'} className="text-[18px] leading-none" />
          </button>
        </div>
      </header>
      {/* Línea divisoria decorativa. Sobre el fondo puro del login, outline-variant
          es imperceptible; se usa `outline` (gris medio) que contrasta en claro Y oscuro. */}
      <div className="h-px bg-outline/30" />

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-6 md:px-10 py-8 md:py-12 overflow-y-auto">
        <div className="w-full max-w-[400px]">
          <h1 className="font-display text-[26px] sm:text-[32px] font-bold leading-tight mb-3">
            {tl.title}
          </h1>
          <p className="text-sm leading-[1.7] text-on-surface-variant mb-8 sm:mb-10">
            {tl.subtitle}
          </p>

          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-error/10 text-error text-[13px] font-display">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">
                {tl.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tl.emailPlaceholder}
                autoFocus
                className="w-full bg-surface-container-high/50 rounded-lg px-4 py-3 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">
                {tl.passwordLabel}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-high/50 rounded-lg px-4 py-3 pr-12 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-primary text-on-primary py-3 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? tl.loading : tl.submit}
            </button>
          </form>

          <p className="text-center mt-10 text-[13px] text-on-surface-variant">
            {tl.noAccount}{' '}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('open-waitlist'))}
              className="text-primary font-display font-semibold hover:underline"
            >
              {tl.startFree}
            </button>
          </p>
        </div>
      </div>

      <WaitlistModal />
    </div>
  )
}
