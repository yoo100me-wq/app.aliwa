// Diseño del Flow de confirmación.
//
// Estas preguntas NO viven en la página de la invitación: esa es de solo
// lectura. Aparecen dentro de WhatsApp, en el Flow que se abre cuando la
// invitada toca «Quiero confirmar». Por eso la sección está en Invitados y no
// en Invitación.
//
// Se guardan en `eventos.formulario` (JSONB). El `id` de cada pregunta es la
// llave con la que se guarda la respuesta en `invitados.respuestas`, y el
// backend descarta cualquier respuesta cuyo id no esté declarado aquí.
import { useState } from 'react'
import Icon from '../shared/Icon'
import { apiFetch } from '../../utils/api'

const CLASE_INPUT =
  'w-full bg-surface-container-lowest border border-primary/25 hover:border-primary/50 ' +
  'px-2.5 py-1.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant ' +
  'outline-none focus:ring-2 focus:ring-primary/20 transition-all'

// Solo los controles que WhatsApp Flows sabe pintar. Inventar otros aquí
// obligaría a traducirlos a algo distinto al publicar el Flow.
const TIPOS = [
  { v: 'texto', n: 'Texto corto', icono: 'short_text' },
  { v: 'parrafo', n: 'Texto largo', icono: 'notes' },
  { v: 'opciones', n: 'Una opción', icono: 'radio_button_checked' },
  { v: 'varias', n: 'Varias opciones', icono: 'checklist' },
  { v: 'si_no', n: 'Sí o no', icono: 'toggle_on' },
]

// Punto de partida: lo que casi toda boda termina preguntando.
const SUGERENCIAS = [
  { etiqueta: '¿Cuántos asistirán?', tipo: 'texto' },
  { etiqueta: '¿Alguna alergia o restricción alimentaria?', tipo: 'parrafo' },
  { etiqueta: 'Elige tu platillo', tipo: 'opciones', opciones: ['Carne', 'Pollo', 'Vegetariano'] },
  { etiqueta: '¿Necesitas transporte?', tipo: 'si_no' },
]

// El id se deriva de la etiqueta y NO cambia después: es la llave de las
// respuestas ya guardadas. Renombrar la pregunta no debe huerfanar lo que ya
// contestaron las invitadas.
const idDesde = (etiqueta, usados) => {
  const base = (etiqueta || 'pregunta')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 28) || 'pregunta'
  let id = base, n = 2
  while (usados.has(id)) id = `${base}_${n++}`
  return id
}

export default function FormularioFlow({ evento, onGuardado }) {
  // Estado inicial y ya: al cambiar de evento el componente se REMONTA (el
  // padre lo monta con `key={evento.id}`). Sincronizarlo con un efecto sobre
  // `evento.formulario` lo reejecutaría en cada render, porque es un objeto y
  // su identidad cambia siempre.
  const [preguntas, setPreguntas] = useState(() => evento?.formulario || [])
  const [estado, setEstado] = useState('')

  const set = (i, cambios) =>
    setPreguntas((p) => p.map((q, j) => (j === i ? { ...q, ...cambios } : q)))

  const agregar = (base = {}) => setPreguntas((p) => {
    const usados = new Set(p.map((q) => q.id))
    const etiqueta = base.etiqueta || ''
    return [...p, {
      id: idDesde(etiqueta || `pregunta_${p.length + 1}`, usados),
      etiqueta,
      tipo: base.tipo || 'texto',
      opciones: base.opciones || [],
      requerido: false,
    }]
  })

  const mover = (i, dir) => setPreguntas((p) => {
    const j = i + dir
    if (j < 0 || j >= p.length) return p
    const c = [...p]
    ;[c[i], c[j]] = [c[j], c[i]]
    return c
  })

  const guardar = async () => {
    setEstado('guardando')
    // Sin etiqueta la pregunta no se puede pintar en el Flow: se descartan aquí
    // en vez de mandar filas vacías que después nadie sabe qué preguntaban.
    const limpio = preguntas
      .filter((q) => (q.etiqueta || '').trim())
      .map((q) => ({
        id: q.id,
        etiqueta: q.etiqueta.trim(),
        tipo: q.tipo,
        requerido: !!q.requerido,
        ...(['opciones', 'varias'].includes(q.tipo)
          ? { opciones: (q.opciones || []).map((o) => o.trim()).filter(Boolean) }
          : {}),
      }))
    const { res, data } = await apiFetch(`/api/eventos/${evento.id}/`, {
      method: 'PATCH', body: JSON.stringify({ formulario: limpio }),
    })
    if (!res.ok) { setEstado('error'); return }
    setEstado('guardado')
    onGuardado?.(data)
    setTimeout(() => setEstado(''), 2000)
  }

  return (
    <div className="mt-4 max-w-2xl">
      <div className="border-l-2 border-tertiary bg-surface-container-high/30 px-3 py-2 mb-4">
        <p className="text-[12px] text-on-surface-variant leading-relaxed">
          Estas preguntas aparecen <strong className="font-display font-semibold text-on-surface">dentro
          de WhatsApp</strong>, después de que la invitada toca «Quiero confirmar».
          No se ven en la invitación.
        </p>
      </div>

      <div className="space-y-1.5">
        {preguntas.map((q, i) => (
          <div key={q.id} className="border border-outline-variant p-2.5">
            <div className="flex items-start gap-1.5">
              <div className="flex-1 min-w-0 space-y-1.5">
                <input value={q.etiqueta || ''} placeholder="¿Qué quieres preguntar?"
                  onChange={(e) => set(i, { etiqueta: e.target.value })}
                  className={CLASE_INPUT} />

                <div className="flex items-center gap-1.5 flex-wrap">
                  <select value={q.tipo} onChange={(e) => set(i, { tipo: e.target.value })}
                    className={`${CLASE_INPUT} w-[150px] shrink-0`}>
                    {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.n}</option>)}
                  </select>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none px-1">
                    <input type="checkbox" checked={!!q.requerido}
                      onChange={(e) => set(i, { requerido: e.target.checked })}
                      className="accent-primary w-4 h-4" />
                    <span className="text-[12px] text-on-surface-variant">Obligatoria</span>
                  </label>
                </div>

                {['opciones', 'varias'].includes(q.tipo) && (
                  <ListaOpciones valor={q.opciones || []} onCambio={(v) => set(i, { opciones: v })} />
                )}
              </div>

              <div className="flex flex-col shrink-0">
                <button onClick={() => mover(i, -1)} title="Subir"
                  className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors">
                  <Icon name="arrow_upward" className="text-[14px] leading-none" />
                </button>
                <button onClick={() => mover(i, 1)} title="Bajar"
                  className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors">
                  <Icon name="arrow_downward" className="text-[14px] leading-none" />
                </button>
                <button onClick={() => setPreguntas((p) => p.filter((_, j) => j !== i))} title="Quitar"
                  className="p-1 text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors">
                  <Icon name="delete" className="text-[14px] leading-none" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {preguntas.length === 0 && (
        <div className="border border-dashed border-outline-variant px-4 py-6 text-center">
          <Icon name="quiz" className="text-[28px] text-outline-variant leading-none" />
          <p className="text-[13px] text-on-surface-variant mt-2 mb-3">
            Sin preguntas, confirmar es un solo toque y ya.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {SUGERENCIAS.map((s) => (
              <button key={s.etiqueta} onClick={() => agregar(s)}
                className="border border-outline-variant px-2.5 py-1 text-[12px] font-display text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors">
                + {s.etiqueta}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mt-3">
        <button onClick={() => agregar()}
          className="flex items-center gap-1.5 border border-dashed border-outline-variant px-3 h-[30px] text-[12px] font-display font-semibold text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors">
          <Icon name="add" className="text-[15px] leading-none" />
          Agregar pregunta
        </button>
        <div className="flex items-center gap-3">
          <span className={`text-[12px] font-display ${estado === 'error' ? 'text-error' : 'text-on-surface-variant'}`}>
            {estado === 'guardando' && 'Guardando…'}
            {estado === 'guardado' && 'Guardado'}
            {estado === 'error' && 'No se pudo guardar'}
          </span>
          <button onClick={guardar} disabled={estado === 'guardando'}
            className="flex items-center gap-1.5 border border-primary text-primary px-4 h-[30px] font-display font-semibold text-[12px] transition-all active:scale-[0.98] hover:bg-primary/5 disabled:opacity-50">
            Guardar
            <Icon name="check" className="text-[15px]" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ListaOpciones({ valor, onCambio }) {
  return (
    <div className="space-y-1 pl-1 border-l-2 border-outline-variant/40 ml-0.5">
      {valor.map((o, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input value={o} placeholder={`Opción ${i + 1}`}
            onChange={(e) => onCambio(valor.map((x, j) => (j === i ? e.target.value : x)))}
            className={`${CLASE_INPUT} flex-1 min-w-0`} />
          <button onClick={() => onCambio(valor.filter((_, j) => j !== i))} title="Quitar"
            className="shrink-0 p-1 text-on-surface-variant hover:text-error transition-colors">
            <Icon name="close" className="text-[15px] leading-none" />
          </button>
        </div>
      ))}
      <button onClick={() => onCambio([...valor, ''])}
        className="text-[12px] font-display text-on-surface-variant hover:text-primary transition-colors px-1">
        + Agregar opción
      </button>
    </div>
  )
}
