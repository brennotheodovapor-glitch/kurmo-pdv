import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/shared/Layout'
import PDVPage from '@/pages/PDVPage'
import DeliveryPage from '@/pages/DeliveryPage'
import HistoryPage from '@/pages/HistoryPage'
import ProductsPage from '@/pages/ProductsPage'
import DashboardPage from '@/pages/DashboardPage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/pdv" replace />} />
        <Route path="pdv" element={<PDVPage />} />
        <Route path="delivery" element={<DeliveryPage />} />
        <Route path="historico" element={<HistoryPage />} />
        <Route path="produtos" element={<ProductsPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
