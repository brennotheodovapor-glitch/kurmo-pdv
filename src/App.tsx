import SchedulePage from '@/pages/SchedulePage'
import AuditLogPage from '@/pages/AuditLogPage'
import{useState,useEffect,useRef}from 'react'
import{setupAlarmListener,playAlarmSound,broadcastAlarm}from '@/lib/alarm'
import{Routes,Route,Navigate}from 'react-router-dom'
import{supabase}from '@/lib/supabase'
import Layout from '@/components/shared/Layout'
import LoginPage from '@/pages/LoginPage'
import PDVPage from '@/pages/PDVPage'
import DeliveryPage from '@/pages/DeliveryPage'
import HistoryPage from '@/pages/HistoryPage'
import ProductsPage from '@/pages/ProductsPage'
import CategoriesPage from '@/pages/CategoriesPage'
import MenuPage from '@/pages/MenuPage'
import DashboardPage from '@/pages/DashboardPage'
import CouponsPage from '@/pages/CouponsPage'
import SettingsPage from '@/pages/SettingsPage'
import CustomersPage from '@/pages/CustomersPage'
import ReportsPage from '@/pages/ReportsPage'
import SellersPage from '@/pages/SellersPage'
import CommissionsPage from '@/pages/CommissionsPage'
import PublicMenuPage from '@/pages/PublicMenuPage'
import DeliveryZonesPage from '@/pages/DeliveryZonesPage'
import CashRegisterPage from '@/pages/CashRegisterPage'
import FiadoPage from '@/pages/FiadoPage'

export default function App(){
  const[session,setSession]=useState<any>(null)
  const[profile,setProfile]=useState<any>({role:'admin'})
  const[loading,setLoading]=useState(true)
  const[pendingCount,setPendingCount]=useState(0)
  const prevPendingRef=useRef(-1)
  const soundEnabledRef=useRef(true)

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      setSession(data.session)
      setLoading(false)
      if(data.session)loadProfile(data.session.user)
    })
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{
      setSession(s);setLoading(false)
      if(s)loadProfile(s.user)
      else setProfile({role:'admin'})
    })
    return()=>subscription.unsubscribe()
  },[])

  // Listen for alarm from OTHER tabs
  useEffect(()=>{
    if(!session)return
    return setupAlarmListener(()=>{
      if(soundEnabledRef.current)playAlarmSound()
    })
  },[session])

  // Poll pending delivery orders every 8s from ANY tab
  useEffect(()=>{
    if(!session)return
    const poll=async()=>{
      try{
        const{data}=await supabase.from('orders').select('id').eq('type','delivery').eq('status','pending')
        const count=(data||[]).length
        setPendingCount(count)
        if(count>prevPendingRef.current&&prevPendingRef.current>=0&&soundEnabledRef.current){
          playAlarmSound()
          broadcastAlarm()
        }
        prevPendingRef.current=count
      }catch{}
    }
    poll()
    const interval=setInterval(poll,8000)
    return()=>clearInterval(interval)
  },[session])

  async function loadProfile(user:any){
    const timer=setTimeout(()=>setProfile({role:'admin'}),5000)
    try{
      const{data:seller}=await supabase.from('sellers').select('id,name,role,commission_pct,email').eq('email',user.email||'').maybeSingle()
      if(seller){clearTimeout(timer);setProfile({id:user.id,seller_id:seller.id,name:seller.name,role:seller.role||'seller',sellers:seller});return}
      const{data}=await supabase.from('profiles').select('*,sellers(id,name,commission_pct,role,email)').eq('id',user.id).maybeSingle()
      clearTimeout(timer)
      if(data&&data.sellers)setProfile({...data,role:data.sellers.role||data.role||'admin',seller_id:data.sellers.id})
      else if(data)setProfile({...data,role:data.role||'admin'})
      else setProfile({role:'admin',id:user.id})
    }catch{clearTimeout(timer);setProfile({role:'admin'})}
  }

  if(window.location.pathname==='/menu'||window.location.pathname.startsWith('/menu/')){
    return<Routes><Route path='/menu' element={<PublicMenuPage/>}/><Route path='/menu/*' element={<PublicMenuPage/>}/></Routes>
  }
  if(loading)return(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{fontSize:56,animation:'neon-pulse 1s ease-in-out infinite'}}>⚡</div>
      <p style={{fontFamily:'Bangers,cursive',fontSize:22,color:'var(--neon)',letterSpacing:3}}>KURMO PDV</p>
    </div>
  )
  if(!session)return<LoginPage onLogin={()=>supabase.auth.getSession().then(({data})=>setSession(data.session))}/>

  const isAdmin=profile?.role==='admin'||!profile?.role
  const sellerName=profile?.sellers?.name||profile?.name
  const sellerId=profile?.seller_id||null

  return(
    <Routes>
      <Route path='/menu' element={<PublicMenuPage/>}/>
      <Route path='/menu/*' element={<PublicMenuPage/>}/>
      <Route path='/' element={<Layout userRole={profile?.role} sellerName={sellerName} pendingOrders={pendingCount} soundEnabledRef={soundEnabledRef}/>}>
        <Route index element={<Navigate to='/pdv' replace/>}/>
        <Route path='pdv' element={<PDVPage sellerId={sellerId} sellerName={sellerName}/>}/>
        <Route path='delivery' element={<DeliveryPage/>}/>
        <Route path='historico' element={<HistoryPage sellerId={isAdmin?null:sellerId}/>}/>
        <Route path='fiado' element={<FiadoPage/>}/>
        {!isAdmin&&<Route path='comissoes' element={<CommissionsPage sellerId={sellerId}/>}/>}
        {isAdmin&&<Route path='dashboard' element={<DashboardPage/>}/>}
        {isAdmin&&<Route path='caixa' element={<CashRegisterPage/>}/>}
        {isAdmin&&<Route path='cardapio' element={<MenuPage/>}/>}
        {isAdmin&&<Route path='bairros' element={<DeliveryZonesPage/>}/>}
        {isAdmin&&<Route path='relatorios' element={<ReportsPage/>}/>}
        {isAdmin&&<Route path='comissoes' element={<CommissionsPage/>}/>}
        {isAdmin&&<Route path='clientes' element={<CustomersPage/>}/>}
        {isAdmin&&<Route path='categorias' element={<CategoriesPage/>}/>}
        {isAdmin&&<Route path='produtos' element={<ProductsPage/>}/>}
        {isAdmin&&<Route path='vendedores' element={<SellersPage/>}/>}
        {isAdmin&&<Route path='cupons' element={<CouponsPage/>}/>}
        {isAdmin&&<Route path='configuracoes' element={<SettingsPage/>}/>}
        {isAdmin&&<Route path='agenda' element={<SchedulePage/>}/>}
        {isAdmin&&<Route path='auditoria' element={<AuditLogPage/>}/>}
        <Route path='*' element={<Navigate to='/pdv' replace/>}/>
      </Route>
    </Routes>
  )
}