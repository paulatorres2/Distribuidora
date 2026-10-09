import { useState } from 'react'
import { api, formatCOP } from '../../utils/api'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export default function CalendarioComisiones({ vendedorId, esAdmin = false }) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [comisiones, setComisiones] = useState([])
  const [loading, setLoading] = useState(false)
  const [cargado, setCargado] = useState(false)

  const cargar = async (m, a) => {
    setLoading(true)
    try {
      const res = await api.getComisiones(vendedorId, { mes: m, anio: a })
      setComisiones(res.data)
      setCargado(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const cambiarMes = (dir) => {
    let nuevoMes = mes + dir
    let nuevoAnio = anio
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++ }
    if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio-- }
    setMes(nuevoMes)
    setAnio(nuevoAnio)
    cargar(nuevoMes, nuevoAnio)
  }

  const marcarPagado = async (id) => {
    await api.pagarComision(id)
    cargar(mes, anio)
  }

  // Calcular días del mes
  const diasEnMes = new Date(anio, mes, 0).getDate()
  const primerDia = new Date(anio, mes - 1, 1).getDay()

  // Mapear comisiones por fecha
  const comisionMap = {}
  comisiones.forEach(c => { comisionMap[c.fecha_str] = c })

  const totalMes = comisiones.reduce((s, c) => s + (c.comision_valor || 0), 0)
  const totalPagado = comisiones.filter(c => c.pagado).reduce((s, c) => s + (c.comision_valor || 0), 0)
  const totalPendiente = totalMes - totalPagado

  return (
    <div className="space-y-4">
      {/* Header del calendario */}
      <div className="flex items-center justify-between">
        <button onClick={() => cambiarMes(-1)} className="btn-secondary text-sm py-1 px-3">←</button>
        <div className="text-center">
          <h3 className="font-semibold text-gray-800">{MESES[mes - 1]} {anio}</h3>
        </div>
        <button onClick={() => cambiarMes(1)} className="btn-secondary text-sm py-1 px-3">→</button>
      </div>

      {!cargado && (
        <button onClick={() => cargar(mes, anio)} className="btn-primary w-full">
          Ver comisiones
        </button>
      )}

      {loading && <p className="text-center text-gray-400 py-4">Cargando...</p>}

      {cargado && !loading && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Total mes</p>
              <p className="font-bold text-indigo-600 text-sm">{formatCOP(totalMes)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Pagado</p>
              <p className="font-bold text-emerald-600 text-sm">{formatCOP(totalPagado)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Pendiente</p>
              <p className="font-bold text-amber-600 text-sm">{formatCOP(totalPendiente)}</p>
            </div>
          </div>

          {/* Calendario */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            {/* Días de la semana */}
            <div className="grid grid-cols-7 bg-gray-50">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7">
              {/* Espacios vacíos al inicio */}
              {Array.from({ length: primerDia }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 border-b border-r border-gray-50" />
              ))}

              {/* Días */}
              {Array.from({ length: diasEnMes }).map((_, i) => {
                const dia = i + 1
                const fechaStr = `${anio}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
                const comision = comisionMap[fechaStr]
                const esHoy = fechaStr === hoy.toISOString().split('T')[0]

                return (
                  <div
                    key={dia}
                    className={`h-16 border-b border-r border-gray-100 p-1 flex flex-col justify-between
                      ${esHoy ? 'bg-indigo-50' : ''}
                      ${comision?.pagado ? 'bg-emerald-50' : ''}
                      ${comision && !comision.pagado ? 'bg-amber-50' : ''}
                    `}
                  >
                    <span className={`text-xs font-medium ${esHoy ? 'text-indigo-600' : 'text-gray-600'}`}>
                      {dia}
                    </span>
                    {comision && (
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-gray-700 leading-tight">
                          {formatCOP(comision.comision_valor)}
                        </p>
                        {comision.pagado ? (
                          <span className="text-xs text-emerald-600 font-medium">✓ Pagado</span>
                        ) : esAdmin ? (
                          <button
                            onClick={() => marcarPagado(comision.pagocomisionid)}
                            className="text-xs bg-emerald-600 text-white rounded px-1 py-0.5 hover:bg-emerald-700"
                          >
                            Pagar
                          </button>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">Pendiente</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-100 rounded inline-block"></span> Pagado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-100 rounded inline-block"></span> Pendiente</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-50 rounded inline-block border border-gray-200"></span> Sin venta</span>
          </div>
        </>
      )}
    </div>
  )
}