import { useEffect, useState } from 'react'
import { api, formatCOP } from '../../utils/api'

export default function PagosPendientes() {
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [vendedores, setVendedores] = useState([])

  const cargar = () => {
    Promise.all([
        api.getPagosPendientes(),
        api.getVendedores()
    ]).then(([p, v]) => {
        setPagos(p.data)
        setVendedores(v.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const aceptar = async (id) => {
    await api.aceptarPago(id)
    cargar()
  }

  const rechazar = async (id) => {
    await api.rechazarPago(id)
    cargar()
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pagos Pendientes</h1>
        <div className="card mb-6 flex gap-4 items-end">
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
      {pagos.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">No hay pagos pendientes</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Vendedor</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Fecha</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Tipo de Pago</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Negocio</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Monto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagos
                .filter(p => !filtroVendedor || p.vendedor === filtroVendedor)
                .map(p => (
                <tr key={p.pagosid} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{p.vendedor}</td>
                  <td className="py-3 px-4">{p.fecha_liquidacion}</td>
                  <td className="py-3 px-4">
                    <span className="badge-pending">{p.tipopago}</span>
                  </td>
                  <td className="py-3 px-4">{p.negocio || '-'}</td>
                  <td className="py-3 px-4 font-semibold text-gray-800">{formatCOP(p.monto)}</td>
                  <td className="py-3 px-4 flex gap-2">
                    <button onClick={() => aceptar(p.pagosid)} className="btn-success text-xs py-1 px-3">✓ Aceptar</button>
                    <button onClick={() => rechazar(p.pagosid)} className="btn-danger text-xs py-1 px-3">✗ Rechazar</button>
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