import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../shared/Icon'

import { apiFetch } from '../../utils/api'

// Checkout de suscripción (Aliwa cobra al negocio vía Openpay by BBVA).
// Cumple el checklist de certificación de Openpay (Checklist VT):
//  - formulario completo (16 díg. tarjeta, 4 CVV, expiración MM/AA)
//  - estado "procesando" que evita pagos duplicados
//  - mensajes de estatus de transacción: éxito y fallida (por tipo de declinación)
//  - marcas de tarjeta (Visa/Mastercard/Amex) + sello Openpay
//
// Tokenización real con Openpay.js (sandbox). Tarjetas de prueba:
//   4111 1111 1111 1111 → aprobada  ·  4222 2222 2222 2220 → rechazada
//   5555 5555 5555 4444 → aprobada (MC)
//
// Modalidades de pago:
//   mensual    → cargo automático cada mes (suscripción Openpay)
//   adelantado → un solo cargo por N meses
//   unico      → pago de 1 mes; recordatorio al vencer (botón o notificación)
const MARKETING_URL = 'https://aliwa.mx'

function money(n) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function soloDigitos(s, max) {
  return s.replace(/\D/g, '').slice(0, max)
}
function formatoTarjeta(s) {
  return soloDigitos(s, 16).replace(/(.{4})/g, '$1 ').trim()
}
function formatoVenc(s) {
  const d = soloDigitos(s, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`
}

const ERRORES = {
  rechazada: { titulo: 'Tarjeta rechazada', msg: 'El pago no pudo ser realizado, intenta de nuevo.' },
  fondos: { titulo: 'Fondos insuficientes', msg: 'Tu pago no pudo ser realizado. Intenta con otra tarjeta.' },
  error: { titulo: 'Transacción fallida', msg: 'Ocurrió un error, intenta de nuevo o comunícate con tu banco.' },
}

const MODALIDADES = [
  {
    id: 'mensual', icono: 'autorenew', titulo: 'Mensual automático',
    desc: 'Se cobra solo cada mes. Cancela cuando quieras.',
  },
  {
    id: 'adelantado', icono: 'calendar_month', titulo: 'Meses por adelantado',
    desc: 'Paga varios meses en un solo cargo.',
  },
  {
    id: 'unico', icono: 'notifications_active', titulo: 'Pago único',
    desc: 'Pagas 1 mes, sin cargos automáticos. Te recordamos renovar.',
  },
]

const MESES_OPCIONES = [3, 6, 12]

// Carga Openpay.js + antifraude una sola vez
let openpayPromise = null
function cargarOpenpay() {
  if (openpayPromise) return openpayPromise
  openpayPromise = new Promise((resolve, reject) => {
    const cargar = (src) => new Promise((res, rej) => {
      const s = document.createElement('script')
      s.src = src
      s.onload = res
      s.onerror = () => rej(new Error(`No se pudo cargar ${src}`))
      document.head.appendChild(s)
    })
    cargar('https://js.openpay.mx/openpay.v1.min.js')
      .then(() => cargar('https://js.openpay.mx/openpay-data.v1.min.js'))
      .then(() => resolve(window.OpenPay))
      .catch(reject)
  })
  return openpayPromise
}

function MarcaTarjeta({ children, color }) {
  return (
    <span className="text-[10px] font-display font-bold px-1.5 py-0.5 rounded border border-outline-variant/50" style={{ color }}>
      {children}
    </span>
  )
}

function SelloOpenpay() {
  return (
    <div className="flex items-center gap-1.5 text-on-surface-variant">
      <Icon name="verified_user" className="text-primary text-[16px] leading-none" />
      <span className="text-[11px] font-display">Procesa <span className="font-bold text-on-surface">Openpay</span> <span className="text-on-surface-variant">by BBVA</span></span>
    </div>
  )
}

export default function SuscripcionCheckout() {
  const [paso, setPaso] = useState(1)
  // idle | procesando | exito | error | spei (esperando transferencia) | tresds (esperando 3D Secure)
  const [estado, setEstado] = useState('idle')
  const [errorTipo, setErrorTipo] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [acepta, setAcepta] = useState(false)
  const [tarjeta, setTarjeta] = useState('')
  const [titular, setTitular] = useState('')
  const [venc, setVenc] = useState('')
  const [cvv, setCvv] = useState('')

  // Método de pago y tarjetas guardadas
  const [metodoPago, setMetodoPago] = useState('tarjeta') // tarjeta | spei
  const [tarjetas, setTarjetas] = useState([])
  const [tarjetaSel, setTarjetaSel] = useState('') // '' = nueva tarjeta | card_id
  const [guardarTarjeta, setGuardarTarjeta] = useState(false)
  const [speiInfo, setSpeiInfo] = useState(null)
  const [bancoSel, setBancoSel] = useState('')
  const [urlTresDs, setUrlTresDs] = useState('')
  const [pagoPendienteId, setPagoPendienteId] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [avisoVerificacion, setAvisoVerificacion] = useState('')

  // Modalidad de pago
  const [modalidad, setModalidad] = useState('mensual')
  const [meses, setMeses] = useState(3)
  const [recordatorio, setRecordatorio] = useState('boton') // boton | notificacion

  // Datos del servidor
  const [plan, setPlan] = useState({ nombre: 'Profesional', precio: 799 })
  const [planes, setPlanes] = useState([])
  const [planOpen, setPlanOpen] = useState(false)
  const [modalidadOpen, setModalidadOpen] = useState(false)
  const [suscripcion, setSuscripcion] = useState(null)
  const [resultado, setResultado] = useState(null)
  const deviceSessionRef = useRef('')

  useEffect(() => {
    // Estado de la suscripción (plan real de la cuenta)
    apiFetch('/api/pagos/suscripcion/').then(({ res, data }) => {
      if (!res.ok) return
      if (data.suscripcion?.plan) setPlan(data.suscripcion.plan)
      else if (data.planes?.length) setPlan(data.planes[0])
      setPlanes(data.planes || [])
      setSuscripcion(data.suscripcion)
    }).catch(() => {})

    // Tarjetas guardadas
    apiFetch('/api/pagos/tarjetas/').then(({ res, data }) => {
      if (res.ok && data.tarjetas?.length) {
        setTarjetas(data.tarjetas)
        setTarjetaSel(data.tarjetas[0].id)
      }
    }).catch(() => {})

    // Openpay.js + sesión antifraude
    Promise.all([cargarOpenpay(), apiFetch('/api/pagos/openpay-config/')])
      .then(([OP, { res, data }]) => {
        if (!res.ok) throw new Error('config')
        OP.setId(data.merchant_id)
        OP.setApiKey(data.public_key)
        OP.setSandboxMode(!!data.sandbox)
        deviceSessionRef.current = OP.deviceData.setup()
      })
      .catch(() => {})
  }, [])

  const mesesEfectivos = modalidad === 'adelantado' ? meses : 1
  const total = plan.precio * mesesEfectivos
  const subtotal = total / 1.16
  const iva = total - subtotal
  const usaTarjetaGuardada = metodoPago === 'tarjeta' && tarjetaSel
  const formularioListo = acepta && (
    metodoPago === 'spei'
    || usaTarjetaGuardada
    || (tarjeta.replace(/\D/g, '').length >= 15 && titular.trim() && venc.length === 5 && cvv.length >= 3)
  )

  const etiquetaCobro = useMemo(() => {
    if (modalidad === 'mensual') return `$${money(total)}/mes`
    if (modalidad === 'adelantado') return `$${money(total)} · ${meses} meses`
    return `$${money(total)} · 1 mes`
  }, [modalidad, meses, total])

  const pagar = async () => {
    if (!formularioListo || estado === 'procesando') return
    setEstado('procesando')
    setErrorMsg('')
    setAvisoVerificacion('')

    try {
      const body = {
        modalidad,
        meses: mesesEfectivos,
        recordatorio_tipo: recordatorio,
        plan: plan.slug,
        device_session_id: deviceSessionRef.current,
      }

      if (metodoPago === 'spei') {
        body.metodo = 'spei'
      } else if (usaTarjetaGuardada) {
        body.card_id = tarjetaSel
      } else {
        // Tokenizar la tarjeta nueva en el navegador (no viaja al backend)
        const OP = await cargarOpenpay()
        const [expMes, expAnio] = venc.split('/')
        body.token_id = await new Promise((resolve, reject) => {
          OP.token.create({
            card_number: tarjeta.replace(/\D/g, ''),
            holder_name: titular.trim(),
            expiration_month: expMes,
            expiration_year: expAnio,
            cvv2: cvv,
          }, (r) => resolve(r.data.id), (e) => reject(e))
        })
        body.guardar_tarjeta = guardarTarjeta
      }

      const { res, data } = await apiFetch('/api/pagos/suscripcion/checkout/', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      if (res.ok && data.ok) {
        if (data.spei) {
          // Transferencia: mostrar CLABE y esperar el depósito
          setSpeiInfo(data.spei)
          setPagoPendienteId(data.pago.id)
          setEstado('spei')
        } else if (data.requiere_3ds) {
          // Antifraude pidió 3D Secure: abrir la verificación del banco
          setUrlTresDs(data.url_3ds)
          setPagoPendienteId(data.pago.id)
          setEstado('tresds')
          window.open(data.url_3ds, '_blank', 'noopener')
        } else {
          setResultado(data)
          setSuscripcion(data.suscripcion)
          setEstado('exito')
        }
      } else {
        setErrorTipo(data.error_tipo || 'error')
        setErrorMsg(data.error || '')
        setEstado('error')
      }
    } catch (e) {
      // Error de tokenización de Openpay.js (tarjeta inválida, etc.)
      const desc = e?.data?.description || ''
      setErrorTipo(/insufficient|fondos/i.test(desc) ? 'fondos' : (desc ? 'rechazada' : 'error'))
      setErrorMsg(desc)
      setEstado('error')
    }
  }

  // Confirma un pago pendiente (SPEI o 3D Secure) contra Openpay
  const verificarPago = async () => {
    if (!pagoPendienteId || verificando) return
    setVerificando(true)
    setAvisoVerificacion('')
    try {
      const { res, data } = await apiFetch('/api/pagos/suscripcion/verificar/', {
        method: 'POST',
        body: JSON.stringify({ pago_id: pagoPendienteId }),
      })
      if (res.ok && data.estado === 'pagado') {
        setResultado(data)
        if (data.suscripcion) setSuscripcion(data.suscripcion)
        setEstado('exito')
      } else if (data.estado === 'fallido') {
        setErrorTipo('error')
        setErrorMsg('')
        setEstado('error')
      } else {
        setAvisoVerificacion('Aún no recibimos la confirmación. Intenta de nuevo en unos momentos.')
      }
    } catch {
      setAvisoVerificacion('No se pudo verificar. Intenta de nuevo.')
    } finally {
      setVerificando(false)
    }
  }


  return (
    <div className="min-h-full w-full font-body @container">
      <div className="w-full">
        {/* Encabezado */}
        <div className="flex items-center justify-end mb-2">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-display text-on-surface-variant">
            <Icon name="lock" className="text-[15px] leading-none" />
            Pago seguro
          </span>
        </div>

        {/* Container query: el resumen va a la derecha; solo se apila en
            espacios muy angostos (móvil) */}
        <div className="grid @xl:grid-cols-[minmax(0,1fr)_280px] gap-5">
          {/* Columna principal */}
          <div className="min-w-0 px-2 md:px-4 pb-4">
            {/* PASO 1 — Plan + modalidad de pago */}
            {estado === 'idle' && paso === 1 && (
              <div>
                <h1 className="font-display text-[22px] font-bold text-on-surface mb-1">Confirma tu suscripción</h1>
                <p className="text-[14px] text-on-surface-variant leading-[1.6] mb-5">
                  Elige tu plan y cómo quieres pagarlo.
                </p>

                {/* Selector de plan — desplegable */}
                <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-2">Plan</p>
                <div className="relative mb-5">
                  <button onClick={() => setPlanOpen(!planOpen)}
                    className="w-full flex items-center gap-3 rounded-xl border border-outline-variant p-3.5 text-left transition-all hover:bg-surface-container-high/40">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon name="workspace_premium" className="text-primary text-[18px] leading-none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-[13px] text-on-surface">
                        {plan.nombre}
                        {suscripcion?.plan?.slug === plan.slug && <span className="ml-1.5 text-[10px] font-display font-semibold text-primary">· actual</span>}
                      </p>
                      <p className="text-[12px] text-on-surface-variant">${money(plan.precio)}<span className="text-[10px]">/mes</span></p>
                    </div>
                    <Icon name={planOpen ? 'expand_less' : 'expand_more'} className="text-on-surface-variant text-[18px] shrink-0" />
                  </button>

                  {planOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPlanOpen(false)} />
                      <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
                        {(planes.length ? planes : [plan]).map((p) => {
                          const activo = p.slug === plan.slug || (!p.slug && p.nombre === plan.nombre)
                          const esActual = suscripcion?.plan?.slug && suscripcion.plan.slug === p.slug
                          return (
                            <button key={p.slug || p.nombre}
                              onClick={() => { setPlan(p); setPlanOpen(false) }}
                              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                                activo ? 'bg-primary/3' : 'hover:bg-surface-container-high/50'
                              }`}>
                              <div className="flex-1 min-w-0">
                                <p className={`font-display text-[13px] ${activo ? 'text-selected font-bold' : 'text-on-surface font-semibold'}`}>
                                  {p.nombre}
                                  {esActual && <span className="ml-1.5 text-[10px] font-display font-semibold text-primary">· actual</span>}
                                </p>
                              </div>
                              <span className="text-[12px] text-on-surface-variant shrink-0">${money(p.precio)}<span className="text-[10px]">/mes</span></span>
                              {activo && <Icon name="check" className="text-selected text-[16px] shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Modalidad — desplegable (mismo patrón que Plan) */}
                <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-2">Modalidad de pago</p>
                <div className="relative mb-5">
                  {(() => {
                    const mActiva = MODALIDADES.find((m) => m.id === modalidad)
                    return (
                      <button onClick={() => setModalidadOpen(!modalidadOpen)}
                        className="w-full flex items-center gap-3 rounded-xl border border-outline-variant p-3.5 text-left transition-all hover:bg-surface-container-high/40">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon name={mActiva.icono} className="text-primary text-[18px] leading-none" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-[13px] text-on-surface">{mActiva.titulo}</p>
                          <p className="text-[12px] text-on-surface-variant">{mActiva.desc}</p>
                        </div>
                        <Icon name={modalidadOpen ? 'expand_less' : 'expand_more'} className="text-on-surface-variant text-[18px] shrink-0" />
                      </button>
                    )
                  })()}

                  {modalidadOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setModalidadOpen(false)} />
                      <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
                        {MODALIDADES.map((m) => {
                          const activo = modalidad === m.id
                          return (
                            <button key={m.id}
                              onClick={() => {
                                setModalidad(m.id)
                                setModalidadOpen(false)
                                // El cobro mensual automático solo acepta tarjeta
                                if (m.id === 'mensual') setMetodoPago('tarjeta')
                              }}
                              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                                activo ? 'bg-primary/3' : 'hover:bg-surface-container-high/50'
                              }`}>
                              <Icon name={m.icono} className={`text-[16px] leading-none shrink-0 ${activo ? 'text-selected' : 'text-on-surface-variant'}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`font-display text-[13px] ${activo ? 'text-selected font-bold' : 'text-on-surface font-semibold'}`}>{m.titulo}</p>
                                <p className="text-[12px] text-on-surface-variant">{m.desc}</p>
                              </div>
                              {activo && <Icon name="check" className="text-selected text-[16px] shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Sub-opciones: meses por adelantado */}
                {modalidad === 'adelantado' && (
                  <div className="mb-5">
                    <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-2">¿Cuántos meses?</p>
                    <div className="flex gap-2">
                      {MESES_OPCIONES.map((n) => (
                        <button key={n} onClick={() => setMeses(n)}
                          className={`flex-1 py-2.5 rounded-xl border font-display font-semibold text-[13px] transition-all ${
                            meses === n ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-outline-variant'
                          }`}>
                          {n} meses
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-opciones: recordatorio para pago único */}
                {modalidad === 'unico' && (
                  <div className="mb-5">
                    <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-2">Recordatorio al vencer</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'boton', icono: 'smart_button', titulo: 'Con botón de pago', desc: 'Renueva al instante.' },
                        { id: 'notificacion', icono: 'notifications', titulo: 'Solo notificación', desc: 'Tú decides cuándo pagar.' },
                      ].map((r) => (
                        <button key={r.id} onClick={() => setRecordatorio(r.id)}
                          className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                            recordatorio === r.id ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-outline-variant'
                          }`}>
                          <Icon name={r.icono} className={`text-[16px] leading-none mt-0.5 ${recordatorio === r.id ? 'text-primary' : 'text-on-surface-variant'}`} />
                          <span className="flex-1 min-w-0">
                            <span className="block font-display font-semibold text-[13px] text-on-surface">{r.titulo}</span>
                            <span className="block text-[12px] text-on-surface-variant leading-[1.4]">{r.desc}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-on-surface-variant/70 mt-1.5">Te avisamos 3 días antes del vencimiento.</p>
                  </div>
                )}

              </div>
            )}

            {/* PASO 2 — Datos de pago */}
            {(estado === 'idle' || estado === 'procesando') && paso === 2 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h1 className="font-display text-[22px] font-bold text-on-surface">Datos de pago</h1>
                  {metodoPago === 'tarjeta' && (
                    <div className="flex items-center gap-1.5">
                      <MarcaTarjeta color="#1a1f71">VISA</MarcaTarjeta>
                      <MarcaTarjeta color="#eb001b">Mastercard</MarcaTarjeta>
                      <MarcaTarjeta color="#006fcf">AMEX</MarcaTarjeta>
                    </div>
                  )}
                </div>
                <p className="text-[13px] text-on-surface-variant leading-[1.6] mb-5">
                  Procesado por Openpay by BBVA. <span className="text-on-surface font-medium">Tu tarjeta se tokeniza en tu navegador</span> — no almacenamos tus datos.
                </p>

                {/* Método de pago: tarjeta o transferencia. Elegir Transferencia
                    con modalidad mensual cambia a pago único (SPEI no puede
                    cobrarse de forma recurrente). */}
                <div className="mb-5">
                  <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-2">Método de pago</p>
                  <div className="flex gap-2">
                    {[
                      { id: 'tarjeta', icono: 'credit_card', label: 'Tarjeta' },
                      { id: 'spei', icono: 'account_balance', label: 'Transferencia' },
                    ].map((m) => (
                      <button key={m.id}
                        onClick={() => {
                          setMetodoPago(m.id)
                          if (m.id === 'spei' && modalidad === 'mensual') setModalidad('unico')
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-display font-semibold text-[13px] transition-all ${
                          metodoPago === m.id
                            ? 'border-primary bg-primary/5 text-selected'
                            : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high/40'
                        }`}>
                        <Icon name={m.icono} className="text-[16px] leading-none" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {modalidad === 'mensual' && (
                    <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                      Al elegir Transferencia el pago cambia a único: el cobro mensual automático requiere tarjeta.
                    </p>
                  )}
                </div>

                {metodoPago === 'spei' ? (
                  <div className="border border-outline-variant rounded-xl p-4 mb-2">
                    <div className="flex items-start gap-2.5">
                      <Icon name="account_balance" className="text-primary text-[18px] leading-none mt-0.5" />
                      <p className="text-[13px] text-on-surface-variant leading-[1.6]">
                        Te daremos una <span className="font-medium text-on-surface">CLABE única</span> para
                        transferir desde tu banca en línea. Tu plan se activa en cuanto recibimos el pago.
                      </p>
                    </div>
                  </div>
                ) : (
                <>
                {/* Tarjetas guardadas */}
                {tarjetas.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {tarjetas.map((t) => (
                      <button key={t.id} onClick={() => setTarjetaSel(t.id)}
                        className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                          tarjetaSel === t.id ? 'border-primary bg-primary/3' : 'border-outline-variant hover:bg-surface-container-high/40'
                        }`}>
                        <Icon name="credit_card" className={`text-[18px] leading-none ${tarjetaSel === t.id ? 'text-selected' : 'text-on-surface-variant'}`} />
                        <span className="flex-1 min-w-0">
                          <span className={`block font-display text-[13px] ${tarjetaSel === t.id ? 'text-selected font-bold' : 'text-on-surface font-semibold'}`}>
                            {(t.marca || 'Tarjeta').toUpperCase()} •••• {t.ultimos4}
                          </span>
                          <span className="block text-[11px] text-on-surface-variant">{t.titular} · vence {t.expira}</span>
                        </span>
                        {tarjetaSel === t.id && <Icon name="check" className="text-selected text-[16px]" />}
                      </button>
                    ))}
                    <button onClick={() => setTarjetaSel('')}
                      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        !tarjetaSel ? 'border-primary bg-primary/3' : 'border-outline-variant hover:bg-surface-container-high/40'
                      }`}>
                      <Icon name="add_card" className={`text-[18px] leading-none ${!tarjetaSel ? 'text-selected' : 'text-on-surface-variant'}`} />
                      <span className={`font-display text-[13px] ${!tarjetaSel ? 'text-selected font-bold' : 'text-on-surface-variant font-semibold'}`}>Usar otra tarjeta</span>
                    </button>
                  </div>
                )}

                {!usaTarjetaGuardada && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">Número de tarjeta</label>
                      <input type="text" inputMode="numeric" value={tarjeta} onChange={(e) => setTarjeta(formatoTarjeta(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        className="w-full bg-surface-container-high/50 rounded-xl px-4 py-3 text-[14px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">Nombre del titular</label>
                      <input type="text" value={titular} onChange={(e) => setTitular(e.target.value)} placeholder="Como aparece en la tarjeta"
                        className="w-full bg-surface-container-high/50 rounded-xl px-4 py-3 text-[14px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">Expiración (MM/AA)</label>
                      <input type="text" inputMode="numeric" value={venc} onChange={(e) => setVenc(formatoVenc(e.target.value))} placeholder="MM/AA"
                        className="w-full bg-surface-container-high/50 rounded-xl px-4 py-3 text-[14px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">CVV</label>
                      <input type="text" inputMode="numeric" value={cvv} onChange={(e) => setCvv(soloDigitos(e.target.value, 4))} placeholder="1234"
                        className="w-full bg-surface-container-high/50 rounded-xl px-4 py-3 text-[14px] font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>

                  {/* Guardar tarjeta: en mensual/adelantado se guarda por diseño */}
                  {modalidad === 'unico' ? (
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={guardarTarjeta} onChange={(e) => setGuardarTarjeta(e.target.checked)} className="accent-primary w-4 h-4" />
                      <span className="text-[12px] text-on-surface-variant">Guardar esta tarjeta para futuros pagos</span>
                    </label>
                  ) : (
                    <p className="text-[11px] text-on-surface-variant/70">
                      Tu tarjeta se guardará de forma segura en Openpay para este cobro.
                    </p>
                  )}
                </div>
                )}
                </>
                )}

                <label className="flex items-start gap-2.5 mt-5 mb-6 cursor-pointer">
                  <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 accent-primary w-4 h-4" />
                  <span className="text-[12px] text-on-surface-variant leading-[1.5]">
                    Acepto los{' '}
                    <a href={`${MARKETING_URL}/terminos`} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">Términos y Condiciones</a>
                    {' '}y el{' '}
                    <a href={`${MARKETING_URL}/privacidad`} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">Aviso de Privacidad</a>.
                    {modalidad === 'mensual' && <> Autorizo el <span className="font-medium text-on-surface">cargo recurrente mensual</span>.</>}
                  </span>
                </label>

                <button onClick={() => setPaso(1)} disabled={estado === 'procesando'}
                  className="mt-4 py-2 text-[12px] font-display text-on-surface-variant hover:text-on-surface transition-colors">
                  ← Cambiar modalidad de pago
                </button>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-on-surface-variant">
                  <Icon name="lock" className="text-[14px] leading-none" />
                  Conexión cifrada · PCI DSS · Openpay by BBVA
                </div>
              </div>
            )}

            {/* SPEI — instrucciones de transferencia */}
            {estado === 'spei' && speiInfo && (
              <div className="max-w-md">
                <div className="flex items-center gap-2.5 mb-2">
                  <Icon name="account_balance" className="text-primary text-[22px] leading-none" />
                  <h1 className="font-display text-[22px] font-bold text-on-surface">Transfiere para activar tu plan</h1>
                </div>
                <p className="text-[13px] text-on-surface-variant leading-[1.6] mb-2">
                  Paga <span className="font-semibold text-on-surface">${money(speiInfo.monto)} MXN</span> desde
                  tu banca en línea. Tu plan <span className="font-semibold text-on-surface">{plan.nombre}</span> se
                  activa al recibir el pago.
                </p>
                {speiInfo.vence && (
                  <p className="text-[12px] text-on-surface-variant mb-5">
                    <Icon name="schedule" className="text-[14px] leading-none align-[-2px] mr-1" />
                    Fecha límite de pago: <span className="font-display font-semibold text-on-surface">
                      {new Date(speiInfo.vence).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' })}
                    </span>
                  </p>
                )}

                {/* Selector de banco → pasos e instrucciones oficiales de Openpay */}
                <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-1.5">
                  ¿Desde qué banco vas a pagar?
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {['BBVA', 'Banorte', 'Santander', 'Banamex', 'HSBC', 'Scotiabank', 'Otro banco'].map((b) => (
                    <button key={b} onClick={() => setBancoSel(b)}
                      className={`px-3 py-1.5 rounded-lg border font-display font-semibold text-[12px] transition-all ${
                        bancoSel === b ? 'border-primary bg-primary/5 text-selected' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high/40'
                      }`}>
                      {b}
                    </button>
                  ))}
                </div>

                {bancoSel === 'BBVA' ? (
                  <>
                    {/* BBVA: pago de servicios con convenio CIE */}
                    <ol className="space-y-1.5 mb-4 text-[13px] text-on-surface-variant leading-[1.6] list-decimal pl-5">
                      <li>Entra a tu banca en línea BBVA y en el menú <span className="font-medium text-on-surface">"Pagar"</span> elige <span className="font-medium text-on-surface">"De servicios"</span>.</li>
                      <li>Ingresa el <span className="font-medium text-on-surface">número de convenio CIE</span>.</li>
                      <li>Captura la <span className="font-medium text-on-surface">referencia</span>, el <span className="font-medium text-on-surface">importe</span> y el concepto para concluir.</li>
                    </ol>
                    <div className="border border-outline-variant rounded-xl divide-y divide-outline-variant mb-4">
                      {[
                        ['Convenio CIE', speiInfo.convenio, true],
                        ['Referencia', speiInfo.referencia, true],
                        ['Importe', `$${money(speiInfo.monto)} MXN`],
                        ['Concepto', speiInfo.concepto],
                      ].filter(([, v]) => v).map(([k, v, copiable]) => (
                        <div key={k} className="flex items-center justify-between px-4 py-3">
                          <span className="text-[12px] text-on-surface-variant">{k}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-[13px] font-display font-semibold text-on-surface tracking-wide">{v}</span>
                            {copiable && (
                              <button onClick={() => navigator.clipboard?.writeText(v)} title="Copiar"
                                className="text-on-surface-variant hover:text-on-surface transition-colors">
                                <Icon name="content_copy" className="text-[15px] leading-none" />
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : bancoSel ? (
                  <>
                    {/* Otros bancos: transferencia SPEI a la CLABE */}
                    <ol className="space-y-1.5 mb-4 text-[13px] text-on-surface-variant leading-[1.6] list-decimal pl-5">
                      <li>En tu banca en línea registra la <span className="font-medium text-on-surface">cuenta beneficiaria</span> con el banco destino, la CLABE y el beneficiario de abajo.</li>
                      <li>Ve a <span className="font-medium text-on-surface">transferencias / pagos a terceros</span> y transfiere el <span className="font-medium text-on-surface">monto exacto</span>.</li>
                      <li>En el <span className="font-medium text-on-surface">concepto</span> coloca la referencia numérica; en la <span className="font-medium text-on-surface">referencia</span> el convenio CIE.</li>
                    </ol>
                    <div className="border border-outline-variant rounded-xl divide-y divide-outline-variant mb-4">
                      {[
                        ['Beneficiario', speiInfo.beneficiario],
                        ['Banco destino', speiInfo.banco],
                        ['CLABE', speiInfo.clabe, true],
                        ['Concepto de pago', speiInfo.referencia, true],
                        ['Referencia', speiInfo.convenio, true],
                        ['Importe', `$${money(speiInfo.monto)} MXN`],
                      ].filter(([, v]) => v).map(([k, v, copiable]) => (
                        <div key={k} className="flex items-center justify-between px-4 py-3">
                          <span className="text-[12px] text-on-surface-variant">{k}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-[13px] font-display font-semibold text-on-surface tracking-wide">{v}</span>
                            {copiable && (
                              <button onClick={() => navigator.clipboard?.writeText(v)} title="Copiar"
                                className="text-on-surface-variant hover:text-on-surface transition-colors">
                                <Icon name="content_copy" className="text-[15px] leading-none" />
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[12px] text-on-surface-variant border border-outline-variant rounded-lg p-3 mb-4">
                    Selecciona tu banco para ver los pasos y los datos de pago.
                  </p>
                )}

                {speiInfo.url_recibo && (
                  <a href={speiInfo.url_recibo} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] font-display font-semibold text-primary hover:underline mb-4">
                    <Icon name="download" className="text-[16px] leading-none" />
                    Descargar ficha de pago (PDF)
                  </a>
                )}
                {avisoVerificacion && (
                  <p className="text-[12px] text-on-surface-variant border border-outline-variant rounded-lg p-2.5 mb-3">{avisoVerificacion}</p>
                )}
                <button onClick={verificarPago} disabled={verificando}
                  className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                  {verificando && <span className="w-4 h-4 border-2 border-on-primary/40 border-t-on-primary rounded-full animate-spin" />}
                  Ya transferí — verificar pago
                </button>
                <p className="text-[11px] text-on-surface-variant/70 mt-3 leading-[1.5]">
                  También lo detectaremos automáticamente en cuanto tu banco procese la transferencia.
                </p>
              </div>
            )}

            {/* 3D SECURE — esperando verificación del banco */}
            {estado === 'tresds' && (
              <div className="text-center py-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full border border-outline-variant flex items-center justify-center mx-auto mb-5">
                  <Icon name="verified_user" className="text-primary text-[30px] leading-none" />
                </div>
                <h1 className="font-display text-[22px] font-bold text-on-surface mb-2">Verificación 3D Secure</h1>
                <p className="text-[14px] text-on-surface-variant leading-[1.6] mb-4">
                  Tu banco pidió confirmar tu identidad. Completa la verificación en la
                  ventana que se abrió y vuelve aquí.
                </p>
                <a href={urlTresDs} target="_blank" rel="noopener noreferrer"
                  className="text-[13px] font-display font-semibold text-primary hover:underline">
                  Reabrir la verificación →
                </a>
                {avisoVerificacion && (
                  <p className="text-[12px] text-on-surface-variant border border-outline-variant rounded-lg p-2.5 mt-4">{avisoVerificacion}</p>
                )}
                <button onClick={verificarPago} disabled={verificando}
                  className="block mx-auto mt-5 bg-primary text-on-primary px-6 py-2.5 rounded-lg font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50">
                  {verificando ? 'Verificando…' : 'Ya completé la verificación'}
                </button>
              </div>
            )}

            {/* RESULTADO — Éxito */}
            {estado === 'exito' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-5">
                  <Icon name="check" className="text-on-accent text-[32px] leading-none" fill />
                </div>
                <h1 className="font-display text-[22px] font-bold text-on-surface mb-2">¡Pago recibido!</h1>
                <p className="text-[14px] text-on-surface-variant leading-[1.6] max-w-sm mx-auto mb-6">
                  Gracias por tu compra. Tu plan <span className="font-semibold text-on-surface">{plan.nombre}</span> está activo
                  {resultado?.suscripcion?.periodo_fin && <> hasta el <span className="font-semibold text-on-surface">{new Date(resultado.suscripcion.periodo_fin).toLocaleDateString('es-MX')}</span></>}.
                </p>
                <div className="inline-flex flex-col gap-1 rounded-xl border border-outline-variant px-6 py-4 text-left mb-6">
                  <div className="flex justify-between gap-8 text-[13px]"><span className="text-on-surface-variant">Plan</span><span className="font-display font-semibold text-on-surface">Aliwa {plan.nombre}</span></div>
                  <div className="flex justify-between gap-8 text-[13px]"><span className="text-on-surface-variant">Modalidad</span><span className="font-display font-semibold text-on-surface">
                    {modalidad === 'mensual' ? 'Mensual automático' : modalidad === 'adelantado' ? `${mesesEfectivos} meses adelantados` : 'Pago único'}
                  </span></div>
                  <div className="flex justify-between gap-8 text-[13px]"><span className="text-on-surface-variant">Monto</span><span className="font-display font-semibold text-on-surface">${money(total)}</span></div>
                  {resultado?.pago?.tarjeta && (
                    <div className="flex justify-between gap-8 text-[13px]"><span className="text-on-surface-variant">Tarjeta</span><span className="font-display font-semibold text-on-surface">{resultado.pago.tarjeta}</span></div>
                  )}
                </div>
                <p className="text-[12px] text-on-surface-variant max-w-sm mx-auto">
                  {modalidad === 'mensual' && 'El siguiente cargo se hará automáticamente cada mes.'}
                  {modalidad === 'adelantado' && 'Te avisaremos antes de que termine tu periodo pagado.'}
                  {modalidad === 'unico' && (recordatorio === 'boton'
                    ? 'Te enviaremos un recordatorio con botón de pago 3 días antes del vencimiento.'
                    : 'Te enviaremos una notificación de recordatorio 3 días antes del vencimiento.')}
                </p>
              </div>
            )}

            {/* RESULTADO — Fallida (mensaje según tipo de declinación) */}
            {estado === 'error' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-error/15 flex items-center justify-center mx-auto mb-5">
                  <Icon name="close" className="text-error text-[32px] leading-none" />
                </div>
                <h1 className="font-display text-[22px] font-bold text-on-surface mb-2">{ERRORES[errorTipo]?.titulo || 'Transacción fallida'}</h1>
                <p className="text-[14px] text-on-surface-variant leading-[1.6] max-w-sm mx-auto mb-2">
                  {ERRORES[errorTipo]?.msg || 'Tu pago no pudo ser realizado, intenta de nuevo.'}
                </p>
                {errorMsg && <p className="text-[11px] text-on-surface-variant/70 max-w-sm mx-auto mb-4">{errorMsg}</p>}
                <button onClick={() => { setEstado('idle'); setPaso(2) }} className="block mx-auto mt-4 bg-accent text-on-accent px-8 py-3 rounded-xl font-display font-semibold hover:bg-accent-dim transition-all active:scale-[0.98]">
                  Intentar de nuevo
                </button>
                <p className="text-[11px] text-on-surface-variant/70 mt-4">No se realizó ningún cargo.</p>
              </div>
            )}
          </div>

          {/* Resumen del pedido (carrito) */}
          <aside className="min-w-0 border-l border-outline-variant pl-5 h-fit">
            <p className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase mb-4">Resumen</p>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-display font-semibold text-[14px] text-on-surface">Plan {plan.nombre}</p>
                <p className="text-[12px] text-on-surface-variant">
                  {modalidad === 'mensual' ? 'Suscripción mensual' : modalidad === 'adelantado' ? `${mesesEfectivos} meses por adelantado` : 'Pago único (1 mes)'}
                </p>
              </div>
              <p className="font-display font-semibold text-[14px] text-on-surface">${money(total)}</p>
            </div>
            <div className="h-px bg-outline-variant my-4" />
            <div className="space-y-1.5 text-[13px]">
              <div className="flex justify-between"><span className="text-on-surface-variant">Subtotal</span><span className="text-on-surface">${money(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">IVA (16%)</span><span className="text-on-surface">${money(iva)}</span></div>
            </div>
            <div className="h-px bg-outline-variant my-4" />
            <div className="flex justify-between items-baseline">
              <span className="font-display font-bold text-[14px] text-on-surface">Total</span>
              <span className="font-display font-bold text-[18px] text-on-surface">${money(total)}{modalidad === 'mensual' && <span className="text-[12px] font-normal text-on-surface-variant"> /mes</span>}</span>
            </div>
            <p className="text-[11px] text-on-surface-variant/70 mt-3 leading-[1.5]">
              IVA incluido.{' '}
              {modalidad === 'mensual' && 'Cobro recurrente mensual. Cancela cuando quieras.'}
              {modalidad === 'adelantado' && 'Un solo cargo por el periodo completo.'}
              {modalidad === 'unico' && 'Sin cargos automáticos.'}
            </p>
            {suscripcion?.periodo_fin && suscripcion.estado === 'activa' && (
              <p className="text-[11px] text-primary mt-2 leading-[1.5]">
                Suscripción activa hasta {new Date(suscripcion.periodo_fin).toLocaleDateString('es-MX')}.
              </p>
            )}

            {/* CTA del flujo: continuar (paso 1) o pagar (paso 2) */}
            {(estado === 'idle' || estado === 'procesando') && (
              paso === 1 ? (
                <button onClick={() => setPaso(2)}
                  className="w-full mt-5 bg-accent text-on-accent py-3 rounded-xl font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:bg-accent-dim">
                  Continuar al pago
                </button>
              ) : (
                <button onClick={pagar} disabled={!formularioListo || estado === 'procesando'}
                  className="w-full mt-5 bg-accent text-on-accent py-3 rounded-xl font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {estado === 'procesando' ? (
                    <><span className="w-4 h-4 border-2 border-on-accent/40 border-t-on-accent rounded-full animate-spin" /> Procesando…</>
                  ) : (
                    <>Pagar · {etiquetaCobro}</>
                  )}
                </button>
              )
            )}

            <div className="mt-5 pt-4 border-t border-outline-variant">
              <SelloOpenpay />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
