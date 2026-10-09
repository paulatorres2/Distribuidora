import { useEffect, useState } from 'react'
import { api } from '../../utils/api'

export default function InventarioVendedor() {
  const [productos, setProductos] = useState([])
  const [cantidades, setCantidades] = useState({})
  const [inventarioInicial, setInventarioInicial] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('inicial')

  useEffect(() => {
    Promise.all([api.getProducts(), api.getInventarioHoy()])
      .then(([prod, inv]) => {
        setProductos(prod.data)
        const init = {}
        prod.data.forEach(p => { init[p.productid] = 0 })
        setCantidades(init)
        setInventarioInicial(inv.data.inventario)
      })
      .finally(() => setLoading(false))
  }, [])

  const guardarFinal = async () => {
    const items = productos.map(p => ({ productId: p.productid, cantidad: cantidades[p.productid] || 0 }))
    try {
      await api.registrarInventarioFinal({ items })
      setMsg('✅ Inventario final registrado. Mañana tendrás tu inventario inicial listo automáticamente.')
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al guardar')
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[['inicial','📦 Inventario Inicial'],['final','🏁 Inventario Final']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setMsg('') }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
          {msg}
        </div>
      )}

      {/* Inventario inicial - solo lectura */}
      {tab === 'inicial' && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-800">Inventario Inicial</h2>
            <span className="badge-accepted">Automático</span>
          </div>
          <p className="text-sm text-gray-500">
            Generado automáticamente a partir del inventario final del día anterior.
          </p>
          {inventarioInicial.length === 0 ? (
            <p className="text-amber-600 text-sm">⚠️ No hay inventario inicial registrado aún.</p>
            ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {inventarioInicial.map(i => (
                  <tr key={i.productid} className="border-b border-gray-50">
                    <td className="py-3 px-4 font-medium">{i.productname}</td>
                    <td className="py-3 px-4 font-semibold">{i.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Inventario final - editable */}
      {tab === 'final' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Inventario Final</h2>
          <p className="text-sm text-gray-500">
            Registra los productos que te sobraron. Este será tu inventario inicial de mañana.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Cantidad sobrante</th>
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
          <button onClick={guardarFinal} className="btn-primary">
            Registrar inventario final
          </button>
        </div>
      )}
    </div>
  )
}