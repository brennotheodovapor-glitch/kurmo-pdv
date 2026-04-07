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
import DashboardPage from '@/pages/DashboardPage'
import SettingsPage from '@/pages/SettingsPage'
import CustomersPage from '@/pages/CustomersPage'
import ReportsPage from '@/pages/ReportsPage'
import SellersPage from '@/pages/SellersPage'
import CommissionsPage from '@/pages/CommissionsPage'
import MenuPage from '@/pages/MenuPage'

export default function App(){
  const[session,setSession]=useState<any>(null)
  const[userRole,setUserRole]=useState<string>('seller')
  const[loading,setLoading]=useState(true)

  useEffect(()=>{
    supabase.auth.getSession().then(async({data})=>{
      setSession(data.session)
      if(data.session){await loadRole(data.session.user.id)}
      setLoading(false)
    })
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(_e,s)=>{
      setSession(s)
      if(s){await loadRole(s.user.id)}else{setUserRole('seller')}
    })
    return()=>subscription.unsubscribe()
  },[])

  async function loadRole(userId:string){
    const{data}=await supabase.from('user_roles').select('role').eq('user_id',userId).single()
    setUserRole(data?.role||'admin')
  }

  if(loading)return(
    <div style={{minHeight:'100dvh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{fontSize:56,animation:'neon-pulse 1s ease-in-out infinite'}}>⚡</div>
      <p style={{fontFamily:'Bangers,cursive',fontSize:22,color:'var(--neon)',letterSpacing:3}}>KURMO PDV</p>
    </div>
  )

  if(!session)return<LoginPage onLogin={()=>supabase.auth.getSession().then(({data})=>setSession(data.session))}/>

  const isSeller=userRole==='seller'

  return(
    <Routes>
      <Route path="/" element={<Layout session={session} userRole={userRole}/>}>
        <Route index element={<Navigate to="/pdv" replace/>}/>
        <Route path="pdv" element={<PDVPage sellerId={null} userRole={userRole}/>}/>
        <Route path="delivery" element={<DeliveryPage/>}/>
        <Route path="historico" element={<HistoryPage userRole={userRole}/>}/>
        {!isSeller&&<>
          <Route path="dashboard" element={<DashboardPage/>}/>
          <Route path="relatorios" element={<ReportsPage/>}/>
          <Route path="vendedores" element={<SellersPage/>}/>
          <Route path="comissoes" element={<CommissionsPage/>}/>
          <Route path="produtos" element={<ProductsPage/>}/>
          <Route path="categorias" element={<CategoriesPage/>}/>
          <Route path="cardapio" element={<MenuPage/>}/>
          <Route path="clientes" element={<CustomersPage/>}/>
          <Route path="configuracoes" element={<SettingsPage/>}/>
        </>}
        <Route path="*" element={<Navigate to="/pdv" replace/>}/>
      </Route>
    </Routes>
  )
}