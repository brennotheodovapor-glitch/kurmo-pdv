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
      if(data.session){setProfile({role:'admin'});loadProfile(data.session.user.id)}
      setLoading(false)
    })
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(_e,s)=>{
      setSession(s)
      if(s){setProfile({role:'admin'});loadProfile(s.user.id)}
      else setProfile(null)
    })
    return()=>subscription.unsubscribe()
  },[])

  async function loadProfile(userId:string){
    try{
      const{data}=await supabase.from('profiles').select('*,sellers(name,commission_pct)').eq('id',userId).maybeSingle()
      if(data)setProfile(data)
      else setProfile({role:'admin'})
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

  return(
    <Routes>
      <Route path='/menu' element={<PublicMenuPage/>}/>
      <Route path='/menu/*' element={<PublicMenuPage/>}/>
      <Route path='/' element={<Layout/>}>
        <Route index element={<Navigate to='/pdv' replace/>}/>
        <Route path='pdv' element={<PDVPage sellerId={profile?.seller_id} sellerName={profile?.sellers?.name}/>}/>
        <Route path='delivery' element={<DeliveryPage/>}/>
        <Route path='historico' element={<HistoryPage sellerId={isAdmin?null:profile?.seller_id}/>}/>
        <Route path='dashboard' element={<DashboardPage/>}/>
        <Route path='caixa' element={<CashRegisterPage/>}/>
        <Route path='cardapio' element={<MenuPage/>}/>
        <Route path='bairros' element={<DeliveryZonesPage/>}/>
        <Route path='relatorios' element={<ReportsPage/>}/>
        <Route path='comissoes' element={<CommissionsPage/>}/>
        <Route path='clientes' element={<CustomersPage/>}/>
        {isAdmin&&<>
          <Route path='categorias' element={<CategoriesPage/>}/>
          <Route path='produtos' element={<ProductsPage/>}/>
          <Route path='vendedores' element={<SellersPage/>}/>
          <Route path='cupons' element={<CouponsPage/>}/>
          <Route path='configuracoes' element={<SettingsPage/>}/>
        </>}
        <Route path='*' element={<Navigate to='/pdv' replace/>}/>
      </Route>
    </Routes>
  )
}