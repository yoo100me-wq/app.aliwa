import { useEffect, useState } from 'react'

// Página a la que Openpay redirige al terminar la autorización del comercio
// (OAuth 2.0 de partners). Se abre dentro del popup: reenvía el code (o el
// error) al dashboard que abrió la ventana y se cierra sola.
export default function OpenpayCallbackPage() {
  const [listo, setListo] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code') || ''
    const error = params.get('error') || ''
    if (window.opener) {
      window.opener.postMessage({ tipo: 'openpay-oauth', code, error }, window.location.origin)
      window.close()
    }
    setListo(true)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="font-display text-[15px] font-bold text-on-surface mb-1">Aliwa</p>
        <p className="text-[13px] font-body text-on-surface-variant">
          {listo
            ? 'Listo. Puedes cerrar esta ventana y volver a Aliwa. / Done. You can close this window and return to Aliwa.'
            : 'Procesando…'}
        </p>
      </div>
    </div>
  )
}
