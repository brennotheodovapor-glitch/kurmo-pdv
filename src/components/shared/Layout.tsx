import{useState}from 'react'
import{Outlet,NavLink,useNavigate}from 'react-router-dom'
import{supabase}from '@/lib/supabase'
import Logo from './Logo'
import{ShoppingCart,Package,Tag,Users,BarChart3,Settings,History,Truck,QrCode,LayoutDashboard,LogOut,ChevronLeft,ChevronRight,Percent,UserCheck}from 'lucide-react'
const NAV=[
  {to:'/pdv',icon:ShoppingCart,label:'PDV'},
  {to:'/delivery',icon:Truck,label:'Delivery'},
  {to:'/historico',icon:History,label:'Historico'},
  {to:'/dashboard',icon:LayoutDashboard,label:'Dashboard'},
  {to:'/relatorios',icon:BarChart3,label:'Relatorios'},
  {to:'/vendedores',icon:UserCheck,label:'Vendedores'},
  {to:'/comissoes',icon:Percent,label:'Comissoes'},
  {to:'/produtos',icon:Package,label:'Produtos'},
  {to:'/categorias',icon:Tag,label:'Categorias'},
  {to:'/cardapio',icon:QrCode,label:'Cardapio'},
  {to:'/clientes',icon:Users,label:'Clientes'},
  {to:'/configuracoes',icon:Settings,label:'Config'},
]
export default function Layout({session}:{session:any}){
  const[collapsed,setCollapsed]=useState(false)
  const navigate=useNavigate()
  async function logout(){await supabase.auth.signOut();navigate('/')}
  return(<div style={{display:'flex',height:'100vh',overflow:'hidden',background:'var(--bg)'}}>
    <aside style={{width:collapsed?60:198,flexShrink:0,background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',transition:'width 0.2s',overflow:'hidden'}}>
      <div style={{padding:collapsed?'12px 10px':'12px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,justifyContent:collapsed?'center':'flex-start'}}>
        <Logo size={28}/>
        {!collapsed&&<div><p style={{fontFamily:'Bangers,cursive',fontSize:14,color:'var(--neon)',letterSpacing:2,lineHeight:1}}>KURMO PDV</p><p style={{fontSize:9,color:'var(--muted)',letterSpacing:1}}>SISTEMA DE VENDAS</p></div>}
      </div>
      <nav style={{flex:1,overflowY:'auto',padding:'5px'}}>
        {NAV.map(({to,icon:Icon,label})=>(<NavLink key={to} to={to} title={collapsed?label:undefined} style={({isActive})=>({display:'flex',alignItems:'center',gap:9,padding:'8px 9px',borderRadius:8,marginBottom:2,textDecoration:'none',color:isActive?'var(--neon)':'var(--muted)',background:isActive?'var(--neon-glow)':'transparent',border:isActive?'1px solid rgba(0,255,65,0.2)':'1px solid transparent',transition:'all 0.15s',justifyContent:collapsed?'center':'flex-start'})}>
          <Icon size={17} style={{flexShrink:0}}/>{!collapsed&&<span style={{fontSize:12,fontFamily:'Bangers,cursive',letterSpacing:'0.03em',whiteSpace:'nowrap'}}>{label}</span>}
        </NavLink>))}
      </nav>
      <div style={{padding:'5px',borderTop:'1px solid var(--border)'}}>
        {!collapsed&&<p style={{fontSize:9,color:'var(--muted)',padding:'0 8px 4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{session?.user?.email}</p>}
        <button onClick={logout} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 9px',borderRadius:8,background:'transparent',border:'1px solid transparent',color:'var(--muted)',cursor:'pointer',width:'100%',justifyContent:collapsed?'center':'flex-start'}}>
          <LogOut size={15}/>{!collapsed&&<span style={{fontSize:12,fontFamily:'Bangers,cursive'}}>SAIR</span>}
        </button>
        <button onClick={()=>setCollapsed(!collapsed)} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 9px',borderRadius:8,background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',cursor:'pointer',width:'100%',marginTop:3,justifyContent:collapsed?'center':'flex-start'}}>
          {collapsed?<ChevronRight size={15}/>:<><ChevronLeft size={15}/><span style={{fontSize:11,fontFamily:'Bangers,cursive'}}>RECOLHER</span></>}
        </button>
      </div>
    </aside>
    <main style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}><Outlet/></main>
  </div>)}