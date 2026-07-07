import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/shared/Icon'
import AliwaIcon from '../components/shared/AliwaIcon'
import useTheme from '../hooks/useTheme'
import { apiFetch } from '../utils/api'

const giros = [
  'Dentista', 'Consultorio médico', 'Restaurante', 'Cafetería',
  'Estética / Salón', 'Barbería', 'Gimnasio', 'Spa',
  'Veterinaria', 'Terapia / Psicología', 'Taller mecánico',
  'Tienda / Abarrotes', 'Tutorías / Clases', 'Otro',
]

const sidebarItems = [
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
  { id: 'conversations', icon: 'chat', label: 'Conversaciones' },
  { id: 'customers', icon: 'people', label: 'Clientes' },
  { id: 'appointments', icon: 'calendar_month', label: 'Citas' },
  { id: 'payments', icon: 'payments', label: 'Pagos' },
  { id: 'invoices', icon: 'description', label: 'Facturas' },
  { id: 'reports', icon: 'bar_chart', label: 'Reportes' },
]

export default function SetupBusinessPage() {
  const navigate = useNavigate()
  const [dark, toggleDark] = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [giro, setGiro] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [direccion, setDireccion] = useState('')
  const [showFiscal, setShowFiscal] = useState(false)
  const [rfc, setRfc] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [regimenFiscal, setRegimenFiscal] = useState('')
  const [codigoPostal, setCodigoPostal] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nombre || !giro) {
      setError('Nombre y giro del negocio son requeridos')
      return
    }

    setError('')
    setLoading(true)

    try {
      const { res, data } = await apiFetch('/api/cuentas/setup/', {
        method: 'POST',
        body: JSON.stringify({ nombre, giro, telefono, correo, direccion, rfc, razon_social: razonSocial, regimen_fiscal: regimenFiscal, codigo_postal: codigoPostal }),
      })

      if (res.ok) {
        navigate('/dashboard')
      } else {
        setError(data.error || 'Error al configurar el negocio')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="group/sidebar">
        <aside className={`fixed inset-y-0 left-0 z-40 bg-surface-container flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-[72px]' : 'w-64'}`}>
          <div className={`pt-7 pb-4 flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-6'}`}>
            <AliwaIcon size={collapsed ? 32 : 36} />
            {!collapsed && <span className="text-lg font-logo font-bold text-primary">Aliwa</span>}
          </div>
          <nav className={`flex-1 py-2 ${collapsed ? 'px-2' : 'px-4'}`}>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate('/dashboard')}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 py-3 rounded-2xl text-sm font-display transition-colors mb-1 ${
                  collapsed ? 'justify-center px-0' : 'px-4'
                } text-on-surface-variant hover:bg-surface-container-high/50`}
              >
                <Icon name={item.icon} className="text-[20px]" />
                {!collapsed && item.label}
              </button>
            ))}
          </nav>
          <div className={`pb-6 space-y-3 ${collapsed ? 'px-2' : 'px-4'}`}>
            <button
              onClick={toggleDark}
              className={`w-full flex items-center rounded-2xl text-sm font-display text-on-surface-variant hover:bg-surface-container-high/50 transition-colors ${
                collapsed ? 'justify-center py-3 px-0' : 'justify-between px-4 py-3'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon name={dark ? 'dark_mode' : 'light_mode'} className="text-[20px]" />
                {!collapsed && <span>{dark ? 'Modo oscuro' : 'Modo claro'}</span>}
              </div>
              {!collapsed && (
                <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 ${dark ? 'bg-purple' : 'bg-outline-variant'}`}>
                  <div className={`w-5 h-5 rounded-full bg-surface-container-lowest transition-transform duration-300 ${dark ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              )}
            </button>
            <a
              href="/login"
              className={`w-full flex items-center rounded-2xl text-sm font-display text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors ${
                collapsed ? 'justify-center py-3 px-0' : 'px-4 py-3 gap-3'
              }`}
            >
              <Icon name="logout" className="text-[20px]" />
              {!collapsed && <span>Salir</span>}
            </a>
          </div>
        </aside>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden lg:flex fixed top-5 z-50 opacity-0 group-hover/sidebar:opacity-100 px-1 py-3 rounded-r-xl bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all duration-300 items-center justify-center ${collapsed ? 'left-[72px]' : 'left-[256px]'}`}
        >
          <Icon name={collapsed ? 'chevron_right' : 'chevron_left'} className="text-[16px]" />
        </button>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-inverse-surface/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 md:px-10 h-16">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-xl text-on-surface-variant">
            <Icon name="menu" />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors font-display text-sm"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            Regresar
          </button>
          <div className="flex-1" />
          <span className="text-sm font-display text-on-surface-variant">Paso 2 de 5</span>
        </header>

        {/* Content */}
        <div className="flex-1 px-6 md:px-10 pb-10">
          <div className="max-w-[600px]">
            <h1 className="font-display text-[28px] font-bold mb-2">Configura tu negocio</h1>
            <p className="text-sm text-on-surface-variant mb-8">
              Esta información aparecerá en tus mensajes, facturas y perfil. Puedes cambiarla después.
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 text-red-400 text-sm font-display">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                  Nombre del negocio *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Estética María, Consultorio Dr. López"
                  autoFocus
                  className="w-full bg-surface-container rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                  Giro del negocio *
                </label>
                <div className="flex flex-wrap gap-2">
                  {giros.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGiro(g)}
                      className={`px-4 py-2 rounded-2xl text-sm font-display transition-all ${
                        giro === g
                          ? 'bg-primary text-on-primary font-semibold'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                    Teléfono del negocio
                  </label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="614 123 4567"
                    className="w-full bg-surface-container rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                    Correo del negocio
                  </label>
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="contacto@minegocio.com"
                    className="w-full bg-surface-container rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                  Dirección
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, número, colonia, ciudad"
                  className="w-full bg-surface-container rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Datos fiscales - colapsable */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowFiscal(!showFiscal)}
                  className="flex items-center gap-2 text-sm font-display font-semibold text-tertiary hover:opacity-80 transition-colors"
                >
                  <Icon name={showFiscal ? 'expand_less' : 'expand_more'} className="text-[20px]" />
                  {showFiscal ? 'Ocultar datos fiscales' : 'Agregar datos fiscales (para facturación)'}
                </button>

                {showFiscal && (
                  <div className="mt-4 space-y-4 p-5 bg-surface-container rounded-2xl">
                    <p className="text-xs text-on-surface-variant mb-2">
                      Necesarios para emitir facturas CFDI a tus clientes. Puedes agregarlos después.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                          RFC
                        </label>
                        <input
                          type="text"
                          value={rfc}
                          onChange={(e) => setRfc(e.target.value.toUpperCase().slice(0, 13))}
                          placeholder="XAXX010101000"
                          className="w-full bg-surface-container-lowest rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                          Código postal fiscal
                        </label>
                        <input
                          type="text"
                          value={codigoPostal}
                          onChange={(e) => setCodigoPostal(e.target.value.replace(/\D/g, '').slice(0, 5))}
                          placeholder="64000"
                          className="w-full bg-surface-container-lowest rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                        Razón social
                      </label>
                      <input
                        type="text"
                        value={razonSocial}
                        onChange={(e) => setRazonSocial(e.target.value)}
                        placeholder="Nombre o razón social como aparece en tu constancia"
                        className="w-full bg-surface-container-lowest rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface placeholder:text-outline-variant outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-display font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">
                        Régimen fiscal
                      </label>
                      <select
                        value={regimenFiscal}
                        onChange={(e) => setRegimenFiscal(e.target.value)}
                        className="w-full bg-surface-container-lowest rounded-2xl px-5 py-3.5 text-sm font-body text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      >
                        <option value="">Selecciona tu régimen</option>
                        <option value="601">601 — General de Ley Personas Morales</option>
                        <option value="603">603 — Personas Morales con Fines no Lucrativos</option>
                        <option value="605">605 — Sueldos y Salarios</option>
                        <option value="606">606 — Arrendamiento</option>
                        <option value="607">607 — Régimen de Enajenación o Adquisición de Bienes</option>
                        <option value="608">608 — Demás Ingresos</option>
                        <option value="610">610 — Residentes en el Extranjero</option>
                        <option value="612">612 — Personas Físicas con Actividades Empresariales y Profesionales</option>
                        <option value="614">614 — Ingresos por Intereses</option>
                        <option value="616">616 — Sin Obligaciones Fiscales</option>
                        <option value="621">621 — Incorporación Fiscal</option>
                        <option value="625">625 — Régimen de las Actividades Empresariales con Ingresos a través de Plataformas Tecnológicas</option>
                        <option value="626">626 — Régimen Simplificado de Confianza (RESICO)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={loading || !nombre || !giro}
                  className="bg-primary text-on-primary px-8 py-3.5 rounded-2xl font-display font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? 'Guardando...' : 'Guardar y continuar'}
                  {!loading && <Icon name="arrow_forward" className="text-[18px]" />}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="text-sm font-display text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Omitir por ahora
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
