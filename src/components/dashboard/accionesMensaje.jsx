import Icon from '../shared/Icon'

// Botones y listas que acompañan a un mensaje (plantillas e interactivos).
// TODO lo que las PINTA vive aquí: la burbuja del chat y las vistas previas de
// plantillas e interactivos usan esta pieza, así no vuelven a divergir.
// El parseo del contenido está en utils/accionesMensaje.js (separarAcciones).

/**
 * Acciones de un mensaje, DENTRO de la burbuja y separadas por divisorias a
 * todo lo ancho: los botones de respuesta se ven igual que el de una lista,
 * como una sola tarjeta continua (así los pinta WhatsApp; sueltos abajo se
 * veían como tres globos aparte).
 *
 * - `tituloLista`: una lista muestra UN botón con su título. Las opciones no
 *   se ven hasta que el cliente lo toca y se abre la hoja inferior.
 * - `botones`: strings o `{ texto, icono }`. Las plantillas distinguen enlace
 *   (open_in_new) y copiar código (content_copy) de la respuesta rápida (reply).
 * - `sangria`: cancela el padding horizontal de la burbuja que la contiene.
 */
export function AccionesBurbuja({
  botones = [], tituloLista = '', sangria = '-mx-2.5', onClickLista,
}) {
  const filas = tituloLista
    ? [{ texto: tituloLista, icono: 'list' }]
    : (botones || []).map((b) =>
        typeof b === 'string'
          ? { texto: b, icono: 'reply' }
          : { texto: b.texto, icono: b.icono || 'reply' }
      )

  if (!filas.length) return null

  // En la vista previa el botón de lista se puede tocar para ver la hoja de
  // opciones, igual que haría el cliente. En el chat no hay nada que abrir
  // (solo se guarda el título), así que va sin onClickLista y no es clicable.
  const clicable = Boolean(tituloLista && onClickLista)

  return (
    <>
      {filas.map((fila, i) => {
        const contenido = (
          <>
            <Icon name={fila.icono} className="text-[16px] leading-none" />
            <span className="truncate">{fila.texto}</span>
          </>
        )
        const claseFila =
          'w-full flex items-center justify-center gap-1.5 pt-1.5 pb-1 text-[13px] font-display font-semibold'
        return (
          <div key={`${fila.texto}-${i}`}>
            <div className={`h-px bg-current/20 ${sangria} ${i === 0 ? 'mt-1.5' : ''}`} />
            {clicable ? (
              <button type="button" onClick={onClickLista} className={`${claseFila} hover:opacity-80 transition-opacity`}>
                {contenido}
              </button>
            ) : (
              <div className={claseFila}>{contenido}</div>
            )}
          </div>
        )
      })}
    </>
  )
}
