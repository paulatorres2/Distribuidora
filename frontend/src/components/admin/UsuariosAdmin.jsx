import { useEffect, useState } from 'react'
import { api } from '../../utils/api'

export default function UsuariosAdmin() {
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ username: '', password: '', usertype: 'vendedor', comision: 0 })
  const [mostrarForm, setMostrarForm] = useState(false)
  const [msg, setMsg] = useState('')

  const cargar = () => {
    api.getVendedoresTodos()
      .then(r => setVendedores(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.username || !form.password) return alert('Completa todos los campos')
    try {
      await api.register(form)
      setMsg('Usuario creado exitosamente')
      setForm({ username: '', password: '', usertype: 'vendedor', comision: 0 })
      setMostrarForm(false)
      cargar()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al crear usuario')
    }
  }

  const desactivar = async (id) => {
    if (!confirm('¿Desactivar este usuario? No podrá iniciar sesión pero se conservará su historial.')) return
    try {
      await api.desactivarUsuario(id)
      setMsg('Usuario desactivado')
      cargar()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al desactivar')
    }
  }

  const activar = async (id) => {
    try {
      await api.activarUsuario(id)
      setMsg('Usuario activado')
      cargar()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al activar')
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary">
          + Nuevo usuario
        </button>
      </div>

      {msg && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-lg text-sm">
          {msg}
        </div>
      )}

      {mostrarForm && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Crear usuario</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
              <input
                className="input"
                placeholder="nombre de usuario..."
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                className="input"
                value={form.usertype}
                onChange={e => setForm({ ...form, usertype: e.target.value })}
              >
                <option value="vendedor">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comisión (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="input"
                placeholder="0"
                value={form.comision}
                onChange={e => setForm({ ...form, comision: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={guardar} className="btn-primary">Crear usuario</button>
            <button onClick={() => setMostrarForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <h2 className="font-semibold text-gray-800 mb-4">Vendedores</h2>
        {vendedores.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No hay vendedores registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Usuario</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Comisión</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Estado</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map(v => (
                <tr key={v.userid} className={`border-b border-gray-50 hover:bg-gray-50 ${!v.activo ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-4 font-medium">{v.username}</td>
                  <td className="py-3 px-4">{v.comision}%</td>
                  <td className="py-3 px-4">
                    {v.activo
                      ? <span className="badge-accepted">Activo</span>
                      : <span className="badge-rejected">Inactivo</span>}
                  </td>
                  <td className="py-3 px-4">
                    {v.activo
                      ? <button onClick={() => desactivar(v.userid)} className="btn-danger text-xs py-1 px-3">Desactivar</button>
                      : <button onClick={() => activar(v.userid)} className="btn-success text-xs py-1 px-3">Activar</button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}