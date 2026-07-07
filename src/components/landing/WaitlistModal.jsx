import { useState, useEffect } from 'react'
import Icon from '../shared/Icon'
import AliwaIcon from '../shared/AliwaIcon'
import { apiFetch } from '../../utils/api'
import { useT } from '../../i18n'

export default function WaitlistModal() {
  const { t } = useT()
  const tw = t.waitlist
  const [open, setOpen] = useState(false)
  const [contacto, setContacto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onOpen = () => { setOpen(true); setEnviado(false); setError('') }
    window.addEventListener('open-waitlist', onOpen)
    return () => window.removeEventListener('open-waitlist', onOpen)
  }, [])

  if (!open) return null

  const cerrar = () => { setOpen(false); setContacto('') }

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const { res } = await apiFetch('/api/interesados/', {
        method: 'POST',
        body: JSON.stringify({ contacto, origen: 'landing' }),
      })
      if (res.ok) {
        setEnviado(true)
        setContacto('')
      } else {
        setError(tw.errorRegister)
      }
    } catch {
      setError(tw.errorConnection)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={cerrar}
    >
      <div
        className="bg-surface-container-lowest rounded-3xl p-8 md:p-10 max-w-md w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={cerrar}
          aria-label={tw.close}
          className="absolute top-5 right-5 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <Icon name="close" className="text-[22px] leading-none" />
        </button>

        {enviado ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-5">
              <Icon name="check" className="text-on-accent text-[28px]" />
            </div>
            <h3 className="font-display text-2xl font-bold mb-2">{tw.successTitle}</h3>
            <p className="text-[15px] leading-[1.6] text-on-surface-variant">
              {tw.successBodyPre}<span className="font-semibold text-primary">{tw.successBodyStrong}</span>{tw.successBodyPost}
            </p>
            <button
              onClick={cerrar}
              className="mt-6 bg-primary text-on-primary px-6 py-3 rounded-2xl font-display font-semibold transition-all active:scale-[0.98]"
            >
              {tw.close}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <AliwaIcon size={48} />
            </div>

            <h3 className="font-display text-2xl font-bold leading-tight mb-2">
              {tw.titlePre}<span className="text-primary">{tw.titleStrong}</span>
            </h3>
            <p className="text-[15px] leading-[1.6] text-on-surface-variant mb-4">
              {tw.body}
            </p>
            <div className="flex items-center gap-2 bg-accent/20 text-on-surface rounded-2xl px-4 py-3 mb-6">
              <Icon name="redeem" className="text-[22px] text-primary leading-none shrink-0" />
              <p className="text-[13px] font-display font-semibold leading-snug">
                {tw.incentivePre}<span className="text-primary">{tw.incentiveStrong}</span>{tw.incentivePost}
              </p>
            </div>

            <form onSubmit={enviar} className="space-y-3">
              <input
                type="text"
                required
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder={tw.placeholder}
                className="w-full bg-surface-container rounded-2xl px-4 py-3.5 text-[15px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {error && <p className="text-[13px] text-error font-display">{error}</p>}
              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-accent text-on-accent py-3.5 rounded-2xl font-display font-semibold transition-all active:scale-[0.98] hover:bg-accent-dim disabled:opacity-60"
              >
                {enviando ? tw.sending : tw.submit}
              </button>
            </form>

            <p className="text-[12px] text-on-surface-variant/60 text-center mt-4">
              {tw.noSpam}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
