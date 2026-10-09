import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import DashboardAdmin from '../components/admin/DashboardAdmin'
import CarguesPendientes from '../components/admin/CarguesPendientes'
import PagosPendientes from '../components/admin/PagosPendientes'
import PNCAdmin from '../components/admin/PNCAdmin'
import BodegaAdmin from '../components/admin/BodegaAdmin'
import DeudoresAdmin from '../components/admin/DeudoresAdmin'
import PasivosAdmin from '../components/admin/PasivosAdmin'
import ProductosAdmin from '../components/admin/ProductosAdmin'
import UsuariosAdmin from '../components/admin/UsuariosAdmin'
import InformesAdmin from '../components/admin/InformesAdmin'
import ComisionesAdmin from '../components/admin/ComisionesAdmin'

const links = [
  { to: '/admin',          icon: '📊', label: 'Dashboard' },
  { to: '/admin/cargues',  icon: '📦', label: 'Cargues' },
  { to: '/admin/pagos',    icon: '💳', label: 'Pagos' },
  { to: '/admin/pnc',      icon: '⚠️',  label: 'PNC' },
  { to: '/admin/bodega',   icon: '🏭', label: 'Bodega' },
  { to: '/admin/deudores', icon: '📋', label: 'Deudores' },
  { to: '/admin/pasivos',  icon: '💸', label: 'Pasivos' },
  { to: '/admin/productos',icon: '🛒', label: 'Productos' },
  { to: '/admin/usuarios', icon: '👥', label: 'Usuarios' },
  { to: '/admin/informes', icon: '📈', label: 'Informes' },
  { to: '/admin/comisiones', icon: '💵', label: 'Comisiones' },
]

export default function AdminPanel() {
  return (
    <Layout links={links}>
      <Routes>
        <Route index element={<DashboardAdmin />} />
        <Route path="cargues"   element={<CarguesPendientes />} />
        <Route path="pagos"     element={<PagosPendientes />} />
        <Route path="pnc"       element={<PNCAdmin />} />
        <Route path="bodega"    element={<BodegaAdmin />} />
        <Route path="deudores"  element={<DeudoresAdmin />} />
        <Route path="pasivos"   element={<PasivosAdmin />} />
        <Route path="productos" element={<ProductosAdmin />} />
        <Route path="usuarios"  element={<UsuariosAdmin />} />
        <Route path="*"         element={<Navigate to="/admin" />} />
        <Route path="informes" element={<InformesAdmin />} />
        <Route path="comisiones" element={<ComisionesAdmin />} />
      </Routes>
    </Layout>
  )
}