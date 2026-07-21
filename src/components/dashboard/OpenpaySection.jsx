import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../../utils/api'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'

// Paso "Openpay" de la guía de inicio: el negocio autoriza a Aliwa (OAuth 2.0
// de partners) en un popup de Openpay. El popup redirige a /openpay-callback,
// que reenvía el code por postMessage; aquí se intercambia por las llaves del
// comercio vía el backend.
export default function OpenpaySection({ negocio, onConectado, onSiguiente, onOmitir }) {
  const { t } = useLang()
  const to = t.openpay
  const [conectando, setConectando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)
  const limpiarRef = useRef(null)

  // Si el componente se desmonta con el popup abierto, soltar listener/intervalo
  useEffect(() => () => limpiarRef.current?.(), [])

  const conectado = !!negocio?.openpay_conectado || !!resultado
  const sandbox = resultado ? !!resultado.sandbox : !!negocio?.openpay_sandbox

  const conectar = async () => {
    setError('')
    const { res, data } = await apiFetch('/api/pagos/openpay/oauth-config/')
    if (!res.ok) {
      setError(data?.error || to.errConectar)
      return
    }

    const w = 540
    const h = 760
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - w) / 2))
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - h) / 2))
    const popup = window.open(
      data.authorize_url,
      'aliwa-openpay',
      `popup=yes,width=${w},height=${h},left=${left},top=${top}`,
    )
    if (!popup) {
      setError(to.errPopup)
      return
    }
    setConectando(true)

    let intervalo = null
    const finalizar = () => {
      window.removeEventListener('message', onMensaje)
      if (intervalo) clearInterval(intervalo)
      limpiarRef.current = null
      setConectando(false)
    }
    limpiarRef.current = finalizar

    const onMensaje = async (e) => {
      if (e.origin !== window.location.origin || e.data?.tipo !== 'openpay-oauth') return
      window.removeEventListener('message', onMensaje)
      if (intervalo) clearInterval(intervalo)
      limpiarRef.current = null
      try { popup.close() } catch { /* ya cerrado */ }

      const { code, error: err } = e.data
      if (!code) {
        setConectando(false)
        setError(err === 'access_denied' ? to.errCancelado : to.errConectar)
        return
      }
      setGuardando(true)
      try {
        const { res: r2, data: d2 } = await apiFetch('/api/pagos/openpay/conectar/', {
          method: 'POST',
          body: JSON.stringify({ code, negocio_id: negocio?.id }),
        })
        if (r2.ok) {
          setResultado(d2)
          onConectado?.()
        } else {
          setError(d2?.error || to.errConectar)
        }
      } catch {
        setError(to.errConectar)
      } finally {
        setGuardando(false)
        setConectando(false)
      }
    }
    window.addEventListener('message', onMensaje)

    // Si cierran el popup sin autorizar, liberar el botón. El postMessage del
    // callback llega asíncrono justo antes de que el popup se cierre, así que
    // se da un margen antes de dar por cancelado el flujo.
    intervalo = setInterval(() => {
      if (popup.closed) {
        if (intervalo) clearInterval(intervalo)
        intervalo = null
        setTimeout(() => limpiarRef.current?.(), 1500)
      }
    }, 800)
  }

  if (conectado) {
    return (
      <div className="border border-outline-variant bg-surface-container rounded-2xl p-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/20 mb-4">
          <Icon name="check_circle" className="text-on-surface text-[22px]" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-display text-[15px] font-bold">{to.conectadoTitulo}</h2>
          {sandbox && (
            <span className="text-[11px] font-display font-semibold uppercase tracking-wide bg-purple/10 text-purple px-2 py-0.5 rounded-full">
              {to.sandbox}
            </span>
          )}
        </div>
        <p className="text-[13px] font-body text-on-surface-variant mb-1">{to.conectadoDesc}</p>
        {resultado?.merchant_id && (
          <p className="text-[12px] font-body text-on-surface-variant mb-4">
            {to.comercio}: <span className="font-display font-semibold">{resultado.merchant_id}</span>
          </p>
        )}
        {error && (
          <div className="bg-error/10 text-error text-[13px] font-body rounded-lg px-3 py-2 mb-4">{error}</div>
        )}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={onSiguiente}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 flex items-center gap-1.5"
          >
            {to.siguiente}
            <Icon name="arrow_forward" className="text-[15px]" />
          </button>
          <button
            onClick={conectar}
            disabled={conectando || guardando}
            className="text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
          >
            {conectando || guardando ? to.conectando : to.reconectar}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-outline-variant bg-surface-container rounded-2xl p-8">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple/8 mb-4">
        <Icon name="account_balance" className="text-purple text-[22px]" />
      </div>
      <h2 className="font-display text-[15px] font-bold mb-1">{to.titulo}</h2>
      <p className="text-[13px] font-body text-on-surface-variant mb-4">{to.desc}</p>
      <ul className="space-y-1.5 mb-4">
        {to.puntos.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[13px] font-body text-on-surface">
            <Icon name="check" className="text-purple text-[16px] mt-px" />
            {p}
          </li>
        ))}
      </ul>
      <p className="text-[12px] font-body text-on-surface-variant mb-4">{to.avisoPopup}</p>
      {error && (
        <div className="bg-error/10 text-error text-[13px] font-body rounded-lg px-3 py-2 mb-4">{error}</div>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={conectar}
          disabled={conectando || guardando}
          className="bg-accent text-on-accent px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Icon name="account_balance_wallet" className="text-[16px]" />
          {guardando ? to.guardando : conectando ? to.conectando : to.conectar}
        </button>
        <button
          onClick={onOmitir}
          className="text-[13px] font-display text-on-surface-variant hover:text-on-surface transition-colors"
        >
          {to.omitir}
        </button>
      </div>
    </div>
  )
}
