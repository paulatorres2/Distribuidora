import { useEffect, useState } from 'react'
import { api, formatCOP } from '../../utils/api'

export default function MercanciaPrestada() {
  const [prestamos, setPrestamos] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [form, setForm] = useState({ distribuidor: '', direccion: 'me_deben' })
  const [cantidades, setCantidades] = useState({})
  const [msg, setMsg] = useState('')

  const cargar = (activo = true) => {
    Promise.all([
      api.getPrestamos({ activo }),
      api.getProducts()
    ]).then(([p, prod]) => {
      setPrestamos(p.data)
      setProductos(prod.data)
      const init = {}
      prod.data.forEach(p => { init[p.productid] = 0 })
      setCantidades(init)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const toggleInactivos = () => {
    const nuevoEstado = !mostrarInactivos
    setMostrarInactivos(nuevoEstado)
    cargar(!nuevoEstado)
  }

  const guardar = async () => {
    if (!form.distribuidor) return setMsg('Ingresa el nombre del distribuidor')
    const items = productos
      .filter(p => (cantidades[p.productid] || 0) > 0)
      .map(p => ({ productId: p.productid, cantidad: cantidades[p.productid] }))
    if (!items.length) return setMsg('Ingresa al menos un producto')
    try {
      await api.crearPrestamo({ ...form, items })
      setMsg('✅ Préstamo registrado correctamente')
      setMostrarForm(false)
      setForm({ distribuidor: '', direccion: 'me_deben' })
      const init = {}
      productos.forEach(p => { init[p.productid] = 0 })
      setCantidades(init)
      cargar()
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Error al registrar'))
    }
  }

  const saldar = async (id) => {
    if (!confirm('¿Marcar este préstamo como saldado?')) return
    await api.saldarPrestamo(id)
    cargar(!mostrarInactivos)
  }

  const meDeben = prestamos.filter(p => p.direccion === 'me_deben')
  const lesDebo = prestamos.filter(p => p.direccion === 'les_debo')

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Mercancía Prestada</h1>
        <div className="flex gap-2">
          <button
            onClick={toggleInactivos}
            className="btn-secondary text-sm"
          >
            {mostrarInactivos ? '👁 Ver activos' : '📋 Ver saldados'}
          </button>
          <button
            onClick={() => { setMostrarForm(!mostrarForm); setMsg('') }}
            className="btn-primary"
          >
            + Nuevo préstamo
          </button>
        </div>
      </div>

      {msg && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-lg text-sm">
          {msg}
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Registrar préstamo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Distribuidor *</label>
              <input
                className="input"
                placeholder="Nombre del distribuidor..."
                value={form.distribuidor}
                onChange={e => setForm({ ...form, distribuidor: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
              <select
                className="input"
                value={form.direccion}
                onChange={e => setForm({ ...form, direccion: e.target.value })}
              >
                <option value="me_deben">Me deben a mí</option>
                <option value="les_debo">Yo les debo</option>
              </select>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Cantidad prestada</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.productid} className="border-b border-gray-50">
                  <td className="py-3 px-4 font-medium">{p.productname}</td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="0"
                      className="input w-28"
                      value={cantidades[p.productid] || 0}
                      onChange={e => setCantidades({ ...cantidades, [p.productid]: Number(e.target.value) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2">
            <button onClick={guardar} className="btn-primary">Guardar</button>
            <button onClick={() => setMostrarForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      {/* Me deben */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <span className="w-3 h-3 bg-amber-400 rounded-full inline-block"></span>
          Me deben ({meDeben.length})
        </h2>
        {meDeben.length === 0 ? (
          <div className="card text-center text-gray-400 py-8">
            {mostrarInactivos ? 'No hay préstamos saldados' : 'No hay préstamos pendientes'}
          </div>
        ) : (
          <div className="space-y-3">
            {meDeben.map(p => (
              <div key={p.prestamoid} className="card border-l-4 border-amber-400">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{p.distribuidor}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.fecha}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.activo ? (
                      <>
                        <span className="badge-pending">Pendiente</span>
                        <button
                          onClick={() => saldar(p.prestamoid)}
                          className="btn-success text-xs py-1 px-3"
                        >
                          ✓ Saldado
                        </button>
                      </>
                    ) : (
                      <span className="badge-accepted">Saldado</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.productos?.map((prod, i) => (
                    <span key={i} className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-2 py-1 rounded-lg">
                      {prod.productname}: <strong>{prod.cantidad}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Les debo */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <span className="w-3 h-3 bg-red-400 rounded-full inline-block"></span>
          Les debo ({lesDebo.length})
        </h2>
        {lesDebo.length === 0 ? (
          <div className="card text-center text-gray-400 py-8">
            {mostrarInactivos ? 'No hay préstamos saldados' : 'No hay préstamos pendientes'}
          </div>
        ) : (
          <div className="space-y-3">
            {lesDebo.map(p => (
              <div key={p.prestamoid} className="card border-l-4 border-red-400">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{p.distribuidor}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.fecha}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.activo ? (
                      <>
                        <span className="badge-rejected">Pendiente</span>
                        <button
                          onClick={() => saldar(p.prestamoid)}
                          className="btn-success text-xs py-1 px-3"
                        >
                          ✓ Saldado
                        </button>
                      </>
                    ) : (
                      <span className="badge-accepted">Saldado</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.productos?.map((prod, i) => (
                    <span key={i} className="bg-red-50 border border-red-200 text-red-800 text-xs px-2 py-1 rounded-lg">
                      {prod.productname}: <strong>{prod.cantidad}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}