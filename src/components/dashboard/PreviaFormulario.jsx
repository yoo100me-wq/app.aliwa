import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'

// La hoja que WhatsApp abre sobre la conversación. Los campos los dibuja
// WhatsApp, no nosotros: esta previa IMITA su apariencia nativa (cajas con
// contorno y etiqueta flotante, círculos para opción única, casillas para
// múltiple) para que el negocio vea lo que va a recibir su cliente.
//
// Por eso NO sigue las reglas del dashboard (esquinas rectas, paleta Aliwa):
// aquí manda parecerse a WhatsApp.

const VERDE_WA = '#00a884'

function Etiqueta({ texto, requerido }) {
  return (
    <>
      {texto}
      {requerido && <span className="text-error"> *</span>}
    </>
  )
}

// Caja con contorno y la etiqueta encimada en el borde superior
function CampoCaja({ campo, alto = false }) {
  return (
    <div className={`relative border border-outline rounded-md px-3 ${alto ? 'pt-3 pb-8' : 'py-2.5'}`}>
      <span className="absolute -top-2 left-2 px-1 bg-surface-container-lowest text-[10px] text-on-surface-variant">
        <Etiqueta texto={campo.etiqueta || '—'} requerido={campo.requerido} />
      </span>
    </div>
  )
}

function CampoOpciones({ campo, redondo }) {
  const opciones = campo.opciones?.length ? campo.opciones : ['—']
  return (
    <div>
      <p className="text-[11px] text-on-surface-variant mb-1.5">
        <Etiqueta texto={campo.etiqueta || '—'} requerido={campo.requerido} />
      </p>
      {opciones.map((op, i) => (
        <div key={`${op}-${i}`} className="flex items-center gap-2.5 py-1">
          <span
            className={`w-4 h-4 border-2 border-outline shrink-0 ${redondo ? 'rounded-full' : 'rounded-sm'}`}
            style={i === 0 && redondo ? { borderColor: VERDE_WA, backgroundColor: VERDE_WA, boxShadow: 'inset 0 0 0 2.5px var(--previa-fondo, #fff)' } : undefined}
          />
          <span className="text-[12px] truncate">{op}</span>
        </div>
      ))}
    </div>
  )
}

function CampoFila({ campo }) {
  return (
    <div className="flex items-center justify-between border border-outline rounded-md px-3 py-2.5">
      <span className="text-[12px] text-on-surface-variant truncate">
        <Etiqueta texto={campo.etiqueta || '—'} requerido={campo.requerido} />
      </span>
      <Icon name="expand_more" className="text-[16px] leading-none text-on-surface-variant shrink-0" />
    </div>
  )
}

function CampoCasilla({ campo }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-4 h-4 mt-0.5 border-2 border-outline rounded-sm shrink-0" />
      <span className="text-[12px] leading-snug">
        <Etiqueta texto={campo.etiqueta || '—'} requerido={campo.requerido} />
      </span>
    </div>
  )
}

export default function PreviaFormulario({ titulo, campos = [], boton }) {
  const { t } = useLang()
  const tf = t.formularios

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      {/* Barra de la hoja: ✕ a la izquierda, título centrado */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-outline-variant">
        <Icon name="close" className="text-[16px] leading-none text-on-surface-variant shrink-0" />
        <p className="flex-1 text-center text-[12px] font-display font-semibold truncate">
          {titulo?.trim() || tf.previaTitulo}
        </p>
        <span className="w-4 shrink-0" />
      </div>

      <div className="px-3.5 py-4 space-y-3.5 max-h-[420px] overflow-y-auto">
        {campos.length === 0 ? (
          <p className="text-[12px] text-on-surface-variant text-center py-6">{tf.sinCampos}</p>
        ) : (
          campos.map((campo, i) => {
            const clave = `${campo.tipo}-${i}`
            if (campo.tipo === 'opciones') return <CampoOpciones key={clave} campo={campo} redondo />
            if (campo.tipo === 'multiple') return <CampoOpciones key={clave} campo={campo} />
            if (campo.tipo === 'lista' || campo.tipo === 'fecha') return <CampoFila key={clave} campo={campo} />
            if (campo.tipo === 'aceptacion') return <CampoCasilla key={clave} campo={campo} />
            return <CampoCaja key={clave} campo={campo} alto={campo.tipo === 'parrafo'} />
          })
        )}

        {/* Botón verde de WhatsApp: color literal de la app, no de la paleta */}
        <div
          className="rounded-full py-2.5 text-center text-[12.5px] font-display font-semibold text-white mt-1"
          style={{ backgroundColor: VERDE_WA }}
        >
          {boton?.trim() || tf.previaBoton}
        </div>
        <p className="text-[10px] text-on-surface-variant text-center">{tf.gestionadoPor}</p>
      </div>
    </div>
  )
}
