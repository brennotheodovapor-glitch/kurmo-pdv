import{NavLink,useLocation,Outlet,useNavigate}from 'react-router-dom'
import{supabase}from '@/lib/supabase'
import{ShoppingCart,Truck,History,Settings,DollarSign,MapPin,QrCode,ChevronDown,ChevronRight,Package,Tag,Users,Percent,BarChart2,UserCheck,LayoutDashboard,CreditCard}from 'lucide-react'
import{useState,useEffect}from 'react'

type NavItem={to:string;icon:any;label:string;adminOnly?:boolean}

const MAIN_NAV:NavItem[]=[
  {to:'/pdv',icon:ShoppingCart,label:'PDV'},
  {to:'/delivery',icon:Truck,label:'Delivery'},
  {to:'/historico',icon:History,label:'Historico'},
  {to:'/fiado',icon:CreditCard,label:'Fiado'},
  {to:'/dashboard',icon:LayoutDashboard,label:'Dashboard'},
  {to:'/caixa',icon:DollarSign,label:'Caixa'},
  {to:'/cardapio',icon:QrCode,label:'Catalogo'},
  {to:'/bairros',icon:MapPin,label:'Bairros'},
]

const CONFIG_NAV:NavItem[]=[
  {to:'/relatorios',icon:BarChart2,label:'Relatorios'},
  {to:'/vendedores',icon:UserCheck,label:'Vendedores',adminOnly:true},
  {to:'/comissoes',icon:Percent,label:'Comissoes'},
  {to:'/produtos',icon:Package,label:'Produtos',adminOnly:true},
  {to:'/categorias',icon:Tag,label:'Categorias',adminOnly:true},
  {to:'/clientes',icon:Users,label:'Clientes'},
  {to:'/cupons',icon:Tag,label:'Cupons',adminOnly:true},
  {to:'/configuracoes',icon:Settings,label:'Configuracoes',adminOnly:true},
]

const MOBILE_NAV:NavItem[]=[
  {to:'/pdv',icon:ShoppingCart,label:'PDV'},
  {to:'/delivery',icon:Truck,label:'Entrega'},
  {to:'/historico',icon:History,label:'Histórico'},
  {to:'/fiado',icon:CreditCard,label:'Fiado'},
  {to:'/dashboard',icon:LayoutDashboard,label:'Mais'},
]

export default function Layout({children,userRole,sellerName,pendingOrders}:{children?:React.ReactNode;userRole?:string;sellerName?:string;pendingOrders?:number}){
  const location=useLocation()
  const navigate=useNavigate()
  async function handleLogout(){await supabase.auth.signOut();navigate('/login',{replace:true})}
  const isAdmin=userRole==='admin'||!userRole
  const configPaths=CONFIG_NAV.map(n=>n.to)
  const isConfigActive=configPaths.some(p=>location.pathname.startsWith(p))
  const[configOpen,setConfigOpen]=useState(isConfigActive)

  useEffect(()=>{
    if(isConfigActive)setConfigOpen(true)
  },[location.pathname])

  const nl=(item:NavItem)=>(
    <NavLink key={item.to} to={item.to} style={({isActive})=>({
      display:'flex',alignItems:'center',gap:10,padding:'9px 16px',
      borderRadius:8,textDecoration:'none',fontSize:13,fontFamily:'Bangers,cursive',letterSpacing:0.5,
      transition:'all 0.15s',
      background:isActive?'rgba(0,255,65,0.08)':'transparent',
      color:isActive?'var(--neon)':'var(--muted)',
      borderLeft:isActive?'2px solid var(--neon)':'2px solid transparent',
    })}>
      <item.icon size={15}/>
      <span style={{flex:1}}>{item.label}</span>
      {item.to==='/delivery'&&(pendingOrders||0)>0&&(
        <span style={{
          minWidth:18,height:18,borderRadius:9,
          background:'#ff3333',color:'#fff',
          fontSize:10,fontWeight:700,fontFamily:'Inter,sans-serif',
          display:'inline-flex',alignItems:'center',justifyContent:'center',
          padding:'0 4px',lineHeight:1,
          animation:'neon-pulse 1s ease-in-out infinite',
          boxShadow:'0 0 6px rgba(255,51,51,0.6)'
        }}>{(pendingOrders||0)>9?'9+':(pendingOrders||0)}</span>
      )}
    </NavLink>
  )

  return(
    <div style={{height:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <style>{`
        @media(max-width:640px){
          .sidebar-desktop{display:none!important}
          .bottom-nav-mobile{display:flex!important}
          .main-area{padding-bottom:56px}
        }
        @media(min-width:641px){
          .sidebar-desktop{display:flex!important}
          .bottom-nav-mobile{display:none!important}
          .main-area{padding-bottom:0}
        }
      `}</style>

      {/* Desktop layout: sidebar + content */}
      <div style={{flex:1,display:'flex',overflow:'hidden',minHeight:0}}>

        {/* Sidebar desktop */}
        <div className='sidebar-desktop' style={{width:190,flexShrink:0,background:'var(--surface)',borderRight:'1px solid var(--border)',flexDirection:'column',overflow:'hidden'}}>
          {/* Logo */}
          <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:10,background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <ShoppingCart size={16} color='var(--neon)'/>
            </div>
            <div>
              <p style={{fontFamily:'Bangers,cursive',fontSize:16,color:'var(--neon)',letterSpacing:1,lineHeight:1}}>KURMO PDV</p>
              <p style={{fontSize:9,color:'var(--muted)',marginTop:1}}>{isAdmin?'ADMINISTRADOR':(sellerName||'VENDEDOR')}</p>
            </div>
          </div>
          {/* Nav */}
          <nav style={{flex:1,overflowY:'auto',padding:'8px',display:'flex',flexDirection:'column',gap:2}}>
            {MAIN_NAV.filter(n=>!n.adminOnly||isAdmin).map(nl)}
            {/* Gestão */}
            {isAdmin&&(
              <div style={{marginTop:4}}>
                <button onClick={()=>setConfigOpen(v=>!v)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 16px',borderRadius:8,background:isConfigActive?'rgba(0,255,65,0.04)':'transparent',border:'none',cursor:'pointer',color:isConfigActive?'var(--neon)':'var(--muted)',fontFamily:'Bangers,cursive',fontSize:13,letterSpacing:0.5,borderLeft:isConfigActive?'2px solid var(--neon)':'2px solid transparent'}}>
                  <Settings size={15}/>
                  <span style={{flex:1,textAlign:'left'}}>GESTAO</span>
                  {configOpen?<ChevronDown size={12}/>:<ChevronRight size={12}/>}
                </button>
                {configOpen&&(
                  <div style={{paddingLeft:12,display:'flex',flexDirection:'column',gap:1,marginTop:2}}>
                    {CONFIG_NAV.filter(n=>!n.adminOnly||isAdmin).map(item=>(
                      <NavLink key={item.to} to={item.to} style={({isActive})=>({
                        display:'flex',alignItems:'center',gap:8,padding:'7px 12px',
                        borderRadius:7,textDecoration:'none',fontSize:12,fontFamily:'Bangers,cursive',letterSpacing:0.5,
                        background:isActive?'rgba(0,255,65,0.08)':'transparent',
                        color:isActive?'var(--neon)':'var(--muted)',
                      })}>
                        <item.icon size={13}/>
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>
          {/* Footer */}
          <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)'}}>
            <button onClick={handleLogout} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--muted)',background:'none',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive',width:'100%',padding:0}}>
              <svg width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/></svg>
              SAIR
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className='main-area' style={{flex:1,overflow:'auto',display:'flex',flexDirection:'column'}}>
          {children??<Outlet/>}
        </div>

      </div>{/* end flex row */}

      {/* Bottom nav mobile */}
      <nav className='bottom-nav-mobile' style={{display:'none',position:'fixed',bottom:0,left:0,right:0,height:56,background:'var(--surface)',borderTop:'1px solid var(--border)',zIndex:50,alignItems:'stretch'}}>
        {MOBILE_NAV.filter(n=>!n.adminOnly||isAdmin).map(item=>(
          <NavLink key={item.to} to={item.to} style={({isActive})=>({
            flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,
            textDecoration:'none',
            color:isActive?'var(--neon)':'var(--muted)',
            borderTop:isActive?'2px solid var(--neon)':'2px solid transparent',
            fontSize:9,fontFamily:'Bangers,cursive',letterSpacing:0.3,
            background:isActive?'rgba(0,255,65,0.04)':'transparent',
            WebkitTapHighlightColor:'transparent',
          })}>
            <item.icon size={18}/>
            {item.label}
          </NavLink>
        ))}
      </nav>

    </div>
  )
}