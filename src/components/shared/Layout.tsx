import { Outlet, NavLink } from 'react-router-dom'
import {
  ShoppingCart, History, Package, LayoutDashboard,
  Settings, Truck, Zap, Bell
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/pdv', icon: ShoppingCart, label: 'PDV' },
  { to: '/delivery', icon: Truck, label: 'Delivery' },
  { to: '/historico', icon: History, label: 'Histórico' },
  { to: '/produtos', icon: Package, label: 'Produtos' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/configuracoes', icon: Settings, label: 'Ajustes' },
]

export default function Layout() {
  const [notifs] = useState(2)

  return (
    <div className="flex h-screen bg-kurmo-bg overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[72px] flex flex-col items-center py-4 gap-1 bg-kurmo-surface border-r border-kurmo-border relative z-10">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center mb-4 shadow-lg glow-accent">
          <Zap className="w-5 h-5 text-white" />
        </div>

        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-kurmo-accentGlow text-kurmo-accentLight border border-kurmo-accent/30'
                  : 'text-kurmo-muted hover:text-kurmo-text hover:bg-kurmo-card'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-5 h-5" />
                {/* Tooltip */}
                <div className="absolute left-full ml-3 px-2 py-1 bg-kurmo-card border border-kurmo-border rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {label}
                </div>
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-kurmo-accent rounded-l-full" />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Notification bell */}
        <div className="mt-auto relative cursor-pointer group">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl text-kurmo-muted hover:text-kurmo-text hover:bg-kurmo-card transition-all">
            <Bell className="w-5 h-5" />
            {notifs > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-kurmo-accent rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                {notifs}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
