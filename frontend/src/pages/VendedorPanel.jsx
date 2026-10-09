import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import DashboardVendedor from '../components/vendor/DashboardVendedor'
import InventarioVendedor from '../components/vendor/InventarioVendedor'
import CargueVendedor from '../components/vendor/CargueVendedor'
import LiquidacionVendedor from '../components/vendor/LiquidacionVendedor'
import PNCVendedor from '../components/vendor/PNCVendedor'
import DeudoresVendedor from '../components/vendor/DeudoresVendedor'

const links = [
  { to: '/vendedor',             icon: '📊', label: 'Dashboard' },
  { to: '/vendedor/inventario',  icon: '📦', label: 'Inventario' },
  { to: '/vendedor/cargue',      icon: '🚚', label: 'Cargue' },
  { to: '/vendedor/liquidacion', icon: '💰', label: 'Liquidación' },
  { to: '/vendedor/pnc',         icon: '⚠️',  label: 'PNC' },
  { to: '/vendedor/deudores',    icon: '📋', label: 'Deudores' },
]

export default function VendedorPanel() {
  return (
    <Layout links={links}>
      <Routes>
        <Route index element={<DashboardVendedor />} />
        <Route path="inventario"  element={<InventarioVendedor />} />
        <Route path="cargue"      element={<CargueVendedor />} />
        <Route path="liquidacion" element={<LiquidacionVendedor />} />
        <Route path="pnc"         element={<PNCVendedor />} />
        <Route path="deudores"    element={<DeudoresVendedor />} />
        <Route path="*"           element={<Navigate to="/vendedor" />} />
      </Routes>
    </Layout>
  )
}