// Formularios del editor, generados desde el catálogo.
//
// Un solo componente que lee `campos` y pinta el control que toca. La
// alternativa —un formulario escrito a mano por elemento— serían 12 archivos
// casi idénticos que hay que tocar cada vez que cambia el estilo de un input.
import Icon from '../shared/Icon'

const CLASE_INPUT =
  'w-full bg-surface-container-lowest border border-primary/25 hover:border-primary/50 ' +
  'px-3 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant ' +
  'outline-none focus:ring-2 focus:ring-primary/20 transition-all'

const CLASE_LABEL =
  'block text-[11px] font-display font-semibold text-on-surface-variant mb-1 tracking-wide uppercase'

// Deben coincidir con FUENTES de invitacion-aliwa/src/estiloTexto.js: una
// clave que no esté allá se ignora al pintar.
// Agrupadas: once opciones en una lista plana no se distinguen entre sí.
const FUENTES = [
  { grupo: 'Serif', fuentes: [
    { v: 'cormorant', n: 'Cormorant Garamond' },
    { v: 'playfair', n: 'Playfair Display' },
    { v: 'marcellus', n: 'Marcellus' },
    { v: 'lora', n: 'Lora' },
    { v: 'italiana', n: 'Italiana' },
  ]},
  { grupo: 'Sans', fuentes: [
    { v: 'josefin', n: 'Josefin Sans' },
    { v: 'raleway', n: 'Raleway' },
    { v: 'montserrat', n: 'Montserrat' },
  ]},
  { grupo: 'Manuscrita', fuentes: [
    { v: 'pinyon', n: 'Pinyon Script' },
    { v: 'greatvibes', n: 'Great Vibes' },
    { v: 'parisienne', n: 'Parisienne' },
  ]},
]

// Multiplicadores y no píxeles: cada texto trae su tamaño base y un valor
// absoluto los dejaría a todos iguales. En selector y no en botones porque con
// ocho pasos la fila de controles ya no cabía en el panel.
const TAMANOS = [
  { v: 0.6, n: 'Diminuto' }, { v: 0.75, n: 'Muy chico' }, { v: 0.88, n: 'Chico' },
  { v: 1, n: 'Normal' }, { v: 1.15, n: 'Mediano' }, { v: 1.35, n: 'Grande' },
  { v: 1.7, n: 'Muy grande' }, { v: 2.1, n: 'Enorme' }, { v: 2.5, n: 'Gigante' },
]

// Interruptores de tres estados: sin tocar hereda del diseño, y al tocarlos
// fijan sí o no. Hacen falta los tres porque hay textos que YA vienen en
// mayúsculas o en negritas desde el CSS y hay que poder apagarlos.
const MARCAS = [
  { k: 'mayus', n: 'AA', titulo: 'Mayúsculas' },
  { k: 'negrita', n: 'B', titulo: 'Negritas', clase: 'font-bold' },
  { k: 'cursiva', n: 'I', titulo: 'Cursiva', clase: 'italic font-serif' },
]

export default function CamposBloque({ campos, datos, onCambio }) {
  const set = (k, v) => onCambio({ ...datos, [k]: v })

  return (
    <div className="space-y-3">
      {campos.map((campo) => (
        <div key={campo.k}>
          {campo.tipo !== 'switch' && <label className={CLASE_LABEL}>{campo.label}</label>}
          {campo.tipo === 'soloEstilo' ? (
            // Solo la barra de estilo: el texto se escribe en otro lado (los
            // nombres y etiquetas viven dentro de la lista de personas).
            <BarraEstilo estilo={datos[`${campo.k}Estilo`]}
              onEstilo={(v) => set(`${campo.k}Estilo`, v)} />
          ) : campo.tipo === 'textoEstilado' ? (
            // Escribe DOS llaves: el texto y su estilo. Por eso no pasa por
            // <Control>, que solo maneja un valor.
            <CampoTextoEstilado
              multilinea={campo.multilinea}
              placeholder={campo.placeholder}
              texto={datos[campo.k]}
              estilo={datos[`${campo.k}Estilo`]}
              onTexto={(v) => set(campo.k, v)}
              onEstilo={(v) => set(`${campo.k}Estilo`, v)} />
          ) : (
            <Control campo={campo} valor={datos[campo.k]} onCambio={(v) => set(campo.k, v)} />
          )}
        </div>
      ))}
    </div>
  )
}

function Control({ campo, valor, onCambio }) {
  switch (campo.tipo) {
    case 'area':
      return (
        <textarea rows={3} value={valor || ''} placeholder={campo.placeholder}
          onChange={(e) => onCambio(e.target.value)}
          className={`${CLASE_INPUT} resize-none leading-relaxed`} />
      )

    case 'select':
      return (
        <select value={valor ?? campo.opciones[0].v}
          onChange={(e) => {
            // Los <option> devuelven string siempre; si el catálogo declaró
            // números (columnas: 1|2), hay que regresarlos a número o el
            // renderizador arma la clase `--1` con un "1" que no compara.
            const crudo = e.target.value
            const orig = campo.opciones.find((o) => String(o.v) === crudo)
            onCambio(orig ? orig.v : crudo)
          }}
          className={CLASE_INPUT}>
          {campo.opciones.map((o) => <option key={o.v} value={o.v}>{o.n}</option>)}
        </select>
      )

    case 'switch':
      return (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={!!valor} onChange={(e) => onCambio(e.target.checked)}
            className="accent-primary w-4 h-4" />
          <span className="text-[13px] text-on-surface">{campo.label}</span>
        </label>
      )

    case 'color':
      return <CampoColor valor={valor} onCambio={onCambio} etiqueta={campo.vacio} />

    case 'imagen':
      return <CampoImagen valor={valor} onCambio={onCambio} />

    case 'lista':
      return <CampoLista campo={campo} valor={valor} onCambio={onCambio} />

    case 'personas':
      return <CampoPersonas valor={valor} onCambio={onCambio} />

    default:
      return (
        <input type="text" value={valor || ''} placeholder={campo.placeholder}
          onChange={(e) => onCambio(e.target.value)} className={CLASE_INPUT} />
      )
  }
}

// --- color ------------------------------------------------------------------

// Se comparte con el control de texto estilado. `undefined` significa "el del
// tema", que el <input type=color> no sabe representar: por eso la ✕ aparte.
export function CampoColor({ valor, onCambio, etiqueta = 'Color del tema' }) {
  const hay = typeof valor === 'string' && valor.startsWith('#')
  return (
    <div className="flex items-center gap-2">
      <label title={hay ? valor : etiqueta}
        className={`relative shrink-0 w-[34px] h-[34px] border cursor-pointer overflow-hidden transition-colors ${
          hay ? 'border-primary/40' : 'border-primary/25 hover:border-primary/50'}`}
        style={hay ? { background: valor } : undefined}>
        {!hay && (
          <Icon name="palette"
            className="absolute inset-0 m-auto w-fit h-fit text-on-surface-variant text-[16px] leading-none" />
        )}
        <input type="color" value={hay ? valor : '#3c2c50'}
          onChange={(e) => onCambio(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer" />
      </label>
      <span className="flex-1 min-w-0 text-[12px] text-on-surface-variant truncate">
        {hay ? valor : etiqueta}
      </span>
      {hay && (
        <button type="button" onClick={() => onCambio(undefined)} title="Volver al del tema"
          className="shrink-0 p-1.5 text-on-surface-variant hover:text-error transition-colors">
          <Icon name="close" className="text-[15px] leading-none" />
        </button>
      )}
    </div>
  )
}

// --- imagen -----------------------------------------------------------------

function CampoImagen({ valor, onCambio }) {
  const elegir = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Tope bajo a propósito: hoy la imagen viaja como base64 dentro del JSON de
    // la invitación, que tiene su propio límite de 256KB en el backend. Cuando
    // exista el bucket de Supabase esto pasa a ser una URL y sube el tope.
    if (file.size > 120 * 1024) {
      alert('Por ahora la imagen debe pesar menos de 120 KB')
      return
    }
    const r = new FileReader()
    r.onload = () => onCambio(String(r.result))
    r.readAsDataURL(file)
  }

  return (
    <div className="flex items-center gap-2">
      <label className="w-[64px] h-[44px] shrink-0 border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 flex items-center justify-center cursor-pointer transition-colors overflow-hidden">
        {valor
          ? <img src={valor} alt="" className="w-full h-full object-cover" />
          : <Icon name="add_photo_alternate" className="text-on-surface-variant text-[18px] leading-none" />}
        <input type="file" accept="image/*" onChange={elegir} className="hidden" />
      </label>
      <input type="text" value={valor?.startsWith('data:') ? '' : (valor || '')}
        placeholder="…o pega una liga https://"
        onChange={(e) => onCambio(e.target.value)} className={CLASE_INPUT} />
      {valor && (
        <button type="button" onClick={() => onCambio('')} title="Quitar"
          className="shrink-0 p-1.5 text-on-surface-variant hover:text-error transition-colors">
          <Icon name="close" className="text-[16px] leading-none" />
        </button>
      )}
    </div>
  )
}

// --- lista de renglones (itinerario, línea del tiempo) ----------------------

function CampoLista({ campo, valor, onCambio }) {
  const filas = Array.isArray(valor) ? valor : []
  const cambiar = (i, k, v) =>
    onCambio(filas.map((f, j) => (j === i ? { ...f, [k]: v } : f)))

  return (
    <div className="space-y-1.5">
      {filas.map((fila, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {campo.subcampos.map((sc) => (
            <input key={sc.k} type="text" value={fila[sc.k] || ''} placeholder={sc.label}
              onChange={(e) => cambiar(i, sc.k, e.target.value)}
              className={`${CLASE_INPUT} ${sc.ancho === 'corto' ? 'w-[86px] shrink-0' : 'flex-1 min-w-0'}`} />
          ))}
          <button type="button" onClick={() => onCambio(filas.filter((_, j) => j !== i))}
            title="Quitar" className="shrink-0 p-1.5 text-on-surface-variant hover:text-error transition-colors">
            <Icon name="close" className="text-[16px] leading-none" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onCambio([...filas, {}])}
        className="w-full border border-dashed border-outline-variant hover:border-primary/50 hover:bg-primary/5 py-1.5 text-[12px] font-display font-semibold text-on-surface-variant transition-colors flex items-center justify-center gap-1.5">
        <Icon name="add" className="text-[15px] leading-none" />
        Agregar
      </button>
    </div>
  )
}

// --- personas con etiqueta --------------------------------------------------

function CampoPersonas({ valor, onCambio }) {
  const filas = Array.isArray(valor) ? valor : []
  const cambiar = (i, k, v) =>
    onCambio(filas.map((f, j) => (j === i ? { ...f, [k]: v } : f)))

  return (
    <div className="space-y-1.5">
      {filas.length === 0 && (
        <p className="text-[12px] text-outline-variant py-1">
          Sin personas: se usan los anfitriones del evento.
        </p>
      )}
      {filas.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input type="text" value={p.etiqueta || ''} placeholder="Etiqueta"
            onChange={(e) => cambiar(i, 'etiqueta', e.target.value)}
            className={`${CLASE_INPUT} w-[118px] shrink-0`} />
          <input type="text" value={p.nombre || ''} placeholder="Nombre"
            onChange={(e) => cambiar(i, 'nombre', e.target.value)}
            className={`${CLASE_INPUT} flex-1 min-w-0`} />
          <button type="button" onClick={() => onCambio(filas.filter((_, j) => j !== i))}
            title="Quitar" className="shrink-0 p-1.5 text-on-surface-variant hover:text-error transition-colors">
            <Icon name="close" className="text-[16px] leading-none" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onCambio([...filas, { etiqueta: '', nombre: '' }])}
        className="w-full border border-dashed border-outline-variant hover:border-primary/50 hover:bg-primary/5 py-1.5 text-[12px] font-display font-semibold text-on-surface-variant transition-colors flex items-center justify-center gap-1.5">
        <Icon name="add" className="text-[15px] leading-none" />
        Agregar persona
      </button>
    </div>
  )
}


// --- texto con color, tamaño y tipografía ----------------------------------

function CampoTextoEstilado({ placeholder, multilinea, texto, estilo, onTexto, onEstilo }) {
  return (
    <div className="space-y-1.5">
      {multilinea ? (
        <textarea rows={3} value={texto || ''} placeholder={placeholder}
          onChange={(ev) => onTexto(ev.target.value)}
          className={`${CLASE_INPUT} resize-none leading-relaxed`} />
      ) : (
        <input type="text" value={texto || ''} placeholder={placeholder}
          onChange={(ev) => onTexto(ev.target.value)} className={CLASE_INPUT} />
      )}
      <BarraEstilo estilo={estilo} onEstilo={onEstilo} />
    </div>
  )
}

// Color · mayúsculas · negritas · cursiva · tamaño · tipografía.
// Se usa suelta cuando el texto no se escribe en el mismo lugar.
function BarraEstilo({ estilo, onEstilo }) {
  const e = estilo || {}
  const set = (k, v) => onEstilo({ ...e, [k]: v })
  // Sin color elegido el texto usa el del tema; el selector nativo no sabe
  // representar "ninguno", así que se marca aparte con el ícono.
  const hayColor = typeof e.color === 'string' && e.color.startsWith('#')

  return (
    <div className="flex items-center flex-wrap gap-1.5">
        <label
          title={hayColor ? 'Color elegido' : 'Color del tema'}
          className={`relative shrink-0 w-[34px] h-[34px] border cursor-pointer overflow-hidden transition-colors ${
            hayColor ? 'border-primary/40' : 'border-primary/25 hover:border-primary/50'}`}
          style={hayColor ? { background: e.color } : undefined}>
          {!hayColor && (
            <Icon name="palette"
              className="absolute inset-0 m-auto w-fit h-fit text-on-surface-variant text-[16px] leading-none" />
          )}
          <input type="color" value={hayColor ? e.color : '#3c2c50'}
            onChange={(ev) => set('color', ev.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>

        {hayColor && (
          <button type="button" title="Volver al color del tema"
            onClick={() => set('color', undefined)}
            className="shrink-0 p-1.5 text-on-surface-variant hover:text-error transition-colors">
            <Icon name="close" className="text-[15px] leading-none" />
          </button>
        )}

        <div className="flex shrink-0 border border-primary/25">
          {MARCAS.map((m) => {
            const v = e[m.k]
            return (
              <button key={m.k} type="button" title={`${m.titulo}${v === undefined ? '' : v ? ' (activo)' : ' (apagado)'}`}
                // Ciclo: hereda → sí → no → hereda
                onClick={() => set(m.k, v === undefined ? true : v ? false : undefined)}
                className={`w-[30px] h-[32px] text-[11px] font-display transition-colors ${m.clase || 'font-semibold'} ${
                  v === true ? 'bg-primary/10 text-primary'
                    : v === false ? 'text-outline-variant line-through'
                    : 'text-on-surface-variant hover:bg-surface-container-high/60'}`}>
                {m.n}
              </button>
            )
          })}
        </div>

        <select value={e.tam ?? 1} onChange={(ev) => set('tam', Number(ev.target.value))}
          title="Tamaño"
          className={`${CLASE_INPUT} w-[104px] shrink-0 h-[34px] py-0 text-[12px]`}>
          {TAMANOS.map((t) => <option key={t.v} value={t.v}>{t.n}</option>)}
        </select>

        <select value={e.fuente || ''} onChange={(ev) => set('fuente', ev.target.value || undefined)}
          title="Tipografía"
          className={`${CLASE_INPUT} flex-1 min-w-[132px] h-[34px] py-0 text-[12px]`}>
          <option value="">Por defecto</option>
          {FUENTES.map((g) => (
            <optgroup key={g.grupo} label={g.grupo}>
              {g.fuentes.map((f) => <option key={f.v} value={f.v}>{f.n}</option>)}
            </optgroup>
          ))}
        </select>
    </div>
  )
}
