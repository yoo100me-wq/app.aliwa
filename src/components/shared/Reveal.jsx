import useScrollReveal from '../../hooks/useScrollReveal'

export default function Reveal({ children, className = '', delay = 0 }) {
  const [ref, isVisible] = useScrollReveal(0.1)

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}
