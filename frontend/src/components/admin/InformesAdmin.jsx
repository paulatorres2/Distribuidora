import { useEffect, useState } from 'react'
import { api, formatCOP } from '../../utils/api'


export default function InformesAdmin() {
  const [vendedores, setVendedores] = useState([])
  const [form, setForm] = useState({ vendedorId: '', fecha: '' })
  const [informe, setInforme] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getVendedores().then(r => setVendedores(r.data))
  }, [])

  const buscar = async () => {
    if (!form.vendedorId || !form.fecha) return setError('Selecciona un vendedor y una fecha')
    setError('')
    setLoading(true)
    try {
      const res = await api.getInformeVendedor(form)
      setInforme(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar informe')
    } finally {
      setLoading(false)
    }
  }

  const vendedorNombre = vendedores.find(v => v.userid == form.vendedorId)?.username || ''

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Informes por Vendedor</h1>

      {/* Filtros */}
      <div className="card flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
          <select
            className="input"
            value={form.vendedorId}
            onChange={e => setForm({ ...form, vendedorId: e.target.value })}
          >
            <option value="">Seleccionar vendedor...</option>
            {vendedores.map(v => (
              <option key={v.userid} value={v.userid}>{v.username}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <input
            type="date"
            className="input"
            value={form.fecha}
            onChange={e => setForm({ ...form, fecha: e.target.value })}
          />
        </div>
        <button onClick={buscar} className="btn-primary" disabled={loading}>
          {loading ? 'Cargando...' : '🔍 Buscar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {informe && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Informe de <span className="text-indigo-600">{vendedorNombre}</span> — {form.fecha}
            </h2>
            {informe.liquidacion && (
              <span className={informe.liquidacion.estado === 'completo' ? 'badge-accepted' : 'badge-pending'}>
                {informe.liquidacion.estado}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventario inicial */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">📦 Inventario Inicial</h3>
              {informe.invInicial.length === 0 ? (
                <p className="text-gray-400 text-sm">Sin registro</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-gray-500">Producto</th>
                      <th className="text-left py-2 px-3 text-gray-500">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {informe.invInicial.map((i, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="py-2 px-3">{i.productname}</td>
                        <td className="py-2 px-3 font-medium">{i.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Inventario final */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">🏁 Inventario Final</h3>
              {informe.invFinal.length === 0 ? (
                <p className="text-gray-400 text-sm">Sin registro</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-gray-500">Producto</th>
                      <th className="text-left py-2 px-3 text-gray-500">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {informe.invFinal.map((i, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="py-2 px-3">{i.productname}</td>
                        <td className="py-2 px-3 font-medium">{i.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Cargue */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">🚚 Cargue</h3>
              {informe.cargue.length === 0 ? (
                <p className="text-gray-400 text-sm">Sin registro</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-gray-500">Producto</th>
                      <th className="text-left py-2 px-3 text-gray-500">Solicitado</th>
                      <th className="text-left py-2 px-3 text-gray-500">Aprobado</th>
                      <th className="text-left py-2 px-3 text-gray-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {informe.cargue.map((c, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="py-2 px-3">{c.productname}</td>
                        <td className="py-2 px-3">{c.cantidad_solicitada}</td>
                        <td className="py-2 px-3 font-medium">{c.cantidad_aprobada}</td>
                        <td className="py-2 px-3">
                          <span className={
                            c.estado === 'aceptado' ? 'badge-accepted' :
                            c.estado === 'rechazado' ? 'badge-rejected' : 'badge-pending'
                          }>{c.estado}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* PNC */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">⚠️ PNC</h3>
              {informe.pnc.length === 0 ? (
                <p className="text-gray-400 text-sm">Sin registro</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-gray-500">Producto</th>
                      <th className="text-left py-2 px-3 text-gray-500">Cantidad</th>
                      <th className="text-left py-2 px-3 text-gray-500">Validado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {informe.pnc.map((p, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="py-2 px-3">{p.productname}</td>
                        <td className="py-2 px-3">{p.cantidad}</td>
                        <td className="py-2 px-3">
                          {p.validado
                            ? <span className="badge-accepted">✓ Sí</span>
                            : <span className="badge-pending">Pendiente</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Detalle liquidacion */}
          {informe.liquidacion && (
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-700">💰 Liquidación</h3>
                <span className="text-lg font-bold text-indigo-600">
                  {formatCOP(informe.liquidacion.totalliquidacion)}
                </span>
              </div>
              {informe.detalleLiq.length === 0 ? (
                <p className="text-gray-400 text-sm">Sin detalle</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-gray-500">Producto</th>
                      <th className="text-left py-2 px-3 text-gray-500">Vendido</th>
                      <th className="text-left py-2 px-3 text-gray-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {informe.detalleLiq.map((d, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="py-2 px-3">{d.productname}</td>
                        <td className="py-2 px-3">{d.cantidadvendida}</td>
                        <td className="py-2 px-3 font-medium">{formatCOP(d.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Pagos */}
          {informe.pagos.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">💳 Pagos</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-gray-500">Tipo</th>
                    <th className="text-left py-2 px-3 text-gray-500">Negocio</th>
                    <th className="text-left py-2 px-3 text-gray-500">Monto</th>
                    <th className="text-left py-2 px-3 text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {informe.pagos.map((p, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      <td className="py-2 px-3">{p.tipopago}</td>
                      <td className="py-2 px-3">{p.negocio || '-'}</td>
                      <td className="py-2 px-3 font-medium">{formatCOP(p.monto)}</td>
                      <td className="py-2 px-3">
                        <span className={
                          p.estado === 'aceptado' ? 'badge-accepted' :
                          p.estado === 'rechazado' ? 'badge-rejected' : 'badge-pending'
                        }>{p.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}