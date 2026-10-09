import { useEffect, useState } from 'react'
import { api, formatCOP } from '../../utils/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'

export default function DashboardAdmin() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboardAdmin()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Cargando dashboard...</div>
  if (!data) return null

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrador</h1>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Valor en Bodega</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCOP(data.bodega?.valor_total_bodega)}</p>
          <p className="text-xs text-gray-400 mt-1">{data.bodega?.unidades_totales} unidades</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Activos del Mes</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCOP(data.activos_mes)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Descuentos del Mes</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{formatCOP(data.descuentos_mes)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Pasivos del Mes</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatCOP(data.pasivos_mes)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Deudores Activos</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{data.deudores?.total}</p>
          <p className="text-xs text-gray-400 mt-1">{formatCOP(data.deudores?.monto_total)}</p>
        </div>
      </div>

      {/* Alertas pendientes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card border-l-4 border-amber-400">
          <p className="text-sm text-gray-500">Cargues pendientes</p>
          <p className="text-3xl font-bold text-amber-600">{data.pendientes?.cargues}</p>
        </div>
        <div className="card border-l-4 border-indigo-400">
          <p className="text-sm text-gray-500">Pagos por validar</p>
          <p className="text-3xl font-bold text-indigo-600">{data.pendientes?.pagos}</p>
        </div>
      </div>

      {/* Gráfica activos vs pasivos */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Activos vs Pasivos (últimos 6 meses)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data.evolucion}>
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => formatCOP(v)} />
            <Legend />
            <Line type="monotone" dataKey="activos" stroke="#10b981" strokeWidth={2} name="Activos" />
            <Line type="monotone" dataKey="pasivos" stroke="#ef4444" strokeWidth={2} name="Pasivos" />
            <Line type="monotone" dataKey="descuentos" stroke="#f97316" strokeWidth={2} name="Descuentos" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Ventas por vendedor */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Ventas por Vendedor (mes actual)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.ventas_vendedor}>
            <XAxis dataKey="username" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => formatCOP(v)} />
            <Bar dataKey="total_ventas" fill="#6366f1" radius={[4,4,0,0]} name="Ventas" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}