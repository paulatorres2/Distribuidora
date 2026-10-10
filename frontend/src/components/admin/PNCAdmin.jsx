import { useEffect, useState } from 'react'
import { api } from '../../utils/api'

export default function PNCAdmin() {
  const [pncs, setPncs] = useState([])
  const [resumen, setResumen] = useState([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [vendedores, setVendedores] = useState([])

  const cargar = () => {
    Promise.all([
        api.getPNCPendientes(),
        api.getPNCMes(now.getFullYear(), now.getMonth() + 1),
        api.getVendedores()
    ]).then(([p, r, v]) => {
        setPncs(p.data)
        setResumen(r.data)
        setVendedores(v.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const validar = async (id) => {
    await api.validarPNC(id)
    cargar()
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">PNC - Productos No Conformes</h1>

      <div className="card flex gap-4 items-end">
        <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por vendedor</label>
            <select
            className="input"
            value={filtroVendedor}
            onChange={e => setFiltroVendedor(e.target.value)}
            >
            <option value="">Todos los vendedores</option>
            {vendedores.map(v => (
                <option key={v.userid} value={v.username}>{v.username}</option>
            ))}
            </select>
        </div>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Pendientes de validación</h2>
        {pncs.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No hay PNC pendientes</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Vendedor</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Cantidad</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Fecha</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pncs
                .filter(p => !filtroVendedor || p.vendedor === filtroVendedor)
                .map(p => (
                <tr key={p.pncid} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">{p.vendedor}</td>
                  <td className="py-3 px-4">{p.productname}</td>
                  <td className="py-3 px-4">{p.cantidad}</td>
                  <td className="py-3 px-4">{p.fecha}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => validar(p.pncid)} className="btn-success text-xs py-1 px-3">✓ Validar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Resumen PNC — {now.toLocaleString('es-CO', { month: 'long', year: 'numeric' })}
        </h2>
        {resumen.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Sin registros este mes</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Total PNC</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((r, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-3 px-4">{r.productname}</td>
                  <td className="py-3 px-4 font-semibold">{r.total_pnc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}