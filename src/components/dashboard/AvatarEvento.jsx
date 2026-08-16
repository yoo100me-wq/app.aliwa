// Avatar de un evento.
//
// Muestra la imagen que subió la anfitriona si existe; si no, el ícono de
// fiesta como predeterminado.
import Icon from '../shared/Icon'

export default function AvatarEvento({ evento, size = 32, className = '' }) {
  const lado = { width: size, height: size }
  const tamIcono = size <= 28 ? 'text-[15px]' : size <= 32 ? 'text-[17px]' : 'text-[20px]'

  if (evento?.imagen_url) {
    return (
      <img
        src={evento.imagen_url}
        alt=""
        style={lado}
        className={`rounded-xl object-cover shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      style={lado}
      className={`rounded-xl bg-purple/10 flex items-center justify-center shrink-0 ${className}`}
    >
      {/* Icon no reenvía `style`, así que el tamaño va por clase */}
      <Icon name="celebration" className={`text-purple leading-none ${tamIcono}`} />
    </div>
  )
}
