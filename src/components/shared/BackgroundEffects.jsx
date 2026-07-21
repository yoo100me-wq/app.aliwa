export function GradientBlob({ color = 'purple', size = 400, top, left, right, bottom, opacity = 0.07 }) {
  const colors = {
    purple: '#8a8a8f',
    blue: '#3f3f44',
    accent: '#6C36FF',
  }

  const style = {
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${colors[color]}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
    filter: 'blur(80px)',
    pointerEvents: 'none',
    ...(top !== undefined && { top }),
    ...(left !== undefined && { left }),
    ...(right !== undefined && { right }),
    ...(bottom !== undefined && { bottom }),
  }

  return <div style={style} />
}

export function DotGrid({ className = '' }) {
  return (
    <div
      className={`absolute pointer-events-none ${className}`}
      style={{
        backgroundImage: 'radial-gradient(circle, #8a8a8f 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        opacity: 0.06,
      }}
    />
  )
}

export function FloatingDots({ count = 12, area = { top: 0, left: 0, width: '100%', height: '100%' } }) {
  const dots = Array.from({ length: count }, (_, i) => {
    const seed = (i * 7 + 13) % 100
    const seed2 = (i * 11 + 23) % 100
    const size = 3 + (seed % 5)
    const isPurple = i % 3 !== 0
    return {
      key: i,
      top: `${seed}%`,
      left: `${seed2}%`,
      size,
      color: isPurple ? '#8a8a8f' : '#6C36FF',
      opacity: 0.12 + (seed % 15) / 100,
      delay: i * 0.5,
    }
  })

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={area}>
      {dots.map((dot) => (
        <div
          key={dot.key}
          className="absolute rounded-full"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            backgroundColor: dot.color,
            opacity: dot.opacity,
          }}
        />
      ))}
    </div>
  )
}
