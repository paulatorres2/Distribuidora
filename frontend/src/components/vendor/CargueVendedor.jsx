import { useEffect, useState } from 'react'
import { api } from '../../utils/api'

export default function CargueVendedor() {
  const [productos, setProductos] = useState([])
  const [cantidades, setCantidades] = useState({})
  const [inventarioInicial, setInventarioInicial] = useState({})
  const [cargues, setCargues] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const cargar = () => {
    Promise.all([api.getProducts(), api.getCargueVendedor(), api.getInventarioHoy()])
      .then(([prod, car, inv]) => {
        setProductos(prod.data)
        setCargues(car.data)
        const init = {}
        prod.data.forEach(p => { init[p.productid] = 0 })
        setCantidades(init)
        const invMap = {}
        inv.data.inventario.forEach(i => { invMap[i.productid] = i.cantidad })
        setInventarioInicial(invMap)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const solicitar = async () => {
    const items = productos
      .filter(p => (cantidades[p.productid] || 0) > 0)
      .map(p => ({ productoId: p.productid, cantidad: cantidades[p.productid] }))
    if (!items.length) return setMsg('Ingresa al menos un producto')
    try {
      await api.solicitarCargue({ items })
      setMsg('✅ Cargue solicitado correctamente. El administrador lo revisará pronto.')
      cargar()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al solicitar')
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Solicitar Cargue</h1>

      {msg && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-lg text-sm">
          {msg}
        </div>
      )}

      <div className="card space-y-4">
        <p className="text-sm text-gray-500">
          Revisa tu inventario inicial y solicita los productos que necesitas para el día.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Inventario inicial</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Cantidad a solicitar</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(p => (
              <tr key={p.productid} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{p.productname}</td>
                <td className="py-3 px-4">
                  <span className={`font-semibold ${(inventarioInicial[p.productid] || 0) === 0 ? 'text-gray-400' : 'text-indigo-600'}`}>
                    {inventarioInicial[p.productid] || 0}
                  </span>
                </td>
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
        <button onClick={solicitar} className="btn-primary">Enviar solicitud</button>
      </div>

      {cargues.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Cargues de hoy</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Solicitado</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Aprobado</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargues.map(c => (
                <tr key={c.cargueid} className="border-b border-gray-50">
                  <td className="py-3 px-4 font-medium">{c.productname}</td>
                  <td className="py-3 px-4">{c.cantidad_solicitada}</td>
                  <td className="py-3 px-4 font-semibold">{c.cantidad}</td>
                  <td className="py-3 px-4">
                    <span className={
                      c.estado === 'aceptado' ? 'badge-accepted' :
                      c.estado === 'rechazado' ? 'badge-rejected' : 'badge-pending'
                    }>{c.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}