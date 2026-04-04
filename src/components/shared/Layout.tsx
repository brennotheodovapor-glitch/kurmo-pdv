import { Outlet, NavLink } from 'react-router-dom'
import {
  ShoppingCart, History, Package, LayoutDashboard,
  Settings, Truck, Zap, Bell, Users, BarChart3, LogOut
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/pdv', icon: ShoppingCart, label: 'PDV' },
  { to: '/delivery', icon: Truck, label: 'Delivery' },
  { to: '/historico', icon: History, label: 'Histórico' },
  { to: '/produtos', icon: Package, label: 'Produtos' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/configuracoes', icon: Settings, label: 'Ajustes' },
]

export default function Layout({ session }: { session: any }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Até logo!')
  }

  return (
    <div className="flex h-screen bg-kurmo-bg overflow-hidden">
      {*/ Sidebar */}
      <aside className="w-[72] flex flex-col items-center py-4 gap-1 bg-kurmo-surface border-r border-kurmo-border relative z-10">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center mb-4 shadow-lg glow-accent">
          <Zap className="w-5 h-5 text-white" />
        </div>

        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `group relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                isActive ? 'bg-kurmo-accentGlow text-kurmo-accentLight border border-kurmo-accent/30' : 'text-kurmo-muted hover:text-kurmo-text hover:bg-kurmo-card'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-5 h-5" />
                <div className="absolute left-full ml-3 px-2 py-1 bg-kurmo-card border border-kurmo-border rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {label}
                </div>
                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-kurmo-accent rounded-l-full" />}
              </>
            )}
          </NavLink>
        ))}

        <div className="mt-auto flex flex-col items-center gap-2">
          {session?.user && (
            <div className="group relative w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm cursor-default">
              {(session.user.email || 'U').charAt(0).toUpperCase()}
              <div className="absolute left-full ml-3 px-2 py-1 bg-kurmo-card border border-kurmo-border rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-[160px] truncate">
                {session.user.email}
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="group relative w-10 h-10 rounded-xl flex items-center justify-center text-kurmo-muted hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" />
            <div className="absolute left-full ml-3 px-2 py-1 bg-kurmo-card border border-kurmo-border rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Sair
            </div>
          </button>
        </div>
      </aside>

      {*/ Main content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
