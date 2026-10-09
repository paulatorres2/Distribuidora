import { useEffect, useState } from 'react'
import { api, formatCOP } from '../../utils/api'

const TIPOS_PAGO = [
  { id: 1, nombre: 'Efectivo' },
  { id: 2, nombre: 'Crédito' },
  { id: 3, nombre: 'Nequi' },
  { id: 4, nombre: 'Transferencia' },
  { id: 5, nombre: 'Daviplata' },
  { id: 6, nombre: 'Descuento' }
]

export default function LiquidacionVendedor() {
  const [liquidacion, setLiquidacion] = useState(null)
  const [liquidacionId, setLiquidacionId] = useState(null)
  const [pagos, setPagos] = useState([{ tipoPagoId: 1, monto: '', negocio: '' }])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('hoy')
  const [pagosEnviados, setPagosEnviados] = useState(false)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0]
    Promise.all([
        api.calcularLiquidacion(),
        api.getLiquidacionesVendedor(),
        api.getSolicitudNegativaVendedor()
    ]).then(async ([liq, hist, solicitud]) => {
        setLiquidacion(liq.data)
        setHistorial(hist.data)

        // Verificar estado de solicitud negativa
        if (solicitud.data.estado === 'pendiente') {
        setMsg('⚠️ Tienes productos con valores negativos. Esperando validación del administrador.')
        } else if (solicitud.data.estado === 'aprobado') {
        setMsg('✅ El administrador aprobó tu liquidación con valores negativos. Ya puedes generarla.')
        } else if (solicitud.data.estado === 'rechazado') {
        setMsg('ℹ️ El administrador rechazó los valores negativos. Al generar la liquidación esos productos quedarán en 0.')
        }

        const liqHoy = hist.data.find(l => l.fecha?.split('T')[0] === hoy)
        if (liqHoy) {
        setLiquidacionId(liqHoy.liquidacionid)
        const pagosRes = await api.getPagosLiquidacion(liqHoy.liquidacionid)
        if (pagosRes.data.length > 0) {
            setPagosEnviados(true)
            if (!solicitud.data.estado) {
            setMsg('ℹ️ Ya registraste los pagos de hoy. Espera la validación del administrador.')
            }
        }
        }
    }).finally(() => setLoading(false))
  }, [])

  const cargar = async () => {
    const hoy = new Date().toISOString().split('T')[0]
    const [liq, hist] = await Promise.all([
        api.calcularLiquidacion(),
        api.getLiquidacionesVendedor()
    ])
    setLiquidacion(liq.data)
    setHistorial(hist.data)
    const liqHoy = hist.data.find(l => l.fecha?.split('T')[0] === hoy)
    if (liqHoy) {
        setLiquidacionId(liqHoy.liquidacionid)
        // Actualizar el total con el de la liquidación guardada
        setLiquidacion(prev => ({ ...prev, total: liqHoy.totalliquidacion }))
        const pagosRes = await api.getPagosLiquidacion(liqHoy.liquidacionid)
        if (pagosRes.data.length > 0) {
        setPagosEnviados(true)
        }
    }
  }

  const generarLiquidacion = async () => {
    try {
        const res = await api.generarLiquidacion()
        setLiquidacionId(res.data.liquidacionId)
        setMsg('✅ Liquidación generada. Ahora registra los métodos de pago.')
        cargar()
    } catch (err) {
        const error = err.response?.data
        if (error?.liquidacionId) {
        setLiquidacionId(error.liquidacionId)
        setMsg('ℹ️ Ya tienes una liquidación generada hoy. Puedes registrar tus pagos.')
        } else if (error?.tieneNegativos) {
        setMsg('⚠️ Hay productos con cantidades negativas. Se notificó al administrador. Cuando el administrador valide podrás generar la liquidación.')
        } else if (error?.puedeGenerar) {
        setMsg('ℹ️ El administrador ya validó tu liquidación. Presiona de nuevo para generarla.')
        } else {
        setMsg('❌ ' + (error?.error || 'Error al generar'))
        }
    }
  }

  const agregarPago = () => {
    setPagos([...pagos, { tipoPagoId: 1, monto: '', negocio: '' }])
  }

  const eliminarPago = (i) => {
    setPagos(pagos.filter((_, idx) => idx !== i))
  }

  const sumaPagos = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0)

  const registrarPagos = async () => {
    if (!liquidacionId) return setMsg('Primero genera la liquidación')
    const total = liquidacion?.total || liquidacion?.totalliquidacion || 0
    if (sumaPagos !== total) return setMsg(`Los pagos deben sumar exactamente ${formatCOP(total)}. Actualmente: ${formatCOP(sumaPagos)}`)
    if (pagosEnviados) return setMsg('Los pagos ya fueron enviados, espera la validación del administrador.')
    setEnviando(true)
    try {
      await api.registrarPagos({
        liquidacionId,
        pagos: pagos.map(p => ({ ...p, monto: Number(p.monto) }))
      })
      setPagosEnviados(true)
      setMsg('✅ Pagos enviados correctamente. El administrador los validará pronto.')
      cargar()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al registrar pagos')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Liquidación</h1>

      <div className="flex gap-2 border-b border-gray-200">
        {[['hoy','💰 Liquidación de hoy'],['historial','📋 Historial']].map(([key, label]) => (
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

      {msg && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-lg text-sm">
          {msg}
        </div>
      )}

      {tab === 'hoy' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-800">Detalle de ventas — {liquidacion?.fecha}</h2>
              <span className="text-xl font-bold text-indigo-600">{formatCOP(liquidacion?.total)}</span>
            </div>
            {liquidacion?.items?.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No hay ventas registradas hoy</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Inicial</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Cargue</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">PNC</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Final</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Vendido</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {liquidacion?.items?.map(item => (
                    <tr key={item.productid} className={`border-b border-gray-50 ${Number(item.vendido) < 0 ? 'bg-red-50' : ''}`}>
                      <td className="py-3 px-4 font-medium">{item.productname}</td>
                      <td className="py-3 px-4">{item.inv_inicial}</td>
                      <td className="py-3 px-4">{item.cargue}</td>
                      <td className="py-3 px-4 text-amber-600">{item.pnc}</td>
                      <td className="py-3 px-4">{item.inv_final}</td>
                      <td className={`py-3 px-4 font-semibold ${Number(item.vendido) < 0 ? 'text-red-600' : ''}`}>
                        {item.vendido} {Number(item.vendido) < 0 ? '⚠️' : ''}
                        </td>
                      <td className="py-3 px-4 font-semibold text-emerald-600">{formatCOP(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {liquidacion?.total > 0 && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-lg space-y-2 border border-indigo-100">
                    <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total con IVA (a entregar):</span>
                    <span className="font-bold text-indigo-700">{formatCOP(liquidacion?.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total sin IVA (base comisión):</span>
                    <span className="font-semibold text-gray-700">{formatCOP(liquidacion?.total_sin_iva)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-indigo-200 pt-2">
                    <span className="text-gray-600">Comisión ({liquidacion?.comision_pct}%):</span>
                    <span className="font-bold text-emerald-600">{formatCOP(liquidacion?.comision_valor)}</span>
                    </div>
                </div>
            )}
            <div className="mt-4 flex gap-3">
                <button
                    onClick={generarLiquidacion}
                    className="btn-primary"
                    disabled={pagosEnviados}
                >
                    {pagosEnviados ? '✅ Liquidación completada' : 'Generar liquidación oficial'}
                </button>
                <button
                    onClick={async () => {
                    try {
                        const res = await api.solicitarInicioCero()
                        setMsg('✅ ' + res.data.message)
                    } catch (err) {
                        setMsg('❌ ' + (err.response?.data?.error || 'Error al solicitar'))
                    }
                    }}
                    className="btn-secondary"
                    disabled={pagosEnviados}
                >
                    📋 Solicitar inventario inicial en ceros
                </button>
            </div>
          </div>

          {liquidacionId && !pagosEnviados && (
            <div className="card space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-gray-800">Métodos de pago</h2>
                <div className="text-sm">
                  <span className="text-gray-500">Total a pagar: </span>
                  <span className="font-bold text-indigo-600">{formatCOP(liquidacion?.total)}</span>
                  <span className="text-gray-500 ml-4">Ingresado: </span>
                  <span className={`font-bold ${sumaPagos === liquidacion?.total ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCOP(sumaPagos)}
                  </span>
                </div>
              </div>

              {pagos.map((pago, i) => (
                <div key={i} className="flex gap-3 items-end border border-gray-100 rounded-lg p-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de pago</label>
                    <select
                      className="input"
                      value={pago.tipoPagoId}
                      onChange={e => {
                        const updated = [...pagos]
                        updated[i] = { ...updated[i], tipoPagoId: Number(e.target.value) }
                        setPagos(updated)
                      }}
                    >
                      {TIPOS_PAGO.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Monto</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="0"
                      value={pago.monto}
                      onChange={e => {
                        const updated = [...pagos]
                        updated[i] = { ...updated[i], monto: e.target.value }
                        setPagos(updated)
                      }}
                    />
                  </div>
                  {(pago.tipoPagoId === 2 || pago.tipoPagoId === 6) && (
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                        {pago.tipoPagoId === 2 ? 'Negocio (crédito)' : 'Negocio (descuento)'}
                        </label>
                        <input
                        className="input"
                        placeholder="Nombre del negocio..."
                        value={pago.negocio}
                        onChange={e => {
                            const updated = [...pagos]
                            updated[i] = { ...updated[i], negocio: e.target.value }
                            setPagos(updated)
                        }}
                        />
                    </div>
                  )}
                  {pagos.length > 1 && (
                    <button onClick={() => eliminarPago(i)} className="btn-danger text-xs py-2 px-3 mb-0.5">✕</button>
                  )}
                </div>
              ))}

              <div className="flex gap-3">
                <button onClick={agregarPago} className="btn-secondary text-sm">+ Agregar método de pago</button>
                <button
                  onClick={registrarPagos}
                  className="btn-primary"
                  disabled={enviando || pagosEnviados}
                >
                  {enviando ? 'Enviando...' : 'Registrar pagos'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div className="card overflow-x-auto">
          {historial.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay liquidaciones anteriores</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Fecha</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Total</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Pagado</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {historial.map(l => (
                  <tr key={l.liquidacionid} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">{l.fecha}</td>
                    <td className="py-3 px-4 font-semibold">{formatCOP(l.totalliquidacion)}</td>
                    <td className="py-3 px-4 text-emerald-600">{formatCOP(l.pagado)}</td>
                    <td className="py-3 px-4">
                      <span className={l.estado === 'completo' ? 'badge-accepted' : 'badge-pending'}>
                        {l.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}