import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import SetupBusinessPage from './pages/SetupBusinessPage'
import ConfirmarInvitacionPage from './pages/ConfirmarInvitacionPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* App autenticada — app.aliwa.mx */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/configurar-negocio" element={<SetupBusinessPage />} />
        <Route path="/confirmar-invitacion" element={<ConfirmarInvitacionPage />} />

        {/* Versiones en inglés de login/registro */}
        <Route path="/en" element={<LoginPage />} />
        <Route path="/en/login" element={<LoginPage />} />
        <Route path="/en/registro" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
