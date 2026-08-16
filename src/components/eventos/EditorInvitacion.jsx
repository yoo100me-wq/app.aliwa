// Editor de invitaciones: controles a la izquierda, previa viva a la derecha.
//
// La previa es un IFRAME a invitacion.aliwa.mx/preview, no componentes copiados
// aquí. Le mandamos el JSON por postMessage en cada cambio y él lo pinta con el
// mismo código que verán las invitadas — si el editor tuviera su propia copia
// de los elementos, en dos semanas la previa y la invitación real se verían
// distinto y nadie sabría cuál es la buena.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Icon from '../shared/Icon'
import { apiFetch } from '../../utils/api'
import CamposBloque from './CamposBloque'
import {
  ELEMENTOS, VARIANTES_SOBRE, VARIANTES_PORTADA, CAMPOS_FONDO, porTipo, nuevoId,
} from './catalogo'

// En dev el renderizador corre en 5182. El protocolo se copia del padre a
// propósito: si el dashboard va por https (el config normal usa basicSsl) y el
// iframe por http, Chrome lo bloquea por contenido mixto y la previa ni carga.
const URL_PREVIA = import.meta.env.DEV
  ? `${window.location.protocol}//localhost:5182/preview`
  : 'https://invitacion.aliwa.mx/preview'
const ORIGEN_PREVIA = new URL(URL_PREVIA).origin

// Medidas en píxeles CSS de dos aparatos reales, no números redondos: la
// invitación se abre casi siempre desde WhatsApp en un teléfono de ese tamaño,
// y quien la revisa en computadora suele traer una MacBook de 13".
const APARATOS = {
  movil: { medidas: [393, 852], radio: 22 },        // iPhone 15/16
  escritorio: { medidas: [1440, 900], radio: 8 },   // MacBook Air 13"
}

const PESTANAS = [
  { id: 'sobre', nombre: 'Sobre', icono: 'mail' },
  { id: 'portada', nombre: 'Portada', icono: 'auto_awesome' },
  { id: 'contenido', nombre: 'Contenido', icono: 'view_agenda' },
]

// Con qué arranca una invitación vacía. Sobre y portada siempre van, y en ese
// orden: son la entrada y no tiene sentido poder moverlos.
const INICIAL = () => ({
  tema: 'dorado',
  bloques: [
    { id: nuevoId(), tipo: 'sobre', datos: { variante: 'clasico', arriba: 'Estás invitado' } },
    { id: nuevoId(), tipo: 'portada', datos: { variante: 'clasica' } },
  ],
})

export default function EditorInvitacion({ evento, onGuardado }) {
  const [inv, setInv] = useState(() => evento?.invitacion?.bloques?.length
    ? normalizar(evento.invitacion)
    : INICIAL())
  const [tab, setTab] = useState('sobre')
  const [abierto, setAbierto] = useState(null)   // bloque expandido en Contenido
  const [agregando, setAgregando] = useState(false)
  const [estado, setEstado] = useState('')        // '', 'guardando', 'guardado', 'error'
  // Cambiar `version` remonta el iframe: es como se reinicia la previa para
  // volver a ver el sobre cerrado.
  const [version, setVersion] = useState(0)
  const [sinPrevia, setSinPrevia] = useState(false)
  // `cargo` distingue los dos modos de falla: si el iframe nunca disparó load,
  // el navegador lo bloqueó (certificado); si cargó pero no saludó, el problema
  // está del lado del renderizador.
  const [cargo, setCargo] = useState(false)
  // Móvil por defecto: la invitación se abre casi siempre desde WhatsApp, así
  // que revisarla primero en escritorio da una idea equivocada del resultado.
  const [vista, setVista] = useState('movil')
  const iframe = useRef(null)
  const listo = useRef(false)
  const marco = useRef(null)
  // El iframe se maqueta SIEMPRE a 393×852 y se encoge con `scale` para caber
  // en el panel. Achicarlo cambiando su ancho falsearía la previa: los @media
  // leerían el ancho reducido y no el del teléfono real.
  const [escala, setEscala] = useState(1)
  // `null` = ajustar solo al panel. Un número = la anfitriona fijó el zoom.
  const [zoom, setZoom] = useState(null)
  const [publicando, setPublicando] = useState(false)
  const [urlPublica, setUrlPublica] = useState(evento?.invitacion_url || '')
  const [publicada, setPublicada] = useState(!!evento?.publicada)
  const [avisoPub, setAvisoPub] = useState('')

  // Reiniciar la previa: remonta el iframe (via `key`) y limpia lo que solo
  // valía para el anterior. Va aquí y no en un efecto sobre `version` porque
  // un efecto que solo hace setState provoca renders en cascada.
  const reiniciarPrevia = () => {
    listo.current = false
    setCargo(false)
    setSinPrevia(false)
    setVersion((n) => n + 1)
  }

  const [ancho, alto] = APARATOS[vista].medidas
  const escalaFinal = Math.min(3, Math.max(.25, zoom ?? escala))
  const zoomear = (paso) => setZoom(Math.min(3, Math.max(.25,
    Number((escalaFinal + paso).toFixed(2)))))

  const sobre = inv.bloques.find((b) => b.tipo === 'sobre')
  const portada = inv.bloques.find((b) => b.tipo === 'portada')
  // El contenido es todo lo demás: sobre y portada tienen su propia pestaña.
  const contenido = inv.bloques.filter((b) => !['sobre', 'portada'].includes(b.tipo))

  // Lo que ve el iframe. Se memoiza para no reenviar en cada render del editor.
  const paquete = useMemo(() => ({
    evento: {
      nombre: evento?.nombre, tipo: evento?.tipo, fecha: evento?.fecha,
      anfitriones: evento?.anfitriones || [],
      lugar_nombre: evento?.lugar_nombre, lugar_direccion: evento?.lugar_direccion,
      lugar_mapa_url: evento?.lugar_mapa_url,
      codigo_vestimenta: evento?.codigo_vestimenta,
    },
    invitacion: { tema: inv.tema, bloques: inv.bloques },
    __version: version,
  }), [evento, inv, version])

  // La medición corre siempre y en escritorio simplemente no se usa: así el
  // efecto no llama a setState en su cuerpo (regla react-hooks) y no hay que
  // remedirlo al cambiar de vista. ResizeObserver dispara solo al observar.
  useLayoutEffect(() => {
    const caja = marco.current
    if (!caja) return
    // Cabe por ALTO y por ANCHO: la MacBook mide 1440 de ancho y el panel
    // ronda los 800, así que ahí manda el ancho; en el teléfono manda el alto.
    const ro = new ResizeObserver(() => setEscala(Math.min(1,
      (caja.clientWidth - 24) / ancho,
      (caja.clientHeight - 24) / alto)))
    ro.observe(caja)
    return () => ro.disconnect()
  }, [ancho, alto])

  // Referencia viva del paquete: el intervalo de reintento tiene que mandar lo
  // último escrito sin reiniciarse en cada tecla.
  const paqueteRef = useRef(paquete)
  useEffect(() => { paqueteRef.current = paquete }, [paquete])

  // El iframe avisa cuando ya está escuchando: sin ese apretón de manos, el
  // primer envío se pierde si el editor monta antes que el iframe.
  useEffect(() => {
    const alRecibir = (e) => {
      if (e.origin !== ORIGEN_PREVIA) return
      if (e.data?.tipo !== 'aliwa:previa-lista') return
      listo.current = true
      iframe.current?.contentWindow?.postMessage(
        { tipo: 'aliwa:previa', datos: paquete }, ORIGEN_PREVIA)
    }
    window.addEventListener('message', alRecibir)
    return () => window.removeEventListener('message', alRecibir)
  }, [paquete])

  // El saludo del iframe puede perderse (llegó antes de que el padre montara,
  // o el remontaje lo cruzó). En vez de confiar en un solo mensaje, se reenvía
  // el paquete cada medio segundo hasta que conteste, y a los 6 s se avisa.
  useEffect(() => {
    let intentos = 0
    const id = setInterval(() => {
      if (listo.current) { clearInterval(id); return }
      intentos += 1
      iframe.current?.contentWindow?.postMessage(
        { tipo: 'aliwa:previa', datos: paqueteRef.current }, ORIGEN_PREVIA)
      if (intentos >= 12) { clearInterval(id); setSinPrevia(true) }
    }, 500)
    return () => clearInterval(id)
  }, [version])

  useEffect(() => {
    if (!listo.current) return
    iframe.current?.contentWindow?.postMessage(
      { tipo: 'aliwa:previa', datos: paquete }, ORIGEN_PREVIA)
  }, [paquete])

  // --- mutaciones ---
  const setBloque = (id, datos) =>
    setInv((v) => ({ ...v, bloques: v.bloques.map((b) => (b.id === id ? { ...b, datos } : b)) }))

  const agregar = (tipo) => {
    const id = nuevoId()
    setInv((v) => ({ ...v, bloques: [...v.bloques, { id, tipo, datos: {} }] }))
    setAgregando(false)
    setAbierto(id)
  }

  const quitar = (id) => {
    setInv((v) => ({ ...v, bloques: v.bloques.filter((b) => b.id !== id) }))
    setAbierto((a) => (a === id ? null : a))
  }

  // Mueve dentro del arreglo COMPLETO, no dentro de `contenido`: los índices de
  // la lista filtrada no corresponden a los reales.
  const mover = (id, dir) => setInv((v) => {
    const i = v.bloques.findIndex((b) => b.id === id)
    const j = i + dir
    // Nunca antes de portada: sobre y portada son la entrada, no se reordenan.
    if (j < 2 || j >= v.bloques.length) return v
    const copia = [...v.bloques]
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    return { ...v, bloques: copia }
  })

  // Lo que se manda a la base. Los `id` de bloque son solo del editor.
  const paraGuardar = () => ({
    tema: inv.tema,
    bloques: inv.bloques.map(({ tipo, datos, visible }) => ({ tipo, datos, visible })),
  })

  const publicar = async () => {
    setPublicando(true)
    setAvisoPub('')
    try {
      // Se guarda ANTES de publicar: el backend publica lo que hay en la base,
      // no lo que está en la pantalla. Sin esto se publicaría la versión vieja.
      const g = await apiFetch(`/api/eventos/${evento.id}/`, {
        method: 'PATCH', body: JSON.stringify({ invitacion: paraGuardar() }),
      })
      if (!g.res.ok) { setAvisoPub(g.data?.error || 'No se pudo guardar'); return }
      onGuardado?.(g.data)

      const { res, data } = await apiFetch(`/api/eventos/${evento.id}/publicar/`, { method: 'POST' })
      if (!res.ok) {
        setAvisoPub(res.status === 402
          ? 'Falta cubrir el pago para publicar'
          : (data?.error || 'No se pudo publicar'))
        return
      }
      setUrlPublica(data.url)
      setPublicada(true)
    } catch {
      setAvisoPub('Error de conexión')
    } finally {
      setPublicando(false)
    }
  }

  const guardar = async () => {
    setEstado('guardando')
    const { res, data } = await apiFetch(`/api/eventos/${evento.id}/`, {
      method: 'PATCH', body: JSON.stringify({ invitacion: paraGuardar() }),
    })
    if (!res.ok) { setEstado('error'); console.error('[invitacion]', data); return }
    setEstado('guardado')
    onGuardado?.(data)
    setTimeout(() => setEstado(''), 2000)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
      {/* ---------- controles ---------- */}
      <div className="lg:w-[400px] lg:shrink-0 flex flex-col min-h-0">
        <div className="flex items-center border-b border-outline-variant/30 mb-3">
          {PESTANAS.map((p) => (
            <button key={p.id} onClick={() => setTab(p.id)}
              className={`flex items-center gap-1.5 px-2 pt-1 pb-1.5 text-[13px] font-display font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === p.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
              <Icon name={p.icono} className="text-[15px] leading-none" />
              {p.nombre}
            </button>
          ))}

          {/* Publicar prende la URL pública. No compila ni sube archivos: el
              renderizador ya está en línea y solo empieza a servir este token. */}
          <button onClick={publicar} disabled={publicando}
            title={publicada ? 'Volver a publicar con los cambios' : 'Publicar la invitación'}
            className="ml-auto mb-1 shrink-0 flex items-center gap-1 border border-tertiary text-tertiary px-2.5 h-[26px] font-display font-semibold text-[12px] transition-all active:scale-[0.98] hover:bg-tertiary/5 disabled:opacity-50">
            <Icon name={publicada ? 'cloud_done' : 'cloud_upload'} className="text-[14px] leading-none" />
            {publicando ? 'Subiendo…' : publicada ? 'Actualizar' : 'Terminar'}
          </button>
        </div>

        {(urlPublica || avisoPub) && (
          <div className={`mb-2.5 px-2.5 py-1.5 text-[12px] ${avisoPub ? 'bg-error/10 text-error' : 'bg-tertiary/10'}`}>
            {avisoPub || (
              <span className="flex items-center gap-2">
                <Icon name="link" className="text-[15px] leading-none shrink-0 text-tertiary" />
                <a href={urlPublica} target="_blank" rel="noopener noreferrer"
                  className="flex-1 min-w-0 truncate font-display text-tertiary hover:underline">
                  {urlPublica}
                </a>
                <button onClick={() => navigator.clipboard?.writeText(urlPublica)}
                  title="Copiar la liga"
                  className="shrink-0 p-1 text-on-surface-variant hover:text-tertiary transition-colors">
                  <Icon name="content_copy" className="text-[14px] leading-none" />
                </button>
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          {tab === 'sobre' && (
            <Seccion ayuda="Lo primero que ve la invitada. Se abre al tocar el sello.">
              <Variantes opciones={VARIANTES_SOBRE} valor={sobre?.datos.variante || 'clasico'}
                // Sin bumpear `version`: eso remontaba el iframe y tardaba un
                // segundo en volver. Ahora el cambio viaja por postMessage y se
                // pinta al instante, como cualquier otra edición.
                onElegir={(v) => setBloque(sobre.id, { ...sobre.datos, variante: v })} />
              <CamposBloque
                campos={[
                  { k: 'fondo', label: 'Color del sobre', tipo: 'color', vacio: 'El del tema' },
                  { k: 'textura', label: 'Textura', tipo: 'select', opciones: [
                    { v: 'lisa', n: 'Lisa' }, { v: 'lino', n: 'Lino' },
                    { v: 'papel', n: 'Papel' }, { v: 'rayas', n: 'Rayas' },
                    { v: 'puntos', n: 'Puntos' }] },
                  { k: 'arriba', label: 'Texto de arriba', tipo: 'textoEstilado', placeholder: 'Estás invitado' },
                  { k: 'abajo', label: 'Texto de abajo', tipo: 'textoEstilado', placeholder: 'A la boda de' },
                  { k: 'sello', label: 'Sello', tipo: 'textoEstilado', placeholder: 'Abrir' },
                  { k: 'selloForma', label: 'Forma del sello', tipo: 'select', opciones: [
                    { v: 'circulo', n: 'Círculo' }, { v: 'cuadro', n: 'Cuadro' },
                    { v: 'rombo', n: 'Rombo' }, { v: 'ninguno', n: 'Sin fondo' }] },
                  { k: 'selloTam', label: 'Tamaño del sello', tipo: 'select', opciones: [
                    { v: 0.7, n: 'Chico' }, { v: 1, n: 'Mediano' },
                    { v: 1.35, n: 'Grande' }, { v: 1.7, n: 'Muy grande' }] },
                  { k: 'selloFondo', label: 'Fondo del sello', tipo: 'color', vacio: 'El del tema' },
                ]}
                datos={sobre?.datos || {}}
                onCambio={(d) => setBloque(sobre.id, d)} />
            </Seccion>
          )}

          {tab === 'portada' && (
            <Seccion ayuda="Los nombres en grande. Salen de los anfitriones del evento.">
              <Variantes opciones={VARIANTES_PORTADA} valor={portada?.datos.variante || 'clasica'}
                onElegir={(v) => setBloque(portada.id, { ...portada.datos, variante: v })} />
              <CamposBloque
                campos={[
                  { k: 'fondoUrl', label: 'Foto de fondo', tipo: 'imagen' },
                  { k: 'velo', label: 'Oscurecer la foto', tipo: 'select', opciones: [
                    { v: 'medio', n: 'Normal' }, { v: 'suave', n: 'Poco' },
                    { v: 'fuerte', n: 'Mucho' }, { v: 'ninguno', n: 'Nada' }] },
                  { k: 'leyenda', label: 'Leyenda', tipo: 'texto', placeholder: '14 de noviembre de 2026' },
                ]}
                datos={portada?.datos || {}}
                onCambio={(d) => setBloque(portada.id, d)} />
            </Seccion>
          )}

          {tab === 'contenido' && (
            <div className="space-y-1.5">
              {contenido.length === 0 && (
                <p className="text-[13px] text-on-surface-variant py-4 text-center">
                  Todavía no hay contenido. Agrega tu primer elemento.
                </p>
              )}
              {contenido.map((b) => (
                <FilaBloque key={b.id} bloque={b}
                  expandido={abierto === b.id}
                  onExpandir={() => setAbierto(abierto === b.id ? null : b.id)}
                  onCambio={(d) => setBloque(b.id, d)}
                  onQuitar={() => quitar(b.id)}
                  onSubir={() => mover(b.id, -1)}
                  onBajar={() => mover(b.id, 1)} />
              ))}

              {agregando ? (
                <div className="border border-outline-variant bg-surface-container-lowest p-2 space-y-0.5">
                  {ELEMENTOS.map((el) => {
                    const yaEsta = !el.repetible && contenido.some((b) => b.tipo === el.tipo)
                    return (
                      <button key={el.tipo} disabled={yaEsta} onClick={() => agregar(el.tipo)}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 text-left hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <Icon name={el.icono} className="text-[16px] text-on-surface-variant leading-none shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-display font-semibold truncate">{el.nombre}</span>
                          {el.ayuda && <span className="block text-[11px] text-on-surface-variant truncate">{el.ayuda}</span>}
                        </span>
                        {yaEsta && <span className="text-[11px] text-outline-variant shrink-0">ya está</span>}
                      </button>
                    )
                  })}
                  <button onClick={() => setAgregando(false)}
                    className="w-full py-1.5 text-[12px] font-display text-on-surface-variant hover:text-on-surface">
                    Cancelar
                  </button>
                </div>
              ) : (
                <button onClick={() => setAgregando(true)}
                  className="w-full border border-dashed border-outline-variant hover:border-primary/50 hover:bg-primary/5 py-2 text-[13px] font-display font-semibold text-on-surface-variant transition-colors flex items-center justify-center gap-1.5">
                  <Icon name="add" className="text-[16px] leading-none" />
                  Agregar elemento
                </button>
              )}
            </div>
          )}

        </div>

        <div className="flex items-center justify-between gap-3 pt-3 mt-3 border-t border-outline-variant/30 shrink-0">
          <span className={`text-[12px] font-display ${estado === 'error' ? 'text-error' : 'text-on-surface-variant'}`}>
            {estado === 'guardando' && 'Guardando…'}
            {estado === 'guardado' && 'Guardado'}
            {estado === 'error' && 'No se pudo guardar'}
          </span>
          <button onClick={guardar} disabled={estado === 'guardando'}
            className="border border-primary text-primary px-5 py-2 font-display font-semibold text-[13px] transition-all active:scale-[0.98] hover:bg-primary/5 disabled:opacity-50 flex items-center gap-1.5">
            Guardar
            <Icon name="check" className="text-[15px]" />
          </button>
        </div>
      </div>

      {/* ---------- previa ---------- */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2 gap-3">
          <span className="text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase shrink-0">
            Vista previa
          </span>
          <div className="flex items-center gap-1">
            {/* El cambio de ancho NO remonta el iframe: solo se encoge el marco,
                así se compara móvil y escritorio sin perder el estado del sobre. */}
            {[{ id: 'movil', icono: 'smartphone', nom: 'Móvil' },
              { id: 'escritorio', icono: 'laptop_mac', nom: 'Escritorio' }].map((v) => (
              <button key={v.id} onClick={() => setVista(v.id)} title={v.nom}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-display font-semibold transition-colors ${
                  vista === v.id
                    ? 'bg-primary/5 text-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'}`}>
                <Icon name={v.icono} className="text-[15px] leading-none" />
                {v.nom}
              </button>
            ))}
            <span className="w-px h-4 bg-outline-variant/50 mx-1" />
            {/* El porcentaje es botón: vuelve al ajuste automático. Sin él, un
                zoom manual dejaría la previa descuadrada para siempre. */}
            <button onClick={() => zoomear(-.1)} disabled={escalaFinal <= .25} title="Alejar"
              className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/5 disabled:opacity-40 transition-colors">
              <Icon name="remove" className="text-[15px] leading-none" />
            </button>
            <button onClick={() => setZoom(null)} title="Ajustar al panel"
              className={`px-1 min-w-[38px] text-[12px] font-display font-semibold tabular-nums transition-colors ${
                zoom === null ? 'text-on-surface-variant' : 'text-primary'}`}>
              {Math.round(escalaFinal * 100)}%
            </button>
            <button onClick={() => zoomear(.1)} disabled={escalaFinal >= 3} title="Acercar"
              className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/5 disabled:opacity-40 transition-colors">
              <Icon name="add" className="text-[15px] leading-none" />
            </button>
            <span className="w-px h-4 bg-outline-variant/50 mx-1" />
            <button onClick={reiniciarPrevia} title="Reiniciar (vuelve a cerrar el sobre)"
              className="flex items-center gap-1.5 px-2 py-1 text-[12px] font-display text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors">
              <Icon name="refresh" className="text-[15px] leading-none" />
              Reiniciar
            </button>
          </div>
        </div>
        {/* Marco de teléfono: la invitación se abre casi siempre desde WhatsApp,
            así que revisarla en ancho de escritorio engaña. */}
        {/* Telón gris neutro, fijo en los dos temas. Neutro a propósito: la
            invitación trae su propia paleta y un fondo con tinte (morado, por
            decir) le contamina la lectura del color. Y oscuro porque el papel
            es claro y contra un fondo claro no se ve dónde empieza. */}
        {/* `overflow-auto`: con zoom por encima del ajuste el marco no cabe y
            hay que poder recorrerlo. */}
        <div ref={marco} className="flex-1 min-h-0 flex items-start justify-center bg-[#26262a] py-3 overflow-auto">
          <div
            className="border border-white/10 bg-white overflow-hidden relative shadow-2xl shadow-black/50"
            style={{
              width: ancho,
              height: alto,
              borderRadius: APARATOS[vista].radio,
              transform: `scale(${escalaFinal})`,
              transformOrigin: 'top center',
              // `scale` no mueve el espacio que ocupa el elemento: al encoger
              // deja una franja muerta y al ampliar se sale sin dejar sitio.
              // Los márgenes corrigen las dos direcciones.
              marginBottom: alto * (escalaFinal - 1),
              marginInline: (ancho * (escalaFinal - 1)) / 2,
              flexShrink: 0,
            }}>
            <iframe key={version} ref={iframe} src={URL_PREVIA} title="Vista previa"
              onLoad={() => setCargo(true)}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin" />
            {sinPrevia && (
              <div className="absolute inset-0 bg-surface-container flex flex-col items-center justify-center gap-2 px-6 text-center z-10">
                <Icon name="visibility_off" className="text-[28px] text-outline-variant leading-none" />
                <p className="text-[13px] font-display font-semibold text-on-surface">
                  {cargo ? 'La previa cargó pero no responde' : 'El navegador bloqueó la previa'}
                </p>
                <p className="text-[12px] text-on-surface-variant leading-relaxed">
                  {cargo ? (
                    <>Revisa la consola del renderizador. Puede ser que el origen{' '}
                    <code className="font-mono break-all">{window.location.origin}</code>{' '}
                    no esté en su lista de permitidos.</>
                  ) : (
                    <>Abre{' '}
                    <a href={URL_PREVIA} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline break-all">{URL_PREVIA}</a>{' '}
                    en una pestaña normal y acepta el certificado. Chrome no deja
                    aceptarlo desde dentro de un iframe.</>
                  )}
                </p>
                <button onClick={reiniciarPrevia}
                  className="mt-1 border border-primary text-primary px-4 py-1.5 font-display font-semibold text-[12px] hover:bg-primary/5 transition-colors">
                  Reintentar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- piezas -----------------------------------------------------------------

const Seccion = ({ ayuda, children }) => (
  <div className="space-y-3.5">
    {ayuda && <p className="text-[12px] text-on-surface-variant leading-relaxed">{ayuda}</p>}
    {children}
  </div>
)

const Variantes = ({ opciones, valor, onElegir }) => (
  <div>
    <p className="text-[11px] font-display font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">Diseño</p>
    <div className="space-y-1">
      {opciones.map((o) => (
        <button key={o.id} onClick={() => onElegir(o.id)}
          className={`w-full flex items-center gap-2.5 border px-3 py-2 text-left transition-colors ${
            valor === o.id ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary/50'}`}>
          <span className="flex-1 min-w-0">
            <span className={`block text-[13px] font-display font-semibold ${valor === o.id ? 'text-primary' : ''}`}>{o.nombre}</span>
            <span className="block text-[11px] text-on-surface-variant">{o.desc}</span>
          </span>
          {valor === o.id && <Icon name="check" className="text-primary text-[16px] shrink-0" />}
        </button>
      ))}
    </div>
  </div>
)

function FilaBloque({ bloque, expandido, onExpandir, onCambio, onQuitar, onSubir, onBajar }) {
  const def = porTipo(bloque.tipo)
  if (!def) return null

  return (
    <div className={`border transition-colors ${expandido ? 'border-primary/40' : 'border-outline-variant'}`}>
      <div className="flex items-center gap-1 pl-2 pr-1 py-1.5">
        <button onClick={onExpandir} className="flex-1 min-w-0 flex items-center gap-2.5 text-left">
          <Icon name={def.icono} className="text-[16px] text-on-surface-variant leading-none shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-display font-semibold truncate">{def.nombre}</span>
            {def.derivado && <span className="block text-[11px] text-outline-variant truncate">{def.derivado}</span>}
          </span>
          <Icon name={expandido ? 'expand_less' : 'expand_more'}
            className="text-[18px] text-on-surface-variant leading-none shrink-0" />
        </button>
        <div className="flex items-center shrink-0">
          <button onClick={onSubir} title="Subir" className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors">
            <Icon name="arrow_upward" className="text-[14px] leading-none" />
          </button>
          <button onClick={onBajar} title="Bajar" className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors">
            <Icon name="arrow_downward" className="text-[14px] leading-none" />
          </button>
          <button onClick={onQuitar} title="Quitar" className="p-1 text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors">
            <Icon name="delete" className="text-[14px] leading-none" />
          </button>
        </div>
      </div>
      {expandido && (
        <div className="border-t border-outline-variant/40 p-3">
          {def.ayuda && <p className="text-[12px] text-on-surface-variant mb-3 leading-relaxed">{def.ayuda}</p>}
          <CamposBloque campos={def.campos} datos={bloque.datos || {}} onCambio={onCambio} />

          {/* El fondo va plegado: casi siempre se deja el del tema, y abierto
              empujaría los campos que sí se editan fuera de la vista. */}
          <details className="mt-3 pt-3 border-t border-outline-variant/30">
            <summary className="cursor-pointer text-[11px] font-display font-semibold text-on-surface-variant tracking-wide uppercase select-none hover:text-on-surface">
              Fondo de este bloque
            </summary>
            <div className="mt-2.5">
              <CamposBloque campos={CAMPOS_FONDO} datos={bloque.datos || {}} onCambio={onCambio} />
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

/** Lo guardado no trae `id` (es solo del editor): se le pone al cargar. */
function normalizar(inv) {
  return { ...inv, bloques: (inv.bloques || []).map((b) => ({ ...b, id: b.id || nuevoId() })) }
}
