// Ajustes globales de Material Symbols: optical 20, grade -25, weight 400.
export default function Icon({ name, fill = false, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' -25, 'opsz' 20` }}
    >
      {name}
    </span>
  )
}
