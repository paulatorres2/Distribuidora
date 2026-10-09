import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, Link, useLocation } from 'react-router-dom'

export default function Layout({ children, links }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [abierto, setAbierto] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Overlay para móvil */}
      {abierto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-indigo-900 text-white flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${abierto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-indigo-800 flex items-center justify-between">
          <div>
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center mb-3">
              <span className="font-bold text-lg">D</span>
            </div>
            <p className="font-semibold text-sm">{user?.username}</p>
            <span className="text-indigo-300 text-xs capitalize">{user?.usertype}</span>
          </div>
          <button
            onClick={() => setAbierto(false)}
            className="lg:hidden text-indigo-300 hover:text-white text-xl p-1"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setAbierto(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                location.pathname === link.to
                  ? 'bg-indigo-700 text-white font-medium'
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-indigo-200 hover:text-white text-sm rounded-lg hover:bg-indigo-800 transition-colors"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Barra superior móvil */}
        <div className="lg:hidden flex items-center gap-3 bg-indigo-900 text-white px-4 py-3 sticky top-0 z-10">
          <button
            onClick={() => setAbierto(true)}
            className="text-white text-xl p-1"
          >
            ☰
          </button>
          <span className="font-semibold text-sm">Sistema Distribución</span>
        </div>

        {children}
      </main>
    </div>
  )
}