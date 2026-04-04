
import { Outlet, NavLink } from 'react-router-dom'
import { ShoppingCart, History, Package, LayoutDashboard, Settings, Truck, Users, BarChart3, LogOut, Tag, QrCode } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Logo from './Logo'

const NAV = [
  { to: '/pdv', icon: ShoppingCart, label: 'PDV' },
  { to: '/delivery', icon: Truck, label: 'Delivery' },
  { to: '/cardapio', icon: QrCode, label: 'Cardápio' },
  { to: '/historico', icon: History, label: 'Histórico' },
  { to: '/categorias', icon: Tag, label: 'Categorias' },
  { to: '/produtos', icon: Package, label: 'Produtos' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/configuracoes', icon: Settings, label: 'Config' },
]

export default function Layout({ session }: { session: any }) {
  const logout = async () => { await supabase.auth.signOut(); toast.success('Até logo!') }
  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--bg)', overflow:'hidden' }}>
      <aside style={{
        width:68, display:'flex', flexDirection:'column', alignItems:'center',
        padding:'12px 0', gap:2, background:'var(--surface)',
        borderRight:'1px solid var(--border)', zIndex:10,
        boxShadow:'2px 0 20px rgba(0,255,65,0.05)'
      }}>
        <div style={{ marginBottom:10 }}><Logo size={42}/></div>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} title={label} style={{ width:'100%', display:'flex', justifyContent:'center' }}>
            {({ isActive }) => (
              <div style={{
                width:48, height:44, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', transition:'all 0.2s', position:'relative',
                color: isActive ? 'var(--neon)' : 'var(--muted)',
                background: isActive ? 'var(--neon-glow)' : 'transparent',
                border: isActive ? '1px solid rgba(0,255,65,0.3)' : '1px solid transparent',
                boxShadow: isActive ? '0 0 10px var(--neon-glow)' : 'none',
              }}>
                <Icon size={19}/>
                {isActive && <div style={{
                  position:'absolute', right:0, top:'50%', transform:'translateY(-50%)',
                  width:3, height:24, background:'var(--neon)', borderRadius:'2px 0 0 2px',
                  boxShadow:'0 0 8px var(--neon)'
                }}/>}
              </div>
            )}
          </NavLink>
        ))}
        <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          {session?.user && (
            <div title={session.user.email} style={{
              width:34, height:34, borderRadius:'50%', background:'var(--neon)', color:'#000',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'Bangers,cursive', fontSize:16,
              boxShadow:'0 0 10px var(--neon)'
            }}>
              {(session.user.email||'K').charAt(0).toUpperCase()}
            </div>
          )}
          <button onClick={logout} title="Sair" style={{
            width:36, height:36, borderRadius:8, border:'none', background:'transparent',
            color:'var(--muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <LogOut size={16}/>
          </button>
        </div>
      </aside>
      <main style={{ flex:1, overflow:'hidden' }}><Outlet/></main>
    </div>
  )
}
