import { useEffect, useState } from 'react'
import { api, formatCOP } from '../../utils/api'

export default function DeudoresVendedor() {
  const [deudores, setDeudores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDeudoresVendedor()
      .then(r => setDeudores(r.data))
      .finally(() => setLoading(false))
  }, [])

  const total = deudores.filter(d => d.activo).reduce((s, d) => s + d.monto, 0)

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mis Deudores</h1>
        <div className="card py-2 px-4">
          <span className="text-sm text-gray-500">Total pendiente: </span>
          <span className="font-bold text-red-600">{formatCOP(total)}</span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {deudores.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No tienes deudores registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Negocio</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Monto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Fecha</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {deudores.map(d => (
                <tr key={d.deudorid} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{d.negocio}</td>
                  <td className="py-3 px-4 font-semibold text-red-600">{formatCOP(d.monto)}</td>
                  <td className="py-3 px-4">{d.fecha}</td>
                  <td className="py-3 px-4">
                    {d.activo
                      ? <span className="badge-pending">Pendiente</span>
                      : <span className="badge-accepted">Pagado ✓</span>
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