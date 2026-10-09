import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AdminPanel from './pages/AdminPanel'
import VendedorPanel from './pages/VendedorPanel'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  if (!user) return <Navigate to="/login" />
  if (role && user.usertype !== role) return <Navigate to={user.usertype === 'admin' ? '/admin' : '/vendedor'} />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin/*" element={
        <ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>
      } />
      <Route path="/vendedor/*" element={
        <ProtectedRoute role="vendedor"><VendedorPanel /></ProtectedRoute>
      } />
      <Route path="*" element={
        user?.usertype === 'admin' 
          ? <Navigate to="/admin" /> 
          : user 
            ? <Navigate to="/vendedor" /> 
            : <Navigate to="/login" />
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}