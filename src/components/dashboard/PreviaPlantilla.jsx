import { useLang } from '../../i18n-app'
import { AccionesBurbuja } from './accionesMensaje'

// Burbuja de plantilla estilo WhatsApp, con las CUATRO partes del mensaje:
// encabezado, cuerpo, pie y botones. La usan la sección Plantillas y el panel
// de envío desde el chat; antes cada una tenía su propia versión y la del
// envío solo pintaba el cuerpo, así que la plantilla se veía incompleta.
//
// `alto`: clase de altura para fijar el espacio (p.ej. 'h-40'). Sin ella el
// recuadro crece con el contenido.
export default function PreviaPlantilla({ encabezado, cuerpo, pie, botones, alto = '' }) {
  const { t } = useLang()
  const tp = t.plantillas

  return (
    // Sobre el lienzo del chat y con la burbuja PROPIA (verde): la plantilla es
    // un mensaje que enviamos, así se ve igual que en la conversación.
    <div className={`bg-lienzo-chat rounded-lg p-3 flex flex-col items-end justify-end ${alto} ${alto ? 'overflow-y-auto' : ''}`}>
      <div className="max-w-[90%] min-w-0">
        <div className="bg-burbuja-propia text-on-burbuja-propia rounded-lg rounded-tr-none shadow-sm px-2.5 py-1.5">
          {encabezado && (
            <p className="text-[13px] font-body font-bold mb-1">{encabezado}</p>
          )}
          <p className="text-[13px] font-body whitespace-pre-wrap leading-relaxed break-words">
            {cuerpo || tp.previaCuerpoVacio}
          </p>
          {/* Pie y hora heredan el color de la burbuja y solo bajan opacidad
              (on-surface-variant era invisible sobre el verde). */}
          {pie && <p className="text-[11px] opacity-60 mt-1.5">{pie}</p>}
          <p className="text-[10px] opacity-60 text-right mt-0.5">10:30</p>
          <AccionesBurbuja
            botones={(botones || []).map((b) => {
              const texto = typeof b === 'string' ? b : b.texto
              const tipo = typeof b === 'string' ? 'rapida' : b.tipo
              return {
                texto,
                icono: texto === tp.copiarCodigo ? 'content_copy'
                  : tipo === 'enlace' ? 'open_in_new' : 'reply',
              }
            })}
          />
        </div>
      </div>
    </div>
  )
}
