import { useAuth } from '../../context/AuthContext'
import { useNavigate, Link, useLocation } from 'react-router-dom'

export default function Layout({ children, links }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-900 text-white flex flex-col">
        <div className="p-6 border-b border-indigo-800">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center mb-3">
            <span className="font-bold text-lg">D</span>
          </div>
          <p className="font-semibold text-sm">{user?.username}</p>
          <span className="text-indigo-300 text-xs capitalize">{user?.usertype}</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
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
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}