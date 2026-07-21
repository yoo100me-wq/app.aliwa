import { useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import Icon from '../components/shared/Icon'
import AliwaIcon from '../components/shared/AliwaIcon'
import { apiFetch } from '../utils/api'
import useTheme from '../hooks/useTheme'
import { useT, otherLangPath } from '../i18n'

// Sitio de marketing (landing). El logo lleva de vuelta ahí.
const MARKETING_URL = 'https://aliwa.mx'

const planSlugs = ['basico', 'profesional', 'business']

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [dark, toggleDark] = useTheme()
  const { lang, t } = useT()
  const isEn = lang === 'en'
  const cambiarIdioma = () => navigate(otherLangPath(location.pathname))
  const tr = t.register
  // El logo vuelve a la landing (aliwa.mx), preservando idioma
  const home = isEn ? `${MARKETING_URL}/en` : MARKETING_URL
  const loginPath = lang === 'en' ? '/en/login' : '/login'
  const planes = planSlugs.map((slug, i) => ({ slug, ...tr.plans[i] }))
  const [searchParams] = useSearchParams()
  const planParam = searchParams.get('plan')
  const [step, setStep] = useState(1) // 1: email, 2: codigo, 3: datos + plan
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [plan, setPlan] = useState(['basico', 'profesional', 'business'].includes(planParam) ? planParam : 'basico')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const enviarCodigo = async () => {
    setError('')
    setLoading(true)
    try {
      const { res, data } = await apiFetch('/api/auth/enviar-codigo/', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      if (res.ok) setStep(2)
      else setError(data.error || tr.errSendCode)
    } catch {
      setError(tr.errConnection)
    } finally {
      setLoading(false)
    }
  }

  const verificarCodigo = async () => {
    setError('')
    setLoading(true)
    try {
      const { res, data } = await apiFetch('/api/auth/verificar-codigo/', {
        method: 'POST',
        body: JSON.stringify({ email, codigo }),
      })
      if (res.ok) setStep(3)
      else setError(data.error || tr.errCode)
    } catch {
      setError(tr.errConnection)
    } finally {
      setLoading(false)
    }
  }

  const crearCuenta = async () => {
    setError('')
    setLoading(true)
    try {
      const { res, data } = await apiFetch('/api/auth/registro/', {
        method: 'POST',
        body: JSON.stringify({ email, codigo, password, nombre, apellido, plan }),
      })
      if (res.ok) {
        // El dashboard hereda el idioma con el que se hizo el registro
        try { localStorage.setItem('aliwa-lang', lang) } catch { /* sin storage */ }
        navigate('/dashboard')
      } else {
        setError(data.error || tr.errCreate)
      }
    } catch {
      setError(tr.errConnection)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (step === 1) enviarCodigo()
    else if (step === 2) verificarCodigo()
    else if (step === 3) {
      if (password !== confirmPassword) { setError(tr.errPasswordMatch); return }
      if (password.length < 8) { setError(tr.errPasswordLen); return }
      crearCuenta()
    }
  }

  const stepTitles = {
    1: { h: tr.steps[1].h, p: tr.steps[1].p },
    2: { h: tr.steps[2].h, p: <>{tr.steps[2].pPre}<span className="text-on-surface font-medium">{email}</span></> },
    3: { h: tr.steps[3].h, p: tr.steps[3].p },
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Idioma + claro/oscuro */}
      <div className="fixed top-4 right-4 z-10 flex items-center gap-1">
        <button
          onClick={cambiarIdioma}
          title={isEn ? 'Cambiar a español' : 'Switch to English'}
          className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface px-2.5 py-2 rounded-xl font-display text-sm font-semibold transition-colors hover:bg-surface-container-high/50"
        >
          <Icon name="language" className="text-[18px] leading-none" />
          {isEn ? 'ES' : 'EN'}
        </button>
        <button
          onClick={toggleDark}
          title={dark ? (isEn ? 'Light mode' : 'Modo claro') : (isEn ? 'Dark mode' : 'Modo oscuro')}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors"
        >
          <Icon name={dark ? 'light_mode' : 'dark_mode'} className="text-[18px] leading-none" />
        </button>
      </div>
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-10">
        <div className="w-full max-w-[400px]">
          <a href={home} className="inline-flex items-center gap-2.5 mb-16">
            <AliwaIcon size={40} />
            <span className="text-2xl font-logo font-bold text-primary dark:text-on-background">Aliwa</span>
          </a>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-8 bg-primary' : s < step ? 'w-8 bg-accent' : 'w-8 bg-surface-container'
                }`}
              />
            ))}
          </div>

          <h1 className="font-display text-[32px] font-bold leading-tight mb-3">
            {stepTitles[step].h}
          </h1>
          <p className="text-sm leading-[1.7] text-on-surface-variant mb-10">
            {stepTitles[step].p}
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-error/10 text-error text-sm font-display">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 && (
              <div>
                <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                  {tr.emailLabel}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={tr.emailPlaceholder}
                  autoFocus
                  className="w-full bg-surface-container-high/50 rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            )}

            {step === 2 && (
              <div>
                <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                  {tr.codeLabel}
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  maxLength={6}
                  className="w-full bg-surface-container-high/50 rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all text-center tracking-[0.5em] text-lg"
                />
                <button
                  type="button"
                  onClick={enviarCodigo}
                  className="mt-3 text-xs font-display text-primary hover:underline"
                >
                  {tr.resendCode}
                </button>
              </div>
            )}

            {step === 3 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">{tr.firstNameLabel}</label>
                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={tr.firstNamePlaceholder} autoFocus
                      className="w-full bg-surface-container-high/50 rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">{tr.lastNameLabel}</label>
                    <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder={tr.lastNamePlaceholder}
                      className="w-full bg-surface-container-high/50 rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">{tr.passwordLabel}</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tr.passwordPlaceholder}
                      className="w-full bg-surface-container-high/50 rounded-2xl px-5 py-3.5 pr-12 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">{tr.confirmPasswordLabel}</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={tr.confirmPasswordPlaceholder}
                    className="w-full bg-surface-container-high/50 rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">{tr.planLabel}</label>
                  <div className="flex flex-col gap-2">
                    {planes.map((p) => (
                      <button key={p.slug} type="button" onClick={() => setPlan(p.slug)}
                        className={`w-full text-left px-5 py-3.5 rounded-2xl transition-all ${
                          plan === p.slug ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-surface-container hover:bg-surface-container-high'
                        }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-display font-semibold text-on-surface">{p.nombre}</span>
                          <span className="text-sm font-display font-semibold text-on-surface">{p.precio}<span className="text-on-surface-variant font-normal">{tr.perMonth}</span></span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                (step === 1 && !email) ||
                (step === 2 && codigo.length < 6) ||
                (step === 3 && (!nombre || !apellido || !password || !confirmPassword))
              }
              className="w-full bg-primary text-on-primary py-3.5 rounded-2xl font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? tr.loading : step === 1 ? tr.submit1 : step === 2 ? tr.submit2 : tr.submit3}
            </button>

            {step > 1 && (
              <button type="button" onClick={() => { setStep(step - 1); setError('') }}
                className="w-full py-3 text-sm font-display text-on-surface-variant hover:text-on-surface transition-colors">
                {tr.back}
              </button>
            )}
          </form>

          <p className="text-center mt-10 text-sm text-on-surface-variant">
            {tr.haveAccount}{' '}
            <a href={loginPath} className="text-primary font-display font-semibold hover:underline">{tr.login}</a>
          </p>
        </div>
      </div>

      {/* Right - Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-surface-container-high/40 rounded-l-[32px] relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-accent/8 blur-[100px]"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-purple/6 blur-[100px]"></div>
        <div className="relative z-10 max-w-md px-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-accent/10 mb-8">
            <Icon name="verified" className="text-accent text-[36px]" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-4">{tr.visualTitle}</h2>
          <p className="text-sm leading-[1.7] text-on-surface-variant">{tr.visualBody}</p>
        </div>
      </div>
    </div>
  )
}
