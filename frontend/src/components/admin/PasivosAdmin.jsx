import { useEffect, useState } from 'react'
import { api, formatCOP } from '../../utils/api'

export default function PasivosAdmin() {
  const [pasivos, setPasivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ tipoGasto: '', monto: '', fecha: '', descripcion: '' })
  const [mostrarForm, setMostrarForm] = useState(false)

  const cargar = () => {
    api.getPasivos()
      .then(r => setPasivos(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.tipoGasto || !form.monto) return alert('Completa los campos requeridos')
    await api.crearPasivo(form)
    setForm({ tipoGasto: '', monto: '', fecha: '', descripcion: '' })
    setMostrarForm(false)
    cargar()
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este pasivo?')) return
    await api.eliminarPasivo(id)
    cargar()
  }

  const total = pasivos.reduce((s, p) => s + (p.monto || 0), 0)

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pasivos</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary">
          + Nuevo pasivo
        </button>
      </div>

      {mostrarForm && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Registrar pasivo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de gasto *</label>
              <input
                className="input"
                placeholder="Arriendo, combustible, nómina..."
                value={form.tipoGasto}
                onChange={e => setForm({ ...form, tipoGasto: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                value={form.monto}
                onChange={e => setForm({ ...form, monto: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                className="input"
                value={form.fecha}
                onChange={e => setForm({ ...form, fecha: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                className="input"
                placeholder="Descripción opcional..."
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={guardar} className="btn-primary">Guardar</button>
            <button onClick={() => setMostrarForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-800">Registro de pasivos</h2>
          <span className="text-lg font-bold text-red-600">Total: {formatCOP(total)}</span>
        </div>
        {pasivos.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No hay pasivos registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Tipo</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Monto</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Fecha</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Descripción</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pasivos.map(p => (
                <tr key={p.pasivoid} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{p.tipogasto}</td>
                  <td className="py-3 px-4 text-red-600 font-semibold">{formatCOP(p.monto)}</td>
                  <td className="py-3 px-4">{p.fecha}</td>
                  <td className="py-3 px-4 text-gray-500">{p.descripcion || '-'}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => eliminar(p.pasivoid)} className="btn-danger text-xs py-1 px-3">Eliminar</button>
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