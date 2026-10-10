import { useEffect, useState } from 'react'
import { api, formatCOP } from '../../utils/api'

export default function DeudoresAdmin() {
  const [deudores, setDeudores] = useState([])
  //const [filtro, setFiltro] = useState({ negocio: '', activo: 'true' })
  const [loading, setLoading] = useState(true)
  const [vendedores, setVendedores] = useState([])
  const [filtro, setFiltro] = useState({ negocio: '', activo: 'true', vendedor: '' })

  const cargar = () => {
    api.getDeudores(filtro)
      .then(r => setDeudores(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    api.getVendedores().then(r => setVendedores(r.data))
  }, [])

  const marcarPagado = async (id) => {
    if (!confirm('¿Marcar este deudor como pagado?')) return
    await api.marcarPagado(id)
    cargar()
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Deudores</h1>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
        <select
            className="input"
            value={filtro.vendedor}
            onChange={e => setFiltro({ ...filtro, vendedor: e.target.value })}
        >
            <option value="">Todos</option>
            {vendedores.map(v => (
            <option key={v.userid} value={v.userid}>{v.username}</option>
            ))}
        </select>
      </div>

      <div className="card flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar negocio</label>
          <input
            className="input"
            placeholder="Nombre del negocio..."
            value={filtro.negocio}
            onChange={e => setFiltro({ ...filtro, negocio: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            className="input"
            value={filtro.activo}
            onChange={e => setFiltro({ ...filtro, activo: e.target.value })}
          >
            <option value="true">Pendientes</option>
            <option value="false">Pagados</option>
            <option value="">Todos</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-gray-400 text-center py-8">Cargando...</p>
        ) : deudores.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No hay deudores</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Negocio</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Vendedor</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Monto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Fecha</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Estado</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {deudores.map(d => (
                <tr key={d.deuorid} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{d.negocio}</td>
                  <td className="py-3 px-4">{d.vendedor}</td>
                  <td className="py-3 px-4 font-semibold text-red-600">{formatCOP(d.monto)}</td>
                  <td className="py-3 px-4">{d.fecha}</td>
                  <td className="py-3 px-4">
                    {d.activo
                      ? <span className="badge-pending">Pendiente</span>
                      : <span className="badge-accepted">Pagado</span>}
                  </td>
                  <td className="py-3 px-4">
                    {d.activo && (
                      <button onClick={() => marcarPagado(d.deudorid)} className="btn-success text-xs py-1 px-3">
                        ✓ Pagado
                      </button>
                    )}
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