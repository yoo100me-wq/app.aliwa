import { useState, useEffect, useMemo } from 'react'
import { apiFetch, apiUpload } from '../../utils/api'
import { LADAS, telefonoConLada } from '../../utils/ladas'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'
import { colorAvatar } from './avatarColor'
import { iniciales } from '../../utils/iniciales'
import LeadPanel from './LeadPanel'
import useErrorToast from '../../hooks/useErrorToast'

// Clasificación DERIVADA del contacto (labels en t.contactos.clasif):
// cliente = tiene ciclo de vida; lead = oportunidades abiertas; contacto = resto.
function clasificacionDe(persona) {
  if (persona.es_cliente) return 'cliente'
  if (persona.leads_abiertos > 0) return 'lead'
  return 'contacto'
}

const CLASIF_CLASES = {
  cliente: 'bg-accent/30 text-on-surface',
  lead: 'bg-purple/10 text-purple',
  contacto: 'bg-outline-variant/20 text-on-surface-variant',
}

// Nombre a mostrar: el formal si existe; si no, "Lead 000100004"
function nombrePersona(p) {
  const formal = [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ').trim()
  if (formal) return formal
  if (p.codigo_contacto && (!p.nombre || p.nombre === p.apodo || p.nombre === p.telefono)) {
    return `Lead ${p.codigo_contacto}`
  }
  return p.nombre || `Lead ${p.codigo_contacto}`
}

// Sin ancho, para componer en filas flex (la lada junto al número). Agregarle
// `w-auto` a `campo` NO sirve: Tailwind emite .w-full después de .w-auto, así
// que el 100% gana y el campo de al lado se queda sin espacio.
const campoSinAncho =
  'bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg px-3 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none'
const campo = `w-full ${campoSinAncho}`
const label = 'block text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1'

// Modal de alta de EMPRESA. El nombre y el giro no llegan de ningún lado, así
// que hay que pedirlos. Las personas se dan de alta en el panel lateral
// (LeadPanel en modo `nuevo`): ahí basta el teléfono.
function ModalAgregar({ onGuardar, onClose }) {
  const { t } = useLang()
  const tc = t.contactos
  const [form, setForm] = useState({ nombre: '', industria: '', telefono: '', correo: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  // Los errores salen como notificación arriba a la derecha
  useErrorToast(error, setError)
  const [pais, setPais] = useState(LADAS[0])  // default México
  const set = (c, v) => setForm((f) => ({ ...f, [c]: v }))

  const guardar = async () => {
    setError('')
    if (!form.nombre.trim()) {
      setError(tc.errNombreRequerido)
      return
    }
    setGuardando(true)
    const ok = await onGuardar({
      nombre: form.nombre.trim(), industria: form.industria.trim(),
      telefono: telefonoConLada(form.telefono, pais), correo: form.correo.trim(),
    }, setError)
    setGuardando(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="border border-outline-variant bg-surface-container rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-[15px] mb-4">{tc.nuevaEmpresa}</h3>
        <div className="space-y-3">
          <div>
            <label className={label}>{tc.lblNombreEmpresa}</label>
            <input className={campo} value={form.nombre} placeholder={tc.phNombreEmpresa}
              onChange={(e) => set('nombre', e.target.value)} autoFocus />
          </div>
          <div>
            <label className={label}>{tc.lblIndustria}</label>
            <input className={campo} value={form.industria} placeholder={tc.phIndustria}
              onChange={(e) => set('industria', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>{tc.lblTelefono}</label>
              <div className="flex gap-1.5">
                <select
                  className={`${campoSinAncho} shrink-0 w-[84px] pr-1`}
                  value={pais.codigo}
                  onChange={(e) => setPais(LADAS.find((l) => l.codigo === e.target.value) || LADAS[0])}
                  title={pais.nombre}
                >
                  {LADAS.map((l) => (
                    <option key={l.codigo} value={l.codigo}>{l.bandera} {l.lada}</option>
                  ))}
                </select>
                <input className={`${campoSinAncho} flex-1 min-w-0`} value={form.telefono}
                  placeholder={tc.phTelefono} inputMode="tel"
                  onChange={(e) => set('telefono', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={label}>{tc.lblCorreo}</label>
              <input type="email" className={campo} value={form.correo} placeholder={tc.phCorreo}
                onChange={(e) => set('correo', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-display font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-all">
            {tc.cancelar}
          </button>
          <button onClick={guardar} disabled={guardando}
            className="px-4 py-2 border border-primary text-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:bg-primary/5 disabled:opacity-40">
            {guardando ? tc.guardando : tc.guardar}
          </button>
        </div>
      </div>
    </div>
  )
}

// Importación de agenda (.vcf). Dos tiempos: primero una PREVIA que no escribe
// nada (el backend responde el resumen), y solo si el usuario confirma se crea.
// Así nadie mete 150 contactos sin saber qué traía el archivo.
function ImportarModal({ tc, onClose, onListo, setError }) {
  const [archivo, setArchivo] = useState(null)
  const [previa, setPrevia] = useState(null)
  const [cargando, setCargando] = useState(false)

  const analizar = async (file) => {
    setArchivo(file)
    setPrevia(null)
    setCargando(true)
    const fd = new FormData()
    fd.append('archivo', file)
    fd.append('previa', '1')
    const { res, data } = await apiUpload('/api/contactos/importar/', fd)
    setCargando(false)
    if (res.ok) setPrevia(data)
    else setError(data?.error || tc.importarError)
  }

  const confirmar = async () => {
    setCargando(true)
    const fd = new FormData()
    fd.append('archivo', archivo)
    const { res, data } = await apiUpload('/api/contactos/importar/', fd)
    setCargando(false)
    if (res.ok) onListo(data)
    else setError(data?.error || tc.importarError)
  }

  const fila = (etiqueta, valor, fuerte) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] text-on-surface-variant">{etiqueta}</span>
      <span className={`text-[13px] font-display ${fuerte ? 'font-bold text-primary' : ''}`}>{valor}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-neutral/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="border border-outline-variant bg-surface-container rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-[15px] mb-2">{tc.importarTitulo}</h3>
        <p className="text-[13px] leading-[1.6] text-on-surface-variant mb-4">{tc.importarAyuda}</p>

        {!previa && (
          <label className="flex items-center justify-center gap-2 h-11 border border-dashed border-outline-variant rounded-lg cursor-pointer text-[13px] font-display font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-all">
            <Icon name="upload_file" className="text-[18px] leading-none" />
            {cargando ? tc.importarAnalizando : (archivo?.name || tc.importarElegir)}
            <input type="file" accept=".vcf" className="hidden" disabled={cargando}
              onChange={(e) => e.target.files?.[0] && analizar(e.target.files[0])} />
          </label>
        )}

        {previa && (
          <div className="rounded-lg bg-surface-container-high/40 px-3 py-2">
            <p className="text-[11px] font-display font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
              {tc.importarResumen}
            </p>
            {fila(tc.importarLeidos, previa.telefonos_leidos)}
            {fila(tc.importarUnicos, previa.unicos)}
            {fila(tc.importarExistian, previa.ya_existian)}
            {fila(tc.importarNuevos, previa.a_crear, true)}
            {previa.sin_nombre > 0 && fila(tc.importarSinNombre, previa.sin_nombre)}
          </div>
        )}

        {previa?.a_crear === 0 && (
          <p className="text-[13px] text-on-surface-variant mt-3">{tc.importarNadaNuevo}</p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-display font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-all">
            {tc.importarCancelar}
          </button>
          <button onClick={confirmar} disabled={cargando || !previa || previa.a_crear === 0}
            className="px-4 py-2 border border-primary text-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:bg-primary/5 disabled:opacity-40">
            {cargando ? tc.importarImportando : tc.importarConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ContactosSection() {
  const { t, lang } = useLang()
  const tc = t.contactos
  const [tab, setTab] = useState('personas')
  const [personas, setPersonas] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  // Los errores salen como notificación arriba a la derecha
  useErrorToast(error, setError)
  // Falla al cargar la lista: además del toast deja el aviso en el área vacía
  const [fallaCarga, setFallaCarga] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [agregando, setAgregando] = useState(false)      // modal de empresa
  const [creandoPersona, setCreandoPersona] = useState(false)  // panel lateral
  const [importando, setImportando] = useState(false)          // modal de .vcf
  // Contacto abierto en el LeadPanel (el mismo panel de edición de chats)
  const [editandoId, setEditandoId] = useState(null)

  // Alta de empresa (las personas se crean desde el LeadPanel).
  const guardarNuevo = async (payload, setModalError) => {
    try {
      const { res, data } = await apiFetch('/api/contactos/empresas/', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setEmpresas((prev) => [data, ...prev])
        return true
      }
      // data.error (duplicado) o errores de campo del serializer
      const detalle = data?.error
        || (data && typeof data === 'object' && Object.values(data).flat().find((v) => typeof v === 'string'))
      setModalError(detalle || tc.errGuardar)
      return false
    } catch {
      setModalError(tc.errGuardar)
      return false
    }
  }

  useEffect(() => {
    let vivo = true
    Promise.all([
      apiFetch('/api/contactos/'),
      apiFetch('/api/contactos/empresas/'),
    ])
      .then(([p, e]) => {
        if (!vivo) return
        if (p.res.ok) setPersonas(Array.isArray(p.data) ? p.data : p.data?.results || [])
        if (e.res.ok) setEmpresas(Array.isArray(e.data) ? e.data : e.data?.results || [])
        if (!p.res.ok && !e.res.ok) { setError(tc.errCargar); setFallaCarga(true) }
      })
      .catch(() => { if (vivo) { setError(tc.errCargar); setFallaCarga(true) } })
      .finally(() => vivo && setCargando(false))
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const locale = lang === 'en' ? 'en-US' : 'es-MX'
  const fecha = (iso) => {
    if (!iso) return tc.sinDato
    try {
      return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    } catch { return tc.sinDato }
  }

  const filtrar = (lista, campos) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return lista
    return lista.filter((item) =>
      campos.some((c) => String(item[c] || '').toLowerCase().includes(q))
    )
  }

  const personasFiltradas = useMemo(
    () => filtrar(personas, ['nombre', 'apodo', 'nombres', 'apellido_paterno', 'telefono', 'correo', 'codigo_contacto']),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personas, busqueda]
  )
  const empresasFiltradas = useMemo(
    () => filtrar(empresas, ['nombre', 'razon_social', 'industria', 'telefono', 'correo']),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresas, busqueda]
  )

  const lista = tab === 'personas' ? personasFiltradas : empresasFiltradas
  const vacioTexto = tab === 'personas' ? tc.vacioPersonas : tc.vacioEmpresas
  const hayDatos = tab === 'personas' ? personas.length > 0 : empresas.length > 0

  const celdaHead = 'text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase text-left px-3 py-2'

  return (
    <div className="flex h-full min-w-0">
      <div className="flex-1 flex flex-col min-w-0">
      {/* Header: título + tabs + buscador */}
      <div className="flex items-center gap-4 px-4 h-11 shrink-0">
        <h3 className="font-display font-bold text-[15px]">{tc.titulo}</h3>
        <div className="flex items-center gap-1">
          {[['personas', tc.tabPersonas, personas.length], ['empresas', tc.tabEmpresas, empresas.length]].map(([id, label, n]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1 text-[13px] font-display font-semibold transition-all ${
                tab === id
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
              }`}
            >
              {label}
              <span className={`ml-1.5 text-[11px] ${tab === id ? 'opacity-70' : 'opacity-60'}`}>{n}</span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative w-64">
          <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-outline-variant leading-none" />
          <input
            className="w-full bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg pl-8 pr-3 py-1.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none"
            placeholder={tc.buscar}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        {tab === 'personas' && (
          <button
            onClick={() => setImportando(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant text-on-surface-variant text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:text-on-surface hover:border-on-surface-variant shrink-0"
          >
            <Icon name="upload_file" className="text-[16px] leading-none" />
            {tc.importar}
          </button>
        )}
        <button
          onClick={() => {
            // Persona → panel lateral en modo alta. Empresa → modal.
            if (tab === 'personas') {
              setEditandoId(null)
              setCreandoPersona(true)
            } else {
              setAgregando(true)
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:bg-primary/5 shrink-0"
        >
          <Icon name="add" className="text-[16px] leading-none" />
          {tab === 'personas' ? tc.agregarContacto : tc.agregarEmpresa}
        </button>
      </div>
      <div className="h-px bg-outline-variant" />

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        {cargando ? (
          <p className="text-[13px] text-on-surface-variant py-10 text-center">{tc.cargando}</p>
        ) : fallaCarga ? (
          <p className="text-[13px] text-error py-10 text-center">{tc.errCargar}</p>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <Icon name={tab === 'personas' ? 'person_search' : 'domain'} className="text-outline-variant text-[44px] mb-3" />
            <p className="text-[13px] text-on-surface-variant max-w-sm leading-relaxed">
              {hayDatos ? tc.sinResultados : vacioTexto}
            </p>
          </div>
        ) : tab === 'personas' ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/40">
                <th className={celdaHead}>{tc.colContacto}</th>
                <th className={celdaHead}>{tc.colTelefono}</th>
                <th className={`${celdaHead} hidden md:table-cell`}>{tc.colCorreo}</th>
                <th className={celdaHead}>{tc.colClasificacion}</th>
                <th className={`${celdaHead} hidden lg:table-cell`}>{tc.colCreado}</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const nombre = nombrePersona(p)
                const clasif = clasificacionDe(p)
                return (
                  <tr
                    key={p.id}
                    // La fila completa abre el panel del contacto (antes había
                    // un lápiz que solo asomaba al pasar el mouse).
                    onClick={() => {
                      setCreandoPersona(false)
                      setEditandoId((id) => (id === p.id ? null : p.id))
                    }}
                    className={`border-b border-outline-variant/20 transition-colors cursor-pointer ${
                      editandoId === p.id ? 'bg-primary/5' : 'hover:bg-surface-container-high/30'
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full ${colorAvatar(p.telefono || p.id)} flex items-center justify-center shrink-0`}>
                          {nombre.startsWith('Lead ') ? (
                            <Icon name="person" className="text-[16px] leading-none" />
                          ) : (
                            <span className="font-display font-semibold text-[12px]">{iniciales(p.nombres || nombre, p.apellido_paterno)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-display font-semibold truncate">{nombre}</p>
                          {p.apodo && (
                            <p className="text-[12px] text-on-surface-variant italic truncate">~ {p.apodo}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[13px] font-body whitespace-nowrap">
                      {p.telefono || tc.sinDato}
                    </td>
                    <td className="px-3 py-2 text-[13px] font-body hidden md:table-cell truncate max-w-[220px]">
                      {p.correo || tc.sinDato}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[11px] font-display font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${CLASIF_CLASES[clasif]}`}>
                        {tc.clasif[clasif]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-on-surface-variant hidden lg:table-cell whitespace-nowrap">
                      {fecha(p.creado_en)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/40">
                <th className={celdaHead}>{tc.colEmpresa}</th>
                <th className={celdaHead}>{tc.colTelefono}</th>
                <th className={`${celdaHead} hidden md:table-cell`}>{tc.colCorreo}</th>
                <th className={celdaHead}>{tc.colIndustria}</th>
                <th className={`${celdaHead} hidden lg:table-cell`}>{tc.colCreado}</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id} className="border-b border-outline-variant/20 hover:bg-surface-container-high/30 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full ${colorAvatar(e.telefono || e.id)} flex items-center justify-center shrink-0`}>
                        <Icon name="domain" className="text-[16px] leading-none" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-display font-semibold truncate">{e.nombre}</p>
                        {e.razon_social && (
                          <p className="text-[12px] text-on-surface-variant truncate">{e.razon_social}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[13px] font-body whitespace-nowrap">
                    {e.telefono || tc.sinDato}
                  </td>
                  <td className="px-3 py-2 text-[13px] font-body hidden md:table-cell truncate max-w-[220px]">
                    {e.correo || tc.sinDato}
                  </td>
                  <td className="px-3 py-2 text-[13px] font-body">
                    {e.industria || tc.sinDato}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-on-surface-variant hidden lg:table-cell whitespace-nowrap">
                    {fecha(e.creado_en)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* El alta de EMPRESA sí necesita modal: nombre y giro no vienen de
          ningún lado. La de PERSONA se hace en el panel lateral (abajo). */}
      {agregando && tab === 'empresas' && (
        <ModalAgregar onGuardar={guardarNuevo} onClose={() => setAgregando(false)} />
      )}

      {importando && (
        <ImportarModal
          tc={tc}
          setError={setError}
          onClose={() => setImportando(false)}
          onListo={() => {
            setImportando(false)
            // Recargar en vez de insertar a mano: son decenas de contactos y
            // el backend ya definió cuáles se crearon.
            apiFetch('/api/contactos/').then(({ res, data }) => {
              if (res.ok) setPersonas(data.results || data || [])
            })
          }}
        />
      )}
      </div>

      {/* Panel lateral: alta de persona y edición usan el MISMO componente */}
      {(editandoId || creandoPersona) && (
        <LeadPanel
          key={editandoId || 'nuevo'}
          prospectoId={editandoId}
          nuevo={!editandoId}
          conCerrar
          onClose={() => { setEditandoId(null); setCreandoPersona(false) }}
          onSaved={(data) =>
            setPersonas((prev) =>
              prev.some((p) => p.id === data.id)
                ? prev.map((p) => (p.id === data.id ? { ...p, ...data } : p))
                : [data, ...prev]
            )
          }
        />
      )}
    </div>
  )
}
