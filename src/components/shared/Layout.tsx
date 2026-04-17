import{NavLink,useLocation,Outlet}from 'react-router-dom'
import{ShoppingCart,Truck,History,BarChart3,Settings,DollarSign,MapPin,QrCode,ChevronDown,ChevronRight,Package,Tag,Users,Percent,BarChart2,UserCheck,LayoutDashboard}from 'lucide-react'
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

export default function Layout({children,userRole,sellerName}:{children?:React.ReactNode;userRole?:string;sellerName?:string}){
  const location=useLocation()
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
      {item.label}
    </NavLink>
  )

  return(
    <div style={{height:'100vh',display:'flex',overflow:'hidden',background:'var(--bg)'}}>
      {/* Sidebar */}
      <div style={{width:190,flexShrink:0,background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
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
        <nav style={{flex:1,overflowY:'auto',padding:'8px 8px',display:'flex',flexDirection:'column',gap:2}}>
          {MAIN_NAV.filter(n=>!n.adminOnly||isAdmin).map(nl)}
          {/* Config section */}
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
                    transition:'all 0.15s',
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
        </nav>
        {/* Footer */}
        <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)'}}>
          <NavLink to='/sair' style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--muted)',textDecoration:'none',fontFamily:'Bangers,cursive'}}>
            <svg width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/></svg>
            SAIR
          </NavLink>
        </div>
      </div>
      {/* Main content */}
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>  {children??<Outlet/>}</div>
    </div>
  )
}