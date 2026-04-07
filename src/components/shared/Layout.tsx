import{useState,useEffect}from 'react'
import{Outlet,NavLink,useNavigate}from 'react-router-dom'
import{supabase}from '@/lib/supabase'
import Logo from './Logo'
import{ShoppingCart,Package,Tag,Users,BarChart3,Settings,History,Truck,QrCode,LayoutDashboard,LogOut,Menu,X,Percent,UserCheck}from 'lucide-react'

const ADMIN_NAV=[
  {to:'/pdv',icon:ShoppingCart,label:'PDV'},
  {to:'/delivery',icon:Truck,label:'Delivery'},
  {to:'/historico',icon:History,label:'Historico'},
  {to:'/dashboard',icon:LayoutDashboard,label:'Dashboard'},
  {to:'/relatorios',icon:BarChart3,label:'Relatorios'},
  {to:'/vendedores',icon:UserCheck,label:'Vendedores'},
  {to:'/comissoes',icon:Percent,label:'Comissoes'},
  {to:'/produtos',icon:Package,label:'Produtos'},
  {to:'/categorias',icon:Tag,label:'Categorias'},
  {to:'/clientes',icon:Users,label:'Clientes'},
  {to:'/configuracoes',icon:Settings,label:'Config'},
]
const SELLER_NAV=[
  {to:'/pdv',icon:ShoppingCart,label:'PDV'},
  {to:'/delivery',icon:Truck,label:'Delivery'},
  {to:'/historico',icon:History,label:'Historico'},
]

export default function Layout({session,userRole}:{session:any;userRole:string}){
  const[open,setOpen]=useState(false)
  const navigate=useNavigate()
  const NAV=userRole==='admin'?ADMIN_NAV:SELLER_NAV

  async function logout(){await supabase.auth.signOut();navigate('/')}

  return(
    <div style={{display:'flex',height:'100dvh',overflow:'hidden',background:'var(--bg)'}}>
      {/* Mobile overlay */}
      {open&&<div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:40,display:'none'}} className="mobile-overlay"/>}

      {/* Sidebar */}
      <aside className="sidebar" style={{width:190,flexShrink:0,background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',transition:'transform 0.25s',zIndex:50}}>
        <div style={{padding:'12px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
          <Logo size={28}/>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontFamily:'Bangers,cursive',fontSize:14,color:'var(--neon)',letterSpacing:2,lineHeight:1}}>KURMO PDV</p>
            <p style={{fontSize:9,color:'var(--muted)',letterSpacing:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userRole==='admin'?'ADMINISTRADOR':'VENDEDOR'}</p>
          </div>
          <button onClick={()=>setOpen(false)} className="mobile-close-btn" style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',display:'none'}}>
            <X size={18}/>
          </button>
        </div>
        <nav style={{flex:1,overflowY:'auto',padding:'6px'}}>
          {NAV.map(({to,icon:Icon,label})=>(
            <NavLink key={to} to={to} onClick={()=>setOpen(false)} style={({isActive})=>({display:'flex',alignItems:'center',gap:10,padding:'10px 10px',borderRadius:8,marginBottom:3,textDecoration:'none',color:isActive?'var(--neon)':'var(--muted)',background:isActive?'var(--neon-glow)':'transparent',border:isActive?'1px solid rgba(0,255,65,0.2)':'1px solid transparent',transition:'all 0.15s',fontSize:13,fontFamily:'Bangers,cursive',letterSpacing:'0.05em'})}>
              <Icon size={17} style={{flexShrink:0}}/><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{padding:'6px',borderTop:'1px solid var(--border)'}}>
          <p style={{fontSize:9,color:'var(--muted)',padding:'0 8px 5px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{session?.user?.email}</p>
          <button onClick={logout} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 10px',borderRadius:8,background:'transparent',border:'1px solid transparent',color:'var(--muted)',cursor:'pointer',width:'100%',fontSize:12,fontFamily:'Bangers,cursive'}}>
            <LogOut size={15}/>SAIR
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        {/* Mobile topbar */}
        <div className="mobile-topbar" style={{display:'none',padding:'10px 14px',background:'var(--surface)',borderBottom:'1px solid var(--border)',alignItems:'center',gap:12,flexShrink:0}}>
          <button onClick={()=>setOpen(true)} style={{background:'none',border:'none',color:'var(--neon)',cursor:'pointer',padding:4}}>
            <Menu size={22}/>
          </button>
          <Logo size={22}/>
          <span style={{fontFamily:'Bangers,cursive',fontSize:16,color:'var(--neon)',letterSpacing:2}}>KURMO PDV</span>
        </div>
        <main style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <Outlet/>
        </main>
      </div>

      <style>{`
        @media(max-width:768px){
          .sidebar{position:fixed;top:0;left:0;height:100dvh;transform:translateX(0);z-index:50!important;}
          .mobile-topbar{display:flex!important;}
          .mobile-overlay{display:block!important;}
          .mobile-close-btn{display:block!important;}
        }
      `}</style>
    </div>
  )
}