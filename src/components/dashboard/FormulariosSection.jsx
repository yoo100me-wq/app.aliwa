import { useState, useEffect } from 'react'
import { apiFetch } from '../../utils/api'
import Icon from '../shared/Icon'
import { useLang } from '../../i18n-app'
import PreviaFormulario from './PreviaFormulario'
import useErrorToast from '../../hooks/useErrorToast'

// Constructor de formularios (WhatsApp Flows). El negocio elige tipos y escribe
// etiquetas; el Flow JSON lo arma el backend. Aquí no se toca JSON.

const ESTADO_CLASES = {
  PUBLISHED: 'bg-accent/20 text-on-surface',
  DRAFT: 'bg-purple/10 text-purple',
  DEPRECATED: 'bg-outline-variant/20 text-on-surface-variant',
  BLOCKED: 'bg-error/10 text-error',
  THROTTLED: 'bg-error/10 text-error',
}

const CATEGORIAS = [
  'APPOINTMENT_BOOKING', 'LEAD_GENERATION', 'SIGN_UP',
  'CONTACT_US', 'CUSTOMER_SUPPORT', 'SURVEY', 'OTHER',
]

// Los tipos que ofrece la paleta, en el orden en que se usan de verdad.
const TIPOS = [
  'texto', 'email', 'telefono', 'numero', 'parrafo',
  'opciones', 'multiple', 'lista', 'fecha', 'aceptacion',
]
const TIPOS_CON_OPCIONES = ['opciones', 'multiple', 'lista']

// Límites de etiqueta DOCUMENTADOS por Meta, distintos por componente. Deben
// coincidir con TIPOS_CAMPO_FLOW del backend: si aquí se permite de más, el
// campo se ve válido y luego Meta rechaza el formulario al publicarlo.
const LIMITE_ETIQUETA = {
  texto: 20, email: 20, telefono: 20, numero: 20,
  parrafo: 20, lista: 20, fecha: 20,
  opciones: 30, multiple: 30,
  aceptacion: 120,
}
const MAX_CAMPOS = 20
const MAX_OPTIN = 5

const campo =
  'w-full bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-lg px-3 py-2 text-[13px] font-body text-on-surface placeholder:text-outline-variant outline-none'
const label = 'block text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1'

const FORM_VACIO = { nombre: '', categoria: 'APPOINTMENT_BOOKING', titulo: '', boton: '', campos: [] }

export default function FormulariosSection() {
  const { t } = useLang()
  const tf = t.formularios
  const [formularios, setFormularios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [sinNumero, setSinNumero] = useState(false)
  const [editando, setEditando] = useState(false)     // panel derecho = editor
  const [seleccionado, setSeleccionado] = useState('') // id del flow abierto ('' = nuevo)
  const [form, setForm] = useState(FORM_VACIO)
  const [cargandoCampos, setCargandoCampos] = useState(false)
  const [guardando, setGuardando] = useState('') // '' | 'guardando' | 'publicando'
  const [confirmando, setConfirmando] = useState('')
  const [confirmaPublicar, setConfirmaPublicar] = useState('')
  const [error, setError] = useState('')
  useErrorToast(error, setError)
  const [aviso, setAviso] = useState('')

  const pedirFormularios = () =>
    apiFetch('/api/whatsapp/flows/')
      .then(({ res, data }) => {
        if (res.ok) setFormularios(data.formularios || [])
        else if (res.status === 400) setSinNumero(true)
      })
      .catch(() => {})

  // Recarga con spinner, para después de guardar o borrar
  const cargar = () => {
    setCargando(true)
    pedirFormularios().finally(() => setCargando(false))
  }

  // En el montaje `cargando` ya arranca en true: no hace falta volver a
  // fijarlo, y así el efecto no cambia estado de forma síncrona.
  useEffect(() => {
    pedirFormularios().finally(() => setCargando(false))
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const abrirNuevo = () => {
    setForm(FORM_VACIO)
    setSeleccionado('')
    setEditando(true)
    setError('')
    setAviso('')
    setConfirmaPublicar('')
  }

  // Abrir uno existente: el backend lee el Flow JSON de Meta y lo devuelve
  // como la misma lista plana de campos que usa el editor.
  const abrir = (f) => {
    setSeleccionado(f.id)
    setEditando(true)
    setError('')
    setAviso('')
    setConfirmaPublicar('')
    setForm({ nombre: f.nombre, categoria: f.categorias?.[0] || 'OTHER', titulo: '', boton: '', campos: [] })
    setCargandoCampos(true)
    apiFetch(`/api/whatsapp/flows/${f.id}/`)
      .then(({ res, data }) => {
        if (res.ok) {
          setForm((prev) => ({
            ...prev,
            titulo: data.titulo || '',
            boton: data.boton || '',
            campos: data.campos || [],
          }))
        } else {
          setError(data?.error || tf.errCargar)
        }
      })
      .catch(() => setError(tf.errConexion))
      .finally(() => setCargandoCampos(false))
  }

  // -- edición de la lista de campos --
  const agregarCampo = (tipo) => {
    if (form.campos.length >= MAX_CAMPOS) return
    const nuevo = { tipo, etiqueta: '', requerido: false }
    if (TIPOS_CON_OPCIONES.includes(tipo)) nuevo.opciones = []
    set('campos', [...form.campos, nuevo])
  }

  const editarCampo = (i, clave, valor) =>
    set('campos', form.campos.map((c, j) => (j === i ? { ...c, [clave]: valor } : c)))

  const cambiarTipo = (i, tipo) =>
    set('campos', form.campos.map((c, j) => {
      if (j !== i) return c
      const siguiente = { ...c, tipo }
      // Cambiar a un tipo con opciones estrena lista; salir de él la descarta.
      if (TIPOS_CON_OPCIONES.includes(tipo)) siguiente.opciones = c.opciones || []
      else delete siguiente.opciones
      return siguiente
    }))

  const quitarCampo = (i) => set('campos', form.campos.filter((_, j) => j !== i))

  const moverCampo = (i, delta) => {
    const destino = i + delta
    if (destino < 0 || destino >= form.campos.length) return
    const copia = [...form.campos]
    ;[copia[i], copia[destino]] = [copia[destino], copia[i]]
    set('campos', copia)
  }

  // Meta rechaza: un campo sin etiqueta, uno de opciones sin opciones, una
  // etiqueta más larga que el tope de su componente, o más de 5 aceptaciones.
  const optins = form.campos.filter((c) => c.tipo === 'aceptacion').length
  const camposValidos = form.campos.length > 0 && optins <= MAX_OPTIN && form.campos.every((c) =>
    c.etiqueta.trim()
    && c.etiqueta.length <= (LIMITE_ETIQUETA[c.tipo] || 20)
    && (!TIPOS_CON_OPCIONES.includes(c.tipo) || (c.opciones || []).length > 0)
  )
  const puedeGuardar = form.nombre.trim() && form.titulo.trim() && camposValidos && !guardando
  const seleccionadoObj = formularios.find((f) => f.id === seleccionado) || null
  const yaPublicado = seleccionadoObj?.estado === 'PUBLISHED'

  // `publicar` es una decisión aparte de guardar: publicar es irreversible,
  // porque Meta no deja editar ni borrar un flow publicado.
  const guardar = async (publicar) => {
    if (publicar && confirmaPublicar !== 'listo') {
      setConfirmaPublicar('listo')
      return
    }
    setConfirmaPublicar('')
    setGuardando(publicar ? 'publicando' : 'guardando')
    setError('')
    setAviso('')
    const cuerpo = {
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      titulo: form.titulo.trim(),
      boton: form.boton.trim() || tf.previaBoton,
      publicar,
      campos: form.campos.map((c) => ({
        tipo: c.tipo,
        etiqueta: c.etiqueta.trim(),
        requerido: Boolean(c.requerido),
        ...(TIPOS_CON_OPCIONES.includes(c.tipo) ? { opciones: c.opciones } : {}),
      })),
    }
    try {
      const ruta = seleccionado ? `/api/whatsapp/flows/${seleccionado}/` : '/api/whatsapp/flows/'
      const { res, data } = await apiFetch(ruta, { method: 'POST', body: JSON.stringify(cuerpo) })
      if (res.ok) {
        // Editar un publicado crea otro flow: hay que seguir al id nuevo o el
        // editor quedaría apuntando al que acaba de darse de baja.
        if (data?.id) setSeleccionado(data.id)
        // El backend responde 200 con `error` cuando guardó pero no publicó.
        if (data?.error) setError(data.error)
        else if (data?.nueva_version) setAviso(tf.avisoNuevaVersion)
        else if (data?.estado === 'PUBLISHED') setAviso(tf.avisoPublicado(cuerpo.nombre))
        else setAviso(tf.avisoGuardado)
        cargar()
      } else {
        setError(data?.error || tf.errGuardar)
      }
    } catch {
      setError(tf.errConexion)
    } finally {
      setGuardando('')
    }
  }

  const eliminar = async (f) => {
    setConfirmando('')
    setError('')
    setAviso('')
    try {
      const { res, data } = await apiFetch(`/api/whatsapp/flows/${f.id}/`, { method: 'DELETE' })
      if (res.ok) {
        setAviso(data?.dado_de_baja ? tf.avisoBaja : tf.avisoEliminado)
        setEditando(false)
        setSeleccionado('')
        cargar()
      } else {
        setError(data?.error || tf.errEliminar)
      }
    } catch {
      setError(tf.errConexion)
    }
  }

  if (sinNumero) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="flex flex-col items-center text-center max-w-sm">
          <Icon name="assignment" className="text-outline-variant text-[44px] mb-3" />
          <h3 className="font-display text-[15px] font-semibold mb-1">{tf.sinNumeroTitulo}</h3>
          <p className="text-[13px] text-on-surface-variant leading-relaxed">{tf.sinNumeroTexto}</p>
        </div>
      </div>
    )
  }

  // ---- Tarjeta de un campo dentro del editor ----
  const tarjetaCampo = (c, i) => {
    const limite = LIMITE_ETIQUETA[c.tipo] || 80
    const excede = c.etiqueta.length > limite
    return (
      <div key={i} className="bg-surface-container-lowest dark:bg-surface-container-high/30 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <select
            className={`${campo} w-auto flex-1`}
            value={c.tipo}
            onChange={(e) => cambiarTipo(i, e.target.value)}
          >
            {TIPOS.map((tipo) => <option key={tipo} value={tipo}>{tf.tipos[tipo]}</option>)}
          </select>
          <button onClick={() => moverCampo(i, -1)} disabled={i === 0} title={tf.subir}
            className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-30">
            <Icon name="arrow_upward" className="text-[16px] leading-none" />
          </button>
          <button onClick={() => moverCampo(i, 1)} disabled={i === form.campos.length - 1} title={tf.bajar}
            className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-30">
            <Icon name="arrow_downward" className="text-[16px] leading-none" />
          </button>
          <button onClick={() => quitarCampo(i)} title={tf.quitar}
            className="p-1 text-on-surface-variant hover:text-error">
            <Icon name="close" className="text-[16px] leading-none" />
          </button>
        </div>

        <div>
          <input
            className={campo}
            placeholder={tf.phEtiqueta}
            value={c.etiqueta}
            onChange={(e) => editarCampo(i, 'etiqueta', e.target.value)}
          />
          <div className="flex items-center justify-between mt-1">
            <label className="flex items-center gap-1.5 text-[12px] text-on-surface-variant cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(c.requerido)}
                onChange={(e) => editarCampo(i, 'requerido', e.target.checked)}
              />
              {tf.requerido}
            </label>
            <span className={`text-[11px] ${excede ? 'text-error' : 'text-on-surface-variant'}`}>
              {c.etiqueta.length}/{limite}
            </span>
          </div>
        </div>

        {TIPOS_CON_OPCIONES.includes(c.tipo) && (
          <div>
            <label className={label}>{tf.opciones}</label>
            <textarea
              className={`${campo} min-h-16 resize-y`}
              placeholder={tf.phOpciones}
              value={(c.opciones || []).join('\n')}
              onChange={(e) => editarCampo(i, 'opciones',
                e.target.value.split('\n').map((o) => o.trim()).filter(Boolean))}
            />
          </div>
        )}
      </div>
    )
  }

  // ---- Editor completo (panel derecho) ----
  const editor = (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-[15px] truncate">
              {seleccionadoObj ? seleccionadoObj.nombre : tf.nuevo}
            </h3>
            {seleccionadoObj && (
              <span className={`shrink-0 text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full ${ESTADO_CLASES[seleccionadoObj.estado] || ESTADO_CLASES.DRAFT}`}>
                {tf.estados[seleccionadoObj.estado] || seleccionadoObj.estado}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {seleccionadoObj && (
            confirmando === seleccionadoObj.id ? (
              <>
                <button onClick={() => eliminar(seleccionadoObj)}
                  className="text-[12px] font-display font-semibold text-error hover:opacity-80 px-2 py-1">
                  {seleccionadoObj.estado === 'PUBLISHED' ? tf.darDeBaja : tf.eliminarSi}
                </button>
                <button onClick={() => setConfirmando('')}
                  className="text-[12px] font-display text-on-surface-variant hover:text-on-surface px-2 py-1">{tf.cancelar}</button>
              </>
            ) : (
              <button onClick={() => { setConfirmando(seleccionadoObj.id); setError(''); setAviso('') }}
                title={tf.eliminarTitulo}
                className="text-on-surface-variant hover:text-error p-1.5">
                <Icon name="delete" className="text-[16px] leading-none" />
              </button>
            )
          )}
          <button onClick={() => setEditando(false)} title={tf.cancelar}
            className="text-on-surface-variant hover:text-on-surface p-1.5">
            <Icon name="close" className="text-[18px] leading-none" />
          </button>
        </div>
      </div>

      {cargandoCampos ? (
        <p className="text-[13px] text-on-surface-variant py-16 text-center">{tf.cargando}</p>
      ) : (
        <div className="grid lg:grid-cols-[1fr_280px] gap-5">
          <div className="space-y-3 min-w-0">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>{tf.labelNombre}</label>
                <input className={campo} maxLength={200} placeholder={tf.phNombre}
                  value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
                <p className="text-[11px] text-on-surface-variant mt-1">{tf.ayudaNombre}</p>
              </div>
              <div>
                <label className={label}>{tf.labelCategoria}</label>
                <select className={campo} value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{tf.categorias[c]}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>{tf.labelTitulo}</label>
                <input className={campo} maxLength={30} placeholder={tf.phTitulo}
                  value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
                <p className="text-[11px] text-on-surface-variant mt-1">{tf.ayudaTitulo}</p>
              </div>
              <div>
                <label className={label}>{tf.labelBoton}</label>
                <input className={campo} maxLength={35} placeholder={tf.phBoton}
                  value={form.boton} onChange={(e) => set('boton', e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={label} style={{ marginBottom: 0 }}>{tf.campos}</label>
                <span className="text-[11px] text-on-surface-variant">
                  {tf.restantes(MAX_CAMPOS - form.campos.length)}
                </span>
              </div>
              <div className="space-y-2">
                {form.campos.length === 0 ? (
                  <p className="text-[12px] text-on-surface-variant py-3">{tf.sinCampos}</p>
                ) : (
                  form.campos.map(tarjetaCampo)
                )}
              </div>
            </div>

            <div>
              <label className={label}>{tf.agregarCampo}</label>
              <div className="flex flex-wrap gap-1.5">
                {TIPOS.map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => agregarCampo(tipo)}
                    disabled={form.campos.length >= MAX_CAMPOS}
                    className="flex items-center gap-1 border border-dashed border-outline-variant px-2.5 py-1.5 text-[12px] font-display font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors disabled:opacity-40"
                  >
                    <Icon name="add" className="text-[14px] leading-none" />
                    {tf.tipos[tipo]}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              {yaPublicado ? tf.notaYaPublicado : confirmaPublicar ? tf.notaPublicar : tf.notaBorrador}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Un publicado ya no se puede modificar: solo queda republicar
                  como versión nueva, así que no se ofrece "guardar borrador". */}
              {!yaPublicado && (
                <button
                  onClick={() => guardar(false)}
                  disabled={!puedeGuardar}
                  className="flex items-center gap-1.5 px-4 py-2 border border-outline text-on-surface text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:bg-surface-container-high/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Icon name="save" className="text-[15px] leading-none" />
                  {guardando === 'guardando' ? tf.guardando : tf.guardarBorrador}
                </button>
              )}
              <button
                onClick={() => guardar(true)}
                disabled={!puedeGuardar}
                className={`flex items-center gap-1.5 px-4 py-2 border text-[13px] font-display font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                  confirmaPublicar
                    ? 'border-error bg-error text-on-error'
                    : 'border-primary text-primary hover:bg-primary/5'
                }`}
              >
                <Icon name="publish" className="text-[15px] leading-none" />
                {guardando === 'publicando'
                  ? tf.publicando
                  : confirmaPublicar ? tf.confirmarPublicar : tf.publicar}
              </button>
              {confirmaPublicar && (
                <button
                  onClick={() => setConfirmaPublicar('')}
                  className="text-[12px] font-display text-on-surface-variant hover:text-on-surface px-2 py-1"
                >
                  {tf.cancelar}
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <label className={label}>{tf.previa}</label>
            <PreviaFormulario titulo={form.titulo} campos={form.campos} boton={form.boton} />
          </div>
        </div>
      )}
    </div>
  )

  // Sin formularios y sin estar creando: estado vacío a pantalla completa
  if (!cargando && formularios.length === 0 && !editando) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="flex flex-col items-center text-center">
          <Icon name="assignment" className="text-outline-variant text-[44px] mb-3" />
          <p className="text-[13px] text-on-surface-variant max-w-xs mb-5">{tf.vacio}</p>
          <button
            onClick={abrirNuevo}
            className="flex items-center gap-1.5 px-4 py-2 border border-primary text-primary text-[13px] font-display font-semibold transition-all active:scale-[0.98] hover:bg-primary/5"
          >
            <Icon name="add" className="text-[16px] leading-none" />
            {tf.nuevo}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* IZQUIERDA: lista */}
      <aside className="w-[300px] shrink-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col overflow-hidden">
        <div className="flex items-center px-3 h-11 shrink-0">
          <h3 className="font-display font-bold text-[15px] truncate">{tf.titulo}</h3>
        </div>
        <div className="h-px bg-outline-variant" />
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {cargando ? (
            <p className="text-[13px] text-on-surface-variant py-6 text-center">{tf.cargando}</p>
          ) : (
            formularios.map((f) => {
              const activo = seleccionado === f.id && editando
              return (
                <button
                  key={f.id}
                  onClick={() => abrir(f)}
                  className={`w-full text-left rounded-lg px-2.5 py-2 transition-colors ${
                    activo ? 'bg-primary/5' : 'hover:bg-surface-container-high/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[13px] font-display font-semibold truncate ${activo ? 'text-primary' : ''}`}>{f.nombre}</span>
                    <span className={`shrink-0 text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full ${ESTADO_CLASES[f.estado] || ESTADO_CLASES.DRAFT}`}>
                      {tf.estados[f.estado] || f.estado}
                    </span>
                  </div>
                  <p className="text-[12px] text-on-surface-variant truncate mt-0.5">
                    {tf.categorias[f.categorias?.[0]] || f.categorias?.[0] || '—'}
                  </p>
                </button>
              )
            })
          )}

          {!cargando && (
            <button
              onClick={abrirNuevo}
              className={`w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-2.5 py-2 text-[12px] font-display font-semibold transition-colors mt-1 ${
                editando && !seleccionado
                  ? 'border-primary/40 text-primary bg-primary/5'
                  : 'border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
              }`}
            >
              <Icon name="add" className="text-[16px] leading-none" />
              {tf.nuevo}
            </button>
          )}
        </div>
      </aside>

      {/* DERECHA: editor */}
      <div className="flex-1 min-w-0 bg-surface-container overflow-y-auto">
        {aviso && (
          <div className="p-4 pb-0">
            <div className="flex items-start gap-2 rounded-xl bg-accent/15 px-3 py-2.5">
              <Icon name="check_circle" className="text-on-accent text-[16px] leading-none mt-0.5" />
              <p className="text-[12px] text-on-surface">{aviso}</p>
            </div>
          </div>
        )}
        {editando ? editor : (
          <div className="h-full flex flex-col items-center justify-center text-center p-10">
            <Icon name="assignment" className="text-outline-variant text-[40px] mb-3" />
            <p className="text-[13px] text-on-surface-variant max-w-xs">{tf.seleccionaVacio}</p>
          </div>
        )}
      </div>
    </div>
  )
}
