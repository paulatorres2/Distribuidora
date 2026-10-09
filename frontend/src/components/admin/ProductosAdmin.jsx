import { useEffect, useState } from 'react'
import { api, formatCOP } from '../../utils/api'

export default function ProductosAdmin() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ productname: '', price: '', price_sin_iva: '' })
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)

  const cargar = () => {
    api.getProducts()
      .then(r => setProductos(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.productname || !form.price) return alert('Completa todos los campos')
    if (editando) {
      await api.updateProduct(editando, form)
    } else {
      await api.createProduct(form)
    }
    setForm({ productname: '', price: '' })
    setMostrarForm(false)
    setEditando(null)
    cargar()
  }

  const editar = (p) => {
    setForm({ productname: p.productname, price: p.price, price_sin_iva: p.price_sin_iva || 0 })
    setEditando(p.productid)
    setMostrarForm(true)
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm({ productname: '', price: '' }) }} className="btn-primary">
          + Nuevo producto
        </button>
      </div>

      {mostrarForm && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">{editando ? 'Editar producto' : 'Nuevo producto'}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                className="input"
                placeholder="Nombre del producto..."
                value={form.productname}
                onChange={e => setForm({ ...form, productname: e.target.value })}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio con IVA *</label>
                <input
                type="number"
                className="input"
                placeholder="0"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio sin IVA *</label>
                <input
                type="number"
                className="input"
                placeholder="0"
                value={form.price_sin_iva}
                onChange={e => setForm({ ...form, price_sin_iva: e.target.value })}
                />
            </div>
            </div>
          <div className="flex gap-2">
            <button onClick={guardar} className="btn-primary">Guardar</button>
            <button onClick={() => { setMostrarForm(false); setEditando(null) }} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Precio</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Precio sin IVA</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Stock bodega</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(p => (
              <tr key={p.productid} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{p.productname}</td>
                <td className="py-3 px-4">{formatCOP(p.price)}</td>
                <td className="py-3 px-4">{formatCOP(p.price_sin_iva)}</td>
                <td className="py-3 px-4">{p.cantidadexistente ?? 0}</td>
                <td className="py-3 px-4">
                  <button onClick={() => editar(p)} className="btn-secondary text-xs py-1 px-3">✏️ Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}