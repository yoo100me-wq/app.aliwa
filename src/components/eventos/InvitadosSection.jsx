// Lista de invitados del evento.
//
// La tabla se pinta SIEMPRE, con o sin filas: un encabezado de columnas dice
// qué datos hacen falta mucho mejor que un texto explicándolo, y el vacío deja
// de verse como una sección rota.
import { useEffect, useRef, useState } from 'react'
import Icon from '../shared/Icon'
import { apiFetch } from '../../utils/api'

const CLASE_INPUT =
  'w-full bg-surface-container-lowest border border-primary/25 hover:border-primary/50 ' +
  'px-2.5 py-1.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant ' +
  'outline-none focus:ring-2 focus:ring-primary/20 transition-all'

// Encabezados que se aceptan al importar. Se compara sin acentos ni mayúsculas
// porque nadie escribe la plantilla igual dos veces.
const COLUMNAS = {
  nombre: ['nombre', 'invitado', 'invitada', 'name'],
  telefono: ['telefono', 'tel', 'celular', 'whatsapp', 'phone'],
  pases: ['pases', 'boletos', 'lugares', 'cupos'],
  mesa: ['mesa', 'table'],
  grupo: ['grupo', 'familia', 'relacion'],
}

const sinAcentos = (s) =>
  (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

const ESTADOS = {
  confirmado: { texto: 'Confirmado', icono: 'how_to_reg', tono: 'text-selected' },
  declinado: { texto: 'No asiste', icono: 'person_off', tono: 'text-error' },
  sin_responder: { texto: 'Sin responder', icono: 'schedule', tono: 'text-on-surface-variant' },
}

export default function InvitadosSection({ evento }) {
  const [filas, setFilas] = useState([])
  // Arranca en true: el primer render ya está cargando, y ponerlo dentro del
  // efecto sería un setState en su cuerpo (renders en cascada).
  const [cargando, setCargando] = useState(true)
  const [agregando, setAgregando] = useState(false)
  const [nuevo, setNuevo] = useState({ nombre: '', telefono: '', pases: 1, mesa: '' })
  const [error, setError] = useState('')
  const [resumenImp, setResumenImp] = useState(null)
  const [avisoEnvio, setAvisoEnvio] = useState(false)
  const archivo = useRef(null)

  useEffect(() => {
    if (!evento?.id) return
    let vivo = true
    apiFetch(`/api/eventos/${evento.id}/invitados/`)
      .then(({ res, data }) => { if (vivo && res.ok) setFilas(data) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [evento?.id])

  const agregar = async () => {
    setError('')
    const { res, data } = await apiFetch(`/api/eventos/${evento.id}/invitados/`, {
      method: 'POST', body: JSON.stringify(nuevo),
    })
    if (!res.ok) { setError(data?.error || 'No se pudo agregar'); return }
    setFilas((p) => [...p, data])
    setNuevo({ nombre: '', telefono: '', pases: 1, mesa: '' })
    setAgregando(false)
  }

  const quitar = async (id) => {
    const { res } = await apiFetch(`/api/eventos/${evento.id}/invitados/${id}/`, { method: 'DELETE' })
    if (res.ok) setFilas((p) => p.filter((f) => f.id !== id))
  }

  // El archivo se lee AQUÍ y al backend van filas en JSON: así no hace falta un
  // parser de hojas de cálculo del lado del servidor, que es una dependencia
  // grande para algo que se usa una vez por evento.
  const importar = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setError(''); setResumenImp(null)
    try {
      const texto = await f.text()
      const filasCsv = parseCSV(texto)
      if (!filasCsv.length) { setError('El archivo no tiene filas'); return }
      const { res, data } = await apiFetch(`/api/eventos/${evento.id}/invitados/importar/`, {
        method: 'POST', body: JSON.stringify({ filas: filasCsv }),
      })
      if (!res.ok) { setError(data?.error || 'No se pudo importar'); return }
      setResumenImp(data)
      const recarga = await apiFetch(`/api/eventos/${evento.id}/invitados/`)
      if (recarga.res.ok) setFilas(recarga.data)
    } catch {
      setError('No se pudo leer el archivo')
    } finally {
      e.target.value = ''
    }
  }

  const confirmados = filas.filter((f) => f.estado_rsvp === 'confirmado').length

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        {/* Confirmados sobre el total: es el número que la anfitriona revisa
            diez veces al día, y en una fracción se lee de un vistazo. */}
        <p className="text-[13px] font-display font-semibold tabular-nums text-on-surface-variant">
          {cargando ? 'Cargando…' : `${confirmados}/${filas.length}`}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setAvisoEnvio(true)} disabled={filas.length === 0}
            className="flex items-center gap-1.5 border border-tertiary text-tertiary px-3 h-[30px] font-display font-semibold text-[12px] transition-all active:scale-[0.98] hover:bg-tertiary/5 disabled:opacity-40 disabled:cursor-not-allowed">
            <img src="/icons/whatsapp.svg" alt="" className="w-[15px] h-[15px]" />
            Enviar invitaciones
          </button>
          <button onClick={() => archivo.current?.click()}
            className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3 h-[30px] font-display font-semibold text-[12px] transition-colors hover:text-primary hover:border-primary/50">
            <Icon name="upload_file" className="text-[15px] leading-none" />
            Importar
          </button>
          <input ref={archivo} type="file" accept=".csv,text/csv" onChange={importar} className="hidden" />
          <button onClick={() => setAgregando(true)}
            className="flex items-center gap-1.5 border border-primary text-primary px-3 h-[30px] font-display font-semibold text-[12px] transition-all active:scale-[0.98] hover:bg-primary/5">
            <Icon name="person_add" className="text-[15px] leading-none" />
            Agregar invitado
          </button>
        </div>
      </div>

      {error && <div className="mb-3 px-3 py-2 bg-error/10 text-error text-[12px]">{error}</div>}

      {/* El envío no está conectado todavía. Se dice QUÉ falta en vez de dejar
          un botón muerto o fingir que hizo algo. */}
      {avisoEnvio && (
        <div className="mb-3 px-3 py-2.5 bg-tertiary/10 text-[12px]">
          <p className="font-display font-semibold mb-1">Todavía no se puede enviar</p>
          <ul className="text-on-surface-variant space-y-0.5 mb-2">
            <li>· La invitación debe estar publicada (pestaña Invitación → Terminar).</li>
            <li>· Falta que Meta apruebe la plantilla con los botones de confirmación.</li>
          </ul>
          <button onClick={() => setAvisoEnvio(false)}
            className="font-display font-semibold text-tertiary hover:underline">
            Entendido
          </button>
        </div>
      )}

      {resumenImp && (
        <div className="mb-3 px-3 py-2 bg-tertiary/10 text-[12px]">
          <p className="font-display font-semibold">
            {resumenImp.agregados} agregados
            {resumenImp.total_omitidos > 0 && ` · ${resumenImp.total_omitidos} omitidos`}
          </p>
          {resumenImp.omitidos?.length > 0 && (
            <ul className="mt-1 text-on-surface-variant">
              {resumenImp.omitidos.slice(0, 6).map((o, i) => (
                <li key={i}>Fila {o.fila}{o.nombre ? ` (${o.nombre})` : ''}: {o.motivo}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="border border-outline-variant overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-high/40">
              {['Nombre', 'Teléfono', 'Pases', 'Mesa', 'Estado'].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase whitespace-nowrap">
                  {h}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {agregando && (
              <tr className="border-b border-outline-variant/50 bg-primary/5">
                <td className="px-2 py-1.5">
                  <input autoFocus value={nuevo.nombre} placeholder="Nombre"
                    onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && agregar()}
                    className={CLASE_INPUT} />
                </td>
                <td className="px-2 py-1.5">
                  <input value={nuevo.telefono} placeholder="81 1234 5678"
                    onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && agregar()}
                    className={CLASE_INPUT} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min="1" max="20" value={nuevo.pases}
                    onChange={(e) => setNuevo({ ...nuevo, pases: e.target.value })}
                    className={`${CLASE_INPUT} w-[62px]`} />
                </td>
                <td className="px-2 py-1.5">
                  <input value={nuevo.mesa} placeholder="Opcional"
                    onChange={(e) => setNuevo({ ...nuevo, mesa: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && agregar()}
                    className={`${CLASE_INPUT} w-[92px]`} />
                </td>
                <td className="px-2 py-1.5" colSpan={2}>
                  <div className="flex items-center gap-1.5">
                    <button onClick={agregar} disabled={!nuevo.nombre || !nuevo.telefono}
                      className="border border-primary text-primary px-3 h-[30px] font-display font-semibold text-[12px] hover:bg-primary/5 disabled:opacity-40 transition-colors">
                      Guardar
                    </button>
                    <button onClick={() => { setAgregando(false); setError('') }}
                      className="px-2 h-[30px] text-[12px] font-display text-on-surface-variant hover:text-on-surface">
                      Cancelar
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {filas.map((f) => {
              const e = ESTADOS[f.estado_rsvp] || ESTADOS.sin_responder
              return (
                <tr key={f.id} className="border-b border-outline-variant/40 last:border-b-0 hover:bg-surface-container-high/30 transition-colors">
                  <td className="px-3 py-2 font-display font-semibold">{f.nombre}</td>
                  <td className="px-3 py-2 tabular-nums text-on-surface-variant">{formatoTel(f.telefono)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {f.estado_rsvp === 'confirmado' && f.pases_confirmados != null
                      ? `${f.pases_confirmados} de ${f.pases}`
                      : f.pases}
                  </td>
                  <td className="px-3 py-2 text-on-surface-variant">{f.mesa || '—'}</td>
                  {/* El estado se dice con TEXTO además del ícono: nunca solo color */}
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${e.tono}`}>
                      <Icon name={e.icono} className="text-[15px] leading-none" />
                      {e.texto}
                    </span>
                  </td>
                  <td className="pr-2">
                    <button onClick={() => quitar(f.id)} title="Quitar de la lista"
                      className="p-1 text-on-surface-variant hover:text-error transition-colors">
                      <Icon name="close" className="text-[15px] leading-none" />
                    </button>
                  </td>
                </tr>
              )
            })}

            {!cargando && filas.length === 0 && !agregando && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center">
                  <Icon name="group" className="text-[30px] text-outline-variant leading-none" />
                  <p className="text-[13px] text-on-surface-variant mt-2">
                    Agrega a tus invitados uno por uno o importa una lista.
                  </p>
                  <p className="text-[12px] text-outline-variant mt-1">
                    El archivo debe ser CSV con columnas: nombre, telefono, pases, mesa, grupo.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 528112345678 → +52 81 1234 5678 */
function formatoTel(t) {
  const d = (t || '').replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('52')) {
    return `+52 ${d.slice(2, 4)} ${d.slice(4, 8)} ${d.slice(8)}`
  }
  return t
}

/**
 * CSV a filas con las llaves que espera el backend.
 *
 * Escrito a mano y no con una librería: son cuatro columnas y meter un parser
 * de hojas de cálculo al bundle del dashboard por esto no se justifica. Maneja
 * comillas porque un nombre con coma («Pérez, Ana») las trae, y eso sí rompe
 * un split ingenuo.
 */
function parseCSV(texto) {
  const lineas = partirLineas(texto.replace(/^\ufeff/, ''))
  if (lineas.length < 2) return []

  const cabecera = lineas[0].map(sinAcentos)
  const indice = {}
  for (const [llave, alias] of Object.entries(COLUMNAS)) {
    const i = cabecera.findIndex((c) => alias.includes(c))
    if (i >= 0) indice[llave] = i
  }
  // Sin columna de nombre no hay nada que importar, sea cual sea el resto.
  if (indice.nombre === undefined) return []

  return lineas.slice(1)
    .filter((celdas) => celdas.some((c) => c.trim()))
    .map((celdas) => {
      const fila = {}
      for (const [llave, i] of Object.entries(indice)) fila[llave] = (celdas[i] || '').trim()
      return fila
    })
}

function partirLineas(texto) {
  const filas = []
  let celda = '', fila = [], comillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { celda += '"'; i++ }
      else if (c === '"') comillas = false
      else celda += c
    } else if (c === '"') comillas = true
    else if (c === ',' || c === ';') { fila.push(celda); celda = '' }
    else if (c === '\n') { fila.push(celda); filas.push(fila); fila = []; celda = '' }
    else if (c !== '\r') celda += c
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila) }
  return filas
}
