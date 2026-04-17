import{useState,useEffect}from 'react'
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

export default function App(){
  const[session,setSession]=useState<any>(null)
  const[profile,setProfile]=useState<any>(null)
  const[loading,setLoading]=useState(true)

  useEffect(()=>{
    supabase.auth.getSession().then(async({data})=>{
      setSession(data.session)
      if(data.session)await loadProfile(data.session.user.id)
      setLoading(false)
    })
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(_e,s)=>{
      setSession(s)
      if(s)await loadProfile(s.user.id)
      else setProfile(null)
    })
    return()=>subscription.unsubscribe()
  },[])

  async function loadProfile(userId:string){
    try{
      const{data}=await supabase.from('profiles').select('*,sellers(id,name,commission_pct,role)').eq('id',userId).maybeSingle()
      if(data){
        // role comes from sellers table if linked, else admin
        const sellerRole=data.sellers?.role||data.role
        setProfile({...data,role:sellerRole||'admin'})
      } else {
        setProfile({role:'admin'})
      }
    }catch{setProfile({role:'admin'})}
  }

  if(window.location.pathname==='/menu'||window.location.pathname.startsWith('/menu/')){
    return<Routes><Route path='/menu' element={<PublicMenuPage/>}/><Route path='/menu/*' element={<PublicMenuPage/>}/></Routes>
  }

  if(loading) return(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{fontSize:56,animation:'neon-pulse 1s ease-in-out infinite'}}>⚡</div>
      <p style={{fontFamily:'Bangers,cursive',fontSize:22,color:'var(--neon)',letterSpacing:3}}>KURMO PDV</p>
    </div>
  )

  if(!session) return<LoginPage onLogin={()=>supabase.auth.getSession().then(({data})=>setSession(data.session))}/>

  const isAdmin=!profile?.role||profile?.role==='admin'
  const sellerName=profile?.sellers?.name||profile?.name

  return(
    <Routes>
      <Route path='/menu' element={<PublicMenuPage/>}/>
      <Route path='/menu/*' element={<PublicMenuPage/>}/>
      <Route path='/' element={<Layout userRole={profile?.role} sellerName={sellerName}/>}>
        <Route index element={<Navigate to='/pdv' replace/>}/>
        <Route path='pdv' element={<PDVPage sellerId={profile?.seller_id} sellerName={sellerName}/>}/>
        <Route path='delivery' element={<DeliveryPage/>}/>
        <Route path='historico' element={<HistoryPage sellerId={isAdmin?null:profile?.seller_id}/>}/>
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
        <Route path='*' element={<Navigate to='/pdv' replace/>}/>
      </Route>
    </Routes>
  )
}