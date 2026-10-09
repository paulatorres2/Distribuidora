import { useEffect, useState } from 'react'
import { api } from '../../utils/api'

export default function PNCVendedor() {
  const [productos, setProductos] = useState([])
  const [cantidades, setCantidades] = useState({})
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.getProducts()
      .then(r => {
        setProductos(r.data)
        const init = {}
        r.data.forEach(p => { init[p.productid] = 0 })
        setCantidades(init)
      })
      .finally(() => setLoading(false))
  }, [])

  const registrar = async () => {
    const items = productos
      .filter(p => (cantidades[p.productid] || 0) > 0)
      .map(p => ({ productid: p.productid, cantidad: cantidades[p.productid] }))
    if (!items.length) return setMsg('Ingresa al menos un producto')
    try {
      await api.registrarPNC({ items })
      setMsg('PNC registrado correctamente. El administrador lo validará.')
      const init = {}
      productos.forEach(p => { init[p.productid] = 0 })
      setCantidades(init)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al registrar')
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">PNC — Productos No Conformes</h1>

      {msg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
          {msg}
        </div>
      )}

      <div className="card space-y-4">
        <p className="text-sm text-gray-500">
          Registra los productos que no pudiste vender por mal estado, vencimiento u otra razón.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Cantidad PNC</th>
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
        <button onClick={registrar} className="btn-primary">Registrar PNC</button>
      </div>
    </div>
  )
}