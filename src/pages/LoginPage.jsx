import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/shared/Icon'
import AliwaIcon from '../components/shared/AliwaIcon'
import { apiFetch } from '../utils/api'
import WaitlistModal from '../components/landing/WaitlistModal'
import { useT } from '../i18n'

export default function LoginPage() {
  const navigate = useNavigate()
  const { lang, t } = useT()
  const tl = t.login
  const home = lang === 'en' ? '/en' : '/'
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
    <div className="min-h-screen bg-background flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-10">
        <div className="w-full max-w-[400px]">
          <a href={home} className="inline-flex items-center gap-2.5 mb-16">
            <AliwaIcon size={40} />
            <span className="text-2xl font-logo font-bold text-primary">Aliwa</span>
          </a>

          <h1 className="font-display text-[32px] font-bold leading-tight mb-3">
            {tl.title}
          </h1>
          <p className="text-sm leading-[1.7] text-on-surface-variant mb-10">
            {tl.subtitle}
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 text-red-400 text-sm font-display">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                {tl.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tl.emailPlaceholder}
                autoFocus
                className="w-full bg-surface-container rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                {tl.passwordLabel}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container rounded-2xl px-5 py-3.5 pr-12 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
              className="w-full bg-primary text-on-primary py-3.5 rounded-2xl font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? tl.loading : tl.submit}
            </button>
          </form>

          <p className="text-center mt-10 text-sm text-on-surface-variant">
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
