import { useState } from 'react'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'
import PanelLateral from './PanelLateral'
import useErrorToast from '../../hooks/useErrorToast'

// Envío de una ubicación al cliente (el mapa que WhatsApp pinta en el chat).
// Vive en el panel derecho, como plantillas e interactivos.
export default function EnviarUbicacionPanel({ onEnviar, onClose }) {
  const { t } = useLang()
  const tu = t.chats.ubicacion
  const [latitud, setLatitud] = useState('')
  const [longitud, setLongitud] = useState('')
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ubicando, setUbicando] = useState(false)
  const [error, setError] = useState('')
  useErrorToast(error, setError)

  const campo =
    'w-full bg-surface-container-high/50 rounded-lg px-3 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none'
  const label = 'block text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1'

  const valido = latitud.trim() !== '' && longitud.trim() !== ''
    && Number.isFinite(Number(latitud)) && Number.isFinite(Number(longitud))

  // El negocio casi siempre manda SU propio local: el navegador resuelve las
  // coordenadas sin que nadie tenga que buscarlas en un mapa.
  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setError(tu.sinGeolocalizacion)
      return
    }
    setUbicando(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitud(coords.latitude.toFixed(6))
        setLongitud(coords.longitude.toFixed(6))
        setUbicando(false)
      },
      () => {
        setError(tu.sinGeolocalizacion)
        setUbicando(false)
      },
      { timeout: 10000 },
    )
  }

  const enviar = async () => {
    if (!valido) {
      setError(tu.faltanCoordenadas)
      return
    }
    setEnviando(true)
    setError('')
    const r = await onEnviar({
      latitud: Number(latitud),
      longitud: Number(longitud),
      nombre: nombre.trim(),
      direccion: direccion.trim(),
    })
    if (r?.ok) {
      onClose()
    } else {
      setError(r?.error || tu.error)
      setEnviando(false)
    }
  }

  return (
    <PanelLateral titulo={tu.titulo} onClose={onClose} flotante>
      <div className="space-y-3">
        <button
          type="button"
          onClick={usarMiUbicacion}
          disabled={ubicando}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high/50 text-[13px] font-display font-semibold text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40"
        >
          <Icon
            name={ubicando ? 'hourglass_empty' : 'my_location'}
            className={`text-[15px] leading-none ${ubicando ? 'animate-pulse' : ''}`}
          />
          {tu.usarMiUbicacion}
        </button>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className={label}>{tu.latitud}</label>
            <input
              className={campo}
              inputMode="decimal"
              placeholder="19.432608"
              value={latitud}
              onChange={(e) => setLatitud(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className={label}>{tu.longitud}</label>
            <input
              className={campo}
              inputMode="decimal"
              placeholder="-99.133209"
              value={longitud}
              onChange={(e) => setLongitud(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={label}>{tu.nombre}</label>
          <input
            className={campo}
            maxLength={256}
            placeholder={tu.nombrePlaceholder}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div>
          <label className={label}>{tu.direccion}</label>
          <input
            className={campo}
            maxLength={256}
            placeholder={tu.direccionPlaceholder}
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />
        </div>

        <button
          onClick={enviar}
          disabled={!valido || enviando}
          className="flex items-center gap-1.5 px-4 py-2 border border-primary text-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:bg-primary/5 disabled:opacity-40"
        >
          <Icon name="send" className="text-[15px] leading-none" />
          {enviando ? tu.enviando : tu.enviar}
        </button>
      </div>
    </PanelLateral>
  )
}
