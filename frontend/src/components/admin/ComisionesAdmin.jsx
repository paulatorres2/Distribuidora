import { useEffect, useState } from 'react'
import { api } from '../../utils/api'
import CalendarioComisiones from '../shared/CalendarioComisiones'

export default function ComisionesAdmin() {
  const [vendedores, setVendedores] = useState([])
  const [vendedorId, setVendedorId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getVendedores()
      .then(r => setVendedores(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Comisiones de Vendedores</h1>

      {/* Selector de vendedor */}
      <div className="card flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar vendedor</label>
          <select
            className="input"
            value={vendedorId}
            onChange={e => setVendedorId(e.target.value)}
          >
            <option value="">Seleccionar vendedor...</option>
            {vendedores.map(v => (
              <option key={v.userid} value={v.userid}>{v.username}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendario de comisiones */}
      {vendedorId && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            📅 Comisiones — {vendedores.find(v => v.userid == vendedorId)?.username}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Los días resaltados en amarillo tienen comisiones pendientes de pago. 
            Haz clic en <strong>Pagar</strong> para marcar el día como pagado.
          </p>
          <CalendarioComisiones vendedorId={vendedorId} esAdmin={true} />
        </div>
      )}

      {!vendedorId && (
        <div className="card text-center py-12 text-gray-400">
          Selecciona un vendedor para ver sus comisiones
        </div>
      )}
    </div>
  )
}