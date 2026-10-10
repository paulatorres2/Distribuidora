import { useEffect, useState } from 'react'
import { api, formatCOP } from '../../utils/api'

export default function CarguesPendientes() {
  const [cargues, setCargues] = useState([])
  const [solicitudesCero, setSolicitudesCero] = useState([])
  const [loading, setLoading] = useState(true)
  const [cantidades, setCantidades] = useState({})
  const [solicitudesNegativas, setSolicitudesNegativas] = useState([])
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [vendedores, setVendedores] = useState([])


  const cargar = () => {
    setLoading(true)
    Promise.all([
        api.getCarguesPendientes(),
        api.getSolicitudesCero(),
        api.getSolicitudesNegativas(),
        api.getVendedores()
    ]).then(([c, s, n, v]) => {
        setCargues(c.data)
        setSolicitudesCero(s.data)
        setSolicitudesNegativas(n.data)
        setVendedores(v.data)
        const init = {}
        c.data.forEach(c => {
        init[c.cargueid] = Math.min(c.cantidad_solicitada, c.stock)
        })
        setCantidades(init)
    }).catch(err => {
        console.error('Error cargando datos:', err)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const aprobar = async (id) => {
    const cant = cantidades[id]
    if (cant === undefined || cant < 0) return alert('Ingresa una cantidad válida')
    await api.aprobarCargue(id, Number(cant))
    cargar()
  }

  const rechazar = async (id) => {
    await api.rechazarCargue(id)
    cargar()
  }

  const aprobarCero = async (id) => {
    await api.aprobarSolicitudCero(id)
    cargar()
  }

  const aprobarNegativa = async (id) => {
    await api.aprobarNegativa(id)
    cargar()
  }

    const rechazarNegativa = async (id) => {
    await api.rechazarNegativa(id)
    cargar()
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8">
      {solicitudesCero.length > 0 && (
        <div className="card mb-6 border-l-4 border-amber-400">
          <h2 className="font-semibold text-gray-800 mb-4">📋 Solicitudes de inventario inicial en cero</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Vendedor</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Fecha</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {solicitudesCero.map(s => (
                <tr key={s.solicitudid} className="border-b border-gray-50">
                  <td className="py-3 px-4 font-medium">{s.vendedor}</td>
                  <td className="py-3 px-4">{s.fecha}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => aprobarCero(s.solicitudid)} className="btn-success text-xs py-1 px-3">
                      ✓ Aprobar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {solicitudesNegativas.length > 0 && (
        <div className="card mb-6 border-l-4 border-red-400">
            <h2 className="font-semibold text-gray-800 mb-4">⚠️ Solicitudes de liquidación con valores negativos</h2>
            <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Vendedor</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Fecha</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Total</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Productos negativos</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Acciones</th>
                </tr>
            </thead>
            <tbody>
                {solicitudesNegativas.map(s => {
                const detalle = typeof s.detalle === 'string' ? JSON.parse(s.detalle) : s.detalle
                const negativos = detalle.filter(d => Number(d.vendido) < 0)
                return (
                    <tr key={s.solicitudid} className="border-b border-gray-50">
                    <td className="py-3 px-4 font-medium">{s.vendedor}</td>
                    <td className="py-3 px-4">{s.fecha}</td>
                    <td className="py-3 px-4 font-semibold">{formatCOP(s.total)}</td>
                    <td className="py-3 px-4">
                        {negativos.map((n, i) => (
                        <span key={i} className="badge-rejected mr-1">
                            {n.productname}: {n.vendido}
                        </span>
                        ))}
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                        <button onClick={() => aprobarNegativa(s.solicitudid)} className="btn-success text-xs py-1 px-3">
                        ✓ Aprobar
                        </button>
                        <button onClick={() => rechazarNegativa(s.solicitudid)} className="btn-danger text-xs py-1 px-3">
                        ✗ Poner en 0
                        </button>
                    </td>
                    </tr>
                )
                })}
            </tbody>
            </table>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Cargues Pendientes</h1>
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
      {cargues.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">No hay cargues pendientes</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Vendedor</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Solicitado</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Stock</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Aprobar cantidad</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargues
                .filter(c => !filtroVendedor || c.vendedor === filtroVendedor)
                .map(c => (
                <tr key={c.cargueid} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{c.vendedor}</td>
                  <td className="py-3 px-4">{c.productname}</td>
                  <td className="py-3 px-4">{c.cantidad_solicitada}</td>
                  <td className="py-3 px-4">
                    <span className={c.stock < c.cantidad_solicitada ? 'text-red-600 font-medium' : 'text-emerald-600'}>
                      {c.stock}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      className="input w-24"
                      value={cantidades[c.cargueid] ?? Math.min(c.cantidad_solicitada, c.stock)}
                      onChange={e => setCantidades({ ...cantidades, [c.cargueid]: Number(e.target.value) })}
                    />
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    <button onClick={() => aprobar(c.cargueid)} className="btn-success text-xs py-1 px-3">✓ Aprobar</button>
                    <button onClick={() => rechazar(c.cargueid)} className="btn-danger text-xs py-1 px-3">✗ Rechazar</button>
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

  