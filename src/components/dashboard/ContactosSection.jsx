import { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '../../utils/api'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'
import { colorAvatar } from './avatarColor'

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

const campo =
  'w-full bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg px-3 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none'
const label = 'block text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1'

// Mapa de ladas por país. `prefijo` es lo que se antepone al número local
// para formar el formato de WhatsApp (México lleva el 1 extra: 521...).
const LADAS = [
  { codigo: 'MX', nombre: 'México', bandera: '🇲🇽', lada: '+52', prefijo: '521' },
  { codigo: 'US', nombre: 'Estados Unidos', bandera: '🇺🇸', lada: '+1', prefijo: '1' },
  { codigo: 'GT', nombre: 'Guatemala', bandera: '🇬🇹', lada: '+502', prefijo: '502' },
  { codigo: 'CO', nombre: 'Colombia', bandera: '🇨🇴', lada: '+57', prefijo: '57' },
  { codigo: 'AR', nombre: 'Argentina', bandera: '🇦🇷', lada: '+54', prefijo: '54' },
  { codigo: 'PE', nombre: 'Perú', bandera: '🇵🇪', lada: '+51', prefijo: '51' },
  { codigo: 'CL', nombre: 'Chile', bandera: '🇨🇱', lada: '+56', prefijo: '56' },
  { codigo: 'ES', nombre: 'España', bandera: '🇪🇸', lada: '+34', prefijo: '34' },
]

// Devuelve el teléfono en formato WhatsApp (prefijo+local). Si el usuario ya
// escribió el número con lada (con o sin +), se respeta tal cual.
function telefonoConLada(entrada, pais) {
  const digitos = entrada.replace(/\D/g, '')
  if (!digitos) return ''
  const ladaDigitos = pais.lada.replace('+', '')
  // Solo cuenta como "ya trae lada" si es MÁS largo que un número local
  // (10 díg.): un local que empiece en 52 no debe confundirse con la lada.
  if (digitos.length > 10 && (digitos.startsWith(pais.prefijo) || digitos.startsWith(ladaDigitos))) {
    return digitos
  }
  return pais.prefijo + digitos
}

// Modal de alta manual: persona (nombres+apellidos) o empresa (nombre+giro)
function ModalAgregar({ tipo, onGuardar, onClose }) {
  const { t } = useLang()
  const tc = t.contactos
  const esPersona = tipo === 'personas'
  const [form, setForm] = useState({
    nombres: '', apellido_paterno: '', apellido_materno: '',
    nombre: '', industria: '', telefono: '', correo: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [pais, setPais] = useState(LADAS[0])  // default México
  const set = (c, v) => setForm((f) => ({ ...f, [c]: v }))

  const guardar = async () => {
    setError('')
    const nombre = esPersona
      ? [form.nombres, form.apellido_paterno, form.apellido_materno].filter(Boolean).join(' ').trim()
      : form.nombre.trim()
    if (!nombre) {
      setError(tc.errNombreRequerido)
      return
    }
    setGuardando(true)
    const telefono = telefonoConLada(form.telefono, pais)
    const payload = esPersona
      ? {
          nombre, nombres: form.nombres.trim(),
          apellido_paterno: form.apellido_paterno.trim(),
          apellido_materno: form.apellido_materno.trim(),
          telefono, correo: form.correo.trim(),
          origen: 'manual',
        }
      : {
          nombre, industria: form.industria.trim(),
          telefono, correo: form.correo.trim(),
        }
    const ok = await onGuardar(payload, setError)
    setGuardando(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="border border-outline-variant bg-surface-container rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-[15px] mb-4">
          {esPersona ? tc.nuevoContacto : tc.nuevaEmpresa}
        </h3>
        <div className="space-y-3">
          {esPersona ? (
            <>
              <div>
                <label className={label}>{tc.lblNombres}</label>
                <input className={campo} value={form.nombres} placeholder={tc.phNombres}
                  onChange={(e) => set('nombres', e.target.value)} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>{tc.lblApellidoPaterno}</label>
                  <input className={campo} value={form.apellido_paterno} placeholder={tc.phApellidoPaterno}
                    onChange={(e) => set('apellido_paterno', e.target.value)} />
                </div>
                <div>
                  <label className={label}>{tc.lblApellidoMaterno}</label>
                  <input className={campo} value={form.apellido_materno} placeholder={tc.phApellidoMaterno}
                    onChange={(e) => set('apellido_materno', e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>{tc.lblTelefono}</label>
              <div className="flex gap-1.5">
                <select
                  className={`${campo} w-auto shrink-0 pr-1`}
                  value={pais.codigo}
                  onChange={(e) => setPais(LADAS.find((l) => l.codigo === e.target.value) || LADAS[0])}
                  title={pais.nombre}
                >
                  {LADAS.map((l) => (
                    <option key={l.codigo} value={l.codigo}>{l.bandera} {l.lada}</option>
                  ))}
                </select>
                <input className={campo} value={form.telefono} placeholder={tc.phTelefono}
                  onChange={(e) => set('telefono', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={label}>{tc.lblCorreo}</label>
              <input type="email" className={campo} value={form.correo} placeholder={tc.phCorreo}
                onChange={(e) => set('correo', e.target.value)} />
            </div>
          </div>
          {error && <p className="text-[12px] text-error font-display">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-display font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-all">
            {tc.cancelar}
          </button>
          <button onClick={guardar} disabled={guardando}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-40">
            {guardando ? tc.guardando : tc.guardar}
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
  const [busqueda, setBusqueda] = useState('')
  const [agregando, setAgregando] = useState(false)

  // POST al endpoint según el tab activo; agrega el registro a la lista.
  const guardarNuevo = async (payload, setModalError) => {
    const url = tab === 'personas' ? '/api/contactos/' : '/api/contactos/empresas/'
    try {
      const { res, data } = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        if (tab === 'personas') setPersonas((prev) => [data, ...prev])
        else setEmpresas((prev) => [data, ...prev])
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
        if (!p.res.ok && !e.res.ok) setError(tc.errCargar)
      })
      .catch(() => vivo && setError(tc.errCargar))
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
    <div className="flex flex-col h-full">
      {/* Header: título + tabs + buscador */}
      <div className="flex items-center gap-4 px-4 h-11 shrink-0">
        <h3 className="font-display font-bold text-[15px]">{tc.titulo}</h3>
        <div className="flex items-center gap-1">
          {[['personas', tc.tabPersonas, personas.length], ['empresas', tc.tabEmpresas, empresas.length]].map(([id, label, n]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1 rounded-lg text-[13px] font-display font-semibold transition-all ${
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
        <button
          onClick={() => setAgregando(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 shrink-0"
        >
          <Icon name="add" className="text-[16px] leading-none" />
          {tab === 'personas' ? tc.agregarContacto : tc.agregarEmpresa}
        </button>
        <div className="relative w-64">
          <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-outline-variant leading-none" />
          <input
            className="w-full bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg pl-8 pr-3 py-1.5 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none"
            placeholder={tc.buscar}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>
      <div className="h-px bg-outline-variant" />

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        {cargando ? (
          <p className="text-[13px] text-on-surface-variant py-10 text-center">{tc.cargando}</p>
        ) : error ? (
          <p className="text-[13px] text-error py-10 text-center">{error}</p>
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
                  <tr key={p.id} className="border-b border-outline-variant/20 hover:bg-surface-container-high/30 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full ${colorAvatar(p.telefono || p.id)} flex items-center justify-center shrink-0`}>
                          {nombre.startsWith('Lead ') ? (
                            <Icon name="person" className="text-[16px] leading-none" />
                          ) : (
                            <span className="font-display font-semibold text-[12px]">{nombre[0].toUpperCase()}</span>
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

      {/* Modal de alta manual (persona o empresa según el tab) */}
      {agregando && (
        <ModalAgregar tipo={tab} onGuardar={guardarNuevo} onClose={() => setAgregando(false)} />
      )}
    </div>
  )
}
