import { useEffect, useState } from 'react'
import { api, formatCOP } from '../../utils/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import CalendarioComisiones from '../shared/CalendarioComisiones'
import { useAuth } from '../../context/AuthContext'

export default function DashboardVendedor() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    api.getDashboardVendedor()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Cargando dashboard...</div>
  if (!data) return null

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mi Dashboard</h1>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Ventas del mes</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCOP(data.mes?.total_mes)}</p>
          <p className="text-xs text-gray-400 mt-1">{data.mes?.dias} días trabajados</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Deudores activos</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{data.deudores?.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total en deudas</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatCOP(data.deudores?.reduce((s, d) => s + d.monto, 0))}
          </p>
        </div>
      </div>

      {/* Ventas por día */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Ventas últimos 30 días</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.historico}>
            <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => formatCOP(v)} />
            <Line type="monotone" dataKey="totalliquidacion" stroke="#6366f1" strokeWidth={2} name="Venta" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Ventas por mes */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Venta por mes</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.por_mes}>
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => formatCOP(v)} />
            <Bar dataKey="total" fill="#6366f1" radius={[4,4,0,0]} name="Total" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Lista deudores */}
      {data.deudores?.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Mis deudores</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Negocio</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Monto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {data.deudores.map(d => (
                <tr key={d.deudorid} className="border-b border-gray-50">
                  <td className="py-3 px-4 font-medium">{d.negocio}</td>
                  <td className="py-3 px-4 text-red-600 font-semibold">{formatCOP(d.monto)}</td>
                  <td className="py-3 px-4">{d.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">📅 Mis comisiones</h2>
        <CalendarioComisiones vendedorId={user?.id} />
      </div>
    </div>
  )
}