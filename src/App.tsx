
import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/shared/Layout'
import LoginPage from '@/pages/LoginPage'
import PDVPage from '@/pages/PDVPage'
import DeliveryPage from '@/pages/DeliveryPage'
import HistoryPage from '@/pages/HistoryPage'
import ProductsPage from '@/pages/ProductsPage'
import CategoriesPage from '@/pages/CategoriesPage'
import MenuPage from '@/pages/MenuPage'
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
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:48, animation:'neon-pulse 1s ease infinite' }}>⚡</div>
      <p style={{ fontFamily:'Bangers,cursive', fontSize:24, color:'var(--neon)', letterSpacing:2, textShadow:'0 0 15px var(--neon)' }}>KURMO PDV</p>
    </div>
  )

  if (!session) return <LoginPage onLogin={() => supabase.auth.getSession().then(({ data }) => setSession(data.session))} />

  return (
    <Routes>
      <Route path="/" element={<Layout session={session} />}>
        <Route index element={<Navigate to="/pdv" replace />} />
        <Route path="pdv" element={<PDVPage />} />
        <Route path="delivery" element={<DeliveryPage />} />
        <Route path="cardapio" element={<MenuPage />} />
        <Route path="historico" element={<HistoryPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="produtos" element={<ProductsPage />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="relatorios" element={<ReportsPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
