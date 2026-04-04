import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/shared/Layout'
import LoginPage from '@/pages/LoginPage'
import PDVPage from '@/pages/PDVPage'
import DeliveryPage from '@/pages/DeliveryPage'
import HistoryPage from '@/pages/HistoryPage'
import ProductsPage from '@/pages/ProductsPage'
import DashboardPage from '@/pages/DashboardPage'
import SettingsPage from '@/pages/SettingsPage'
import CustomersPage from '@/pages/CustomersPage'
import ReportsPage from '@/pages/ReportsPage'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL || ''
    if (!url || url.includes('your-project')) {
      setSession({ user: { email: 'demo@kurmo.app', id: 'demo' } })
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-kurmo-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center animate-glow-pulse">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <p className="text-kurmo-muted text-sm font-display">Carregando Kurmo PDV...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <LoginPage onLogin={() => supabase.auth.getSession().then(({ data }) => setSession(data.session))} />
  }

  return (
    <Routes>
      <Route path="/" element={<Layout session={session} />}>
        <Route index element={<Navigate to="/pdv" replace />} />
        <Route path="pdv" element={<PDVPage />} />
        <Route path="delivery" element={<DeliveryPage />} />
        <Route path="historico" element={<HistoryPage />} />
        <Route path="produtos" element={<ProductsPage />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="relatorios" element={<ReportsPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
