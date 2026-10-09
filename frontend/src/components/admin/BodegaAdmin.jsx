import { useEffect, useState } from 'react'
import { api, formatCOP } from '../../utils/api'

export default function BodegaAdmin() {
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('stock') // 'stock', 'entrada', 'cliente'
  const [entradas, setEntradas] = useState([])
  const [clienteForm, setClienteForm] = useState({ cliente: '', descuento: 0, items: [] })

  const cargar = () => {
    api.getStock()
      .then(r => {
        setStock(r.data)
        setEntradas(r.data.map(p => ({ productId: p.productid, cantidad: 0 })))
        setClienteForm(f => ({
          ...f,
          items: r.data.map(p => ({ productId: p.productid, cantidad: 0 }))
        }))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const registrarEntrada = async () => {
    const items = entradas.filter(e => e.cantidad > 0)
    if (!items.length) return alert('Ingresa al menos un producto')
    await api.entradaBodega({ items })
    alert('Entrada registrada')
    cargar()
  }

  const totalBruto = clienteForm.items.reduce((sum, item, i) => {
    return sum + (item.cantidad * (stock[i]?.price || 0))
  }, 0)

  const registrarCargueCliente = async () => {
    if (!clienteForm.cliente) return alert('Ingresa el nombre del cliente')
    const items = clienteForm.items
      .map((item, i) => ({ ...item, productId: stock[i]?.productid }))
      .filter(i => i.cantidad > 0)
    if (!items.length) return alert('Agrega al menos un producto')
    const res = await api.cargueCliente({
      cliente: clienteForm.cliente,
      descuento: Number(clienteForm.descuento),
      items
    })
    alert(`Cargue registrado. Total: ${formatCOP(res.data.totalNeto)}`)
    cargar()
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  const valorTotal = stock.reduce((s, p) => s + (p.valor_total || 0), 0)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bodega</h1>
        <div className="card py-2 px-4">
          <span className="text-sm text-gray-500">Valor total bodega: </span>
          <span className="font-bold text-indigo-600">{formatCOP(valorTotal)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[['stock','📦 Stock'],['entrada','➕ Entrada'],['cliente','🛒 Cargue Cliente']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stock */}
      {tab === 'stock' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Precio</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Stock</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {stock.map(p => (
                <tr key={p.productid} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{p.productname}</td>
                  <td className="py-3 px-4">{formatCOP(p.price)}</td>
                  <td className="py-3 px-4">
                    <span className={p.cantidadexistente < 10 ? 'text-red-600 font-bold' : ''}>
                      {p.cantidadexistente}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold">{formatCOP(p.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Entrada */}
      {tab === 'entrada' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Registrar entrada de productos</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Stock actual</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Cantidad a ingresar</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((p, i) => (
                <tr key={p.productid} className="border-b border-gray-50">
                  <td className="py-3 px-4">{p.productname}</td>
                  <td className="py-3 px-4">{p.cantidadexistente}</td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="0"
                      className="input w-24"
                      value={entradas[i]?.cantidad || 0}
                      onChange={e => {
                        const updated = [...entradas]
                        updated[i] = { ...updated[i], cantidad: Number(e.target.value) }
                        setEntradas(updated)
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={registrarEntrada} className="btn-primary">Registrar entrada</button>
        </div>
      )}

      {/* Cargue cliente */}
      {tab === 'cliente' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Cargue para cliente externo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del cliente</label>
              <input
                className="input"
                placeholder="Cliente..."
                value={clienteForm.cliente}
                onChange={e => setClienteForm({ ...clienteForm, cliente: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descuento ($)</label>
              <input
                type="number"
                min="0"
                className="input"
                value={clienteForm.descuento}
                onChange={e => setClienteForm({ ...clienteForm, descuento: e.target.value })}
              />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Precio</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Cantidad</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((p, i) => (
                <tr key={p.productid} className="border-b border-gray-50">
                  <td className="py-3 px-4">{p.productname}</td>
                  <td className="py-3 px-4">{formatCOP(p.price)}</td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="0"
                      className="input w-24"
                      value={clienteForm.items[i]?.cantidad || 0}
                      onChange={e => {
                        const updated = [...clienteForm.items]
                        updated[i] = { ...updated[i], cantidad: Number(e.target.value) }
                        setClienteForm({ ...clienteForm, items: updated })
                      }}
                    />
                  </td>
                  <td className="py-3 px-4">{formatCOP((clienteForm.items[i]?.cantidad || 0) * p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Total bruto: <span className="font-semibold">{formatCOP(totalBruto)}</span></p>
              <p className="text-sm text-gray-500">Descuento: <span className="font-semibold text-red-500">- {formatCOP(clienteForm.descuento)}</span></p>
              <p className="text-lg font-bold text-indigo-600">Total neto: {formatCOP(totalBruto - clienteForm.descuento)}</p>
            </div>
            <button onClick={registrarCargueCliente} className="btn-primary">Registrar cargue</button>
          </div>
        </div>
      )}
    </div>
  )
}