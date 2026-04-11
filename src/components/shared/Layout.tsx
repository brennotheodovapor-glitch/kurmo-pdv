import{useState}from 'react'
import{Outlet,NavLink,useNavigate}from 'react-router-dom'
import{supabase}from '@/lib/supabase'
import Logo from './Logo'
import{DollarSign,ShoppingCart,Package,Tag,Users,BarChart3,Settings,History,Truck,QrCode,LayoutDashboard,LogOut,ChevronLeft,ChevronRight,Percent,UserCheck,Menu,X,MapPin}from 'lucide-react'

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
  {to:'/cardapio',icon:QrCode,label:'Catalogo'},
  {to:'/clientes',icon:Users,label:'Clientes'},{to:'/cupons',icon:Tag,label:'Cupons'},
  {to:'/caixa',icon:DollarSign,label:'Caixa'},
  {to:'/bairros',icon:MapPin,label:'Bairros'},
  {to:'/configuracoes',icon:Settings,label:'Config'},
]
const SELLER_NAV=[
  {to:'/pdv',icon:ShoppingCart,label:'PDV'},
  {to:'/delivery',icon:Truck,label:'Delivery'},
  {to:'/historico',icon:History,label:'Historico'},
]

export default function Layout({session,profile}:{session:any;profile:any}){
  const[collapsed,setCollapsed]=useState(false)
  const[mobileOpen,setMobileOpen]=useState(false)
  const navigate=useNavigate()
  const isAdmin=profile?.role==='admin'
  const NAV=isAdmin?ADMIN_NAV:SELLER_NAV
  async function logout(){await supabase.auth.signOut();navigate('/')}

  const SideContent=()=>(
    <>
      <div style={{padding:collapsed?'12px 10px':'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,justifyContent:collapsed?'center':'flex-start',flexShrink:0}}>
        <Logo size={28}/>
        {!collapsed&&<div><p style={{fontFamily:'Bangers,cursive',fontSize:14,color:'var(--neon)',letterSpacing:2,lineHeight:1}}>KURMO PDV</p><p style={{fontSize:9,color:'var(--muted)',letterSpacing:1}}>{isAdmin?'ADMINISTRADOR':'VENDEDOR'}</p></div>}
      </div>
      <nav style={{flex:1,overflowY:'auto',padding:'5px'}}>
        {NAV.map(({to,icon:Icon,label})=>(<NavLink key={to} to={to} onClick={()=>setMobileOpen(false)} title={collapsed?label:undefined} style={({isActive})=>({display:'flex',alignItems:'center',gap:9,padding:'10px 9px',borderRadius:8,marginBottom:2,textDecoration:'none',color:isActive?'var(--neon)':'var(--muted)',background:isActive?'var(--neon-glow)':'transparent',border:isActive?'1px solid rgba(0,255,65,0.2)':'1px solid transparent',transition:'all 0.15s',justifyContent:collapsed?'center':'flex-start'})}>
          <Icon size={18} style={{flexShrink:0}}/>{!collapsed&&<span style={{fontSize:13,fontFamily:'Bangers,cursive',letterSpacing:'0.03em',whiteSpace:'nowrap'}}>{label}</span>}
        </NavLink>))}
      </nav>
      <div style={{padding:'5px',borderTop:'1px solid var(--border)',flexShrink:0}}>
        {!collapsed&&<p style={{fontSize:9,color:'var(--muted)',padding:'0 8px 4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.name||session?.user?.email}</p>}
        <button onClick={logout} style={{display:'flex',alignItems:'center',gap:8,padding:'9px',borderRadius:8,background:'transparent',border:'1px solid transparent',color:'var(--muted)',cursor:'pointer',width:'100%',justifyContent:collapsed?'center':'flex-start'}}>
          <LogOut size={16}/>{!collapsed&&<span style={{fontSize:12,fontFamily:'Bangers,cursive'}}>SAIR</span>}
        </button>
        <button onClick={()=>setCollapsed(!collapsed)} style={{display:'none',alignItems:'center',gap:8,padding:'7px 9px',borderRadius:8,background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',cursor:'pointer',width:'100%',marginTop:3,justifyContent:collapsed?'center':'flex-start'}} className="desktop-only">
          {collapsed?<ChevronRight size={15}/>:<><ChevronLeft size={15}/><span style={{fontSize:11,fontFamily:'Bangers,cursive'}}>RECOLHER</span></>}
        </button>
      </div>
    </>
  )

  return(
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'var(--bg)'}}>
      {/* Desktop sidebar */}
      <aside className="sidebar-desktop" style={{width:collapsed?60:198,flexShrink:0,background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',transition:'width 0.2s',overflow:'hidden'}}>
        <SideContent/>
        
      </aside>

      {/* Mobile overlay */}
      {mobileOpen&&<div onClick={()=>setMobileOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:40,display:'none'}} className="mobile-overlay"/>}
      
      {/* Mobile drawer */}
      <aside className="sidebar-mobile" style={{position:'fixed',top:0,left:mobileOpen?0:-220,width:210,height:'100vh',background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',transition:'left 0.25s',zIndex:50,overflow:'hidden'}}>
        <SideContent/>
      </aside>

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        {/* Mobile topbar */}
        <div className="mobile-topbar" style={{display:'none',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--surface)',flexShrink:0}}>
          <button onClick={()=>setMobileOpen(!mobileOpen)} style={{background:'none',border:'none',color:'var(--neon)',cursor:'pointer',padding:4}}>
            {mobileOpen?<X size={22}/>:<Menu size={22}/>}
          </button>
          <Logo size={24}/>
          <span style={{fontFamily:'Bangers,cursive',fontSize:16,color:'var(--neon)',letterSpacing:2}}>KURMO PDV</span>
          <span style={{marginLeft:'auto',fontSize:10,color:'var(--muted)',maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.name||''}</span>
        </div>
        <main style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}><Outlet/></main>
      </div>
    </div>
  )
}