import{useState,useEffect}from 'react'
import{BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid}from 'recharts'
import{BarChart2,TrendingUp,ShoppingCart,Truck,DollarSign,Users,Package,AlertTriangle,X}from 'lucide-react'
import{supabase}from '@/lib/supabase'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
const fmtN=(v:number)=>new Intl.NumberFormat('pt-BR').format(v||0)
const DAYS=['Dom','Seg','Ter','Qua','Qui','Sex','Sab']

export default function DashboardPage(){
  const[stats,setStats]=useState({totalToday:0,totalWeek:0,totalMonth:0,ordersToday:0,ordersWeek:0,pdvToday:0,deliveryToday:0,ticketMedio:0})
  const[weekData,setWeekData]=useState<{day:string,total:number,orders:number}[]>([])
  const[lowStock,setLowStock]=useState<{id:string,name:string,stock:number}[]>([])
  const[loading,setLoading]=useState(true)
  const[dismissedStock,setDismissedStock]=useState(false)

  useEffect(()=>{load()},[])

  async function load(){
    setLoading(true)
    const now=new Date()
    const todayStr=now.toISOString().split('T')[0]
    const weekAgo=new Date(now);weekAgo.setDate(weekAgo.getDate()-6)
    const weekStr=weekAgo.toISOString().split('T')[0]
    const monthAgo=new Date(now);monthAgo.setDate(1)
    const monthStr=monthAgo.toISOString().split('T')[0]

    const[{data:orders},{data:products}]=await Promise.all([
      supabase.from('orders').select('id,type,status,total,payment_method,created_at').gte('created_at',weekStr+'T00:00:00').in('status',['completed','delivered']),
      supabase.from('products').select('id,name,stock,has_sizes').eq('active',true).order('name')
    ])

    const allOrders=orders||[]
    const todayOrders=allOrders.filter(o=>o.created_at?.startsWith(todayStr))
    const monthOrders=allOrders.filter(o=>o.created_at>=monthStr+'T00:00:00')

    const totalToday=todayOrders.reduce((s,o)=>s+(o.total||0),0)
    const totalWeek=allOrders.reduce((s,o)=>s+(o.total||0),0)
    const totalMonth=monthOrders.reduce((s,o)=>s+(o.total||0),0)
    const ordersToday=todayOrders.length
    const ordersWeek=allOrders.length
    const pdvToday=todayOrders.filter(o=>o.type==='pdv').length
    const deliveryToday=todayOrders.filter(o=>o.type==='delivery').length
    const ticketMedio=ordersToday>0?totalToday/ordersToday:0

    // Week chart: last 7 days
    const chart=[]
    for(let i=6;i>=0;i--){
      const d=new Date(now);d.setDate(d.getDate()-i)
      const ds=d.toISOString().split('T')[0]
      const dayOrders=allOrders.filter(o=>o.created_at?.startsWith(ds))
      chart.push({day:DAYS[d.getDay()],total:dayOrders.reduce((s,o)=>s+(o.total||0),0),orders:dayOrders.length})
    }

    setStats({totalToday,totalWeek,totalMonth,ordersToday,ordersWeek,pdvToday,deliveryToday,ticketMedio})
    setWeekData(chart)
    const withSizes=(products||[]).filter((p:any)=>p.has_sizes)
    let variantStocks:Record<string,number>={}
    if(withSizes.length>0){
      const ids=withSizes.map((p:any)=>p.id)
      const{data:vars}=await supabase.from('product_variants').select('product_id,stock').in('product_id',ids)
      ;(vars||[]).forEach((v:any)=>{variantStocks[v.product_id]=(variantStocks[v.product_id]||0)+(v.stock||0)})
    }
    const lowOnes=(products||[]).filter((p:any)=>{
      const realStock=p.has_sizes?(variantStocks[p.id]||0):(p.stock||0)
      return realStock<=2
    }).slice(0,10)
    const lowWithReal=lowOnes.map((p:any)=>({...p,_realStock:p.has_sizes?(variantStocks[p.id]||0):p.stock}))
    setLowStock(lowWithReal)
    setLoading(false)
  }

  const card=(icon:any,label:string,value:string,sub?:string,color='#00ff41')=>(
    <div style={{background:'#161616',borderRadius:14,padding:'18px 20px',border:'1px solid #1e1e1e',flex:1,minWidth:160}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <div style={{width:36,height:36,borderRadius:10,background:'rgba(0,255,65,0.08)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {icon}
        </div>
        <span style={{fontSize:12,color:'#666',fontWeight:600,letterSpacing:0.5}}>{label}</span>
      </div>
      <p style={{fontSize:22,fontWeight:700,color:color,margin:0,fontFamily:'JetBrains Mono,monospace'}}>{value}</p>
      {sub&&<p style={{fontSize:11,color:'#555',margin:'4px 0 0'}}>{sub}</p>}
    </div>
  )

  return(
    <div style={{padding:'20px 16px',maxWidth:1000,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:24}}>
        <BarChart2 size={20} color='#00ff41'/>
        <h1 style={{fontFamily:'Bangers,cursive',fontSize:24,color:'#00ff41',letterSpacing:2,margin:0}}>DASHBOARD</h1>
      </div>

      {/* Alerta de estoque baixo */}
      {!dismissedStock&&lowStock.length>0&&(
        <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:14,padding:'14px 18px',marginBottom:20,position:'relative'}}>
          <button onClick={()=>setDismissedStock(true)} style={{position:'absolute',top:12,right:12,background:'transparent',border:'none',color:'#888',cursor:'pointer',padding:4}}>
            <X size={14}/>
          </button>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <AlertTriangle size={16} color='#f59e0b'/>
            <span style={{fontSize:13,fontWeight:700,color:'#f59e0b'}}>ESTOQUE BAIXO ({lowStock.length} produto{lowStock.length>1?'s':''})</span>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {lowStock.map(p=>(
              <div key={p.id} style={{background:'rgba(245,158,11,0.1)',borderRadius:8,padding:'4px 10px',fontSize:12}}>
                <span style={{color:'#e5e5e5'}}>{p.name}</span>
                <span style={{color:p.stock===0?'#ff5555':'#f59e0b',marginLeft:6,fontWeight:700}}>{(p.has_sizes?(p as any)._realStock??p.stock:p.stock)===0?'SEM ESTOQUE':'estq: '+p.stock}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading?<p style={{textAlign:'center',padding:40,color:'#555'}}>Carregando...</p>:(
        <>
          {/* KPIs de hoje */}
          <p style={{fontSize:11,color:'#555',fontWeight:700,letterSpacing:1,marginBottom:10}}>HOJE</p>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:20}}>
            {card(<DollarSign size={16} color='#00ff41'/>,'FATURAMENTO',fmt(stats.totalToday),stats.ordersToday+' vendas')}
            {card(<ShoppingCart size={16} color='#3b82f6'/>,'VENDAS PDV',fmtN(stats.pdvToday)+' vendas',undefined,'#3b82f6')}
            {card(<Truck size={16} color='#a855f7'/>,'DELIVERIES',fmtN(stats.deliveryToday)+' pedidos',undefined,'#a855f7')}
            {card(<TrendingUp size={16} color='#f59e0b'/>,'TICKET MÉDIO',fmt(stats.ticketMedio),undefined,'#f59e0b')}
          </div>

          {/* KPIs da semana e mês */}
          <p style={{fontSize:11,color:'#555',fontWeight:700,letterSpacing:1,marginBottom:10}}>SEMANA / MÊS</p>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:24}}>
            {card(<BarChart2 size={16} color='#00ff41'/>,'SEMANA',fmt(stats.totalWeek),stats.ordersWeek+' pedidos')}
            {card(<TrendingUp size={16} color='#00ff41'/>,'MÊS',fmt(stats.totalMonth))}
          </div>

          {/* Gráfico semanal */}
          <div style={{background:'#161616',borderRadius:14,padding:'20px',border:'1px solid #1e1e1e',marginBottom:20}}>
            <p style={{fontSize:16,fontWeight:700,color:'#fff',margin:'0 0 16px',fontFamily:'Bangers,cursive',letterSpacing:1}}>VENDAS — ÚLTIMOS 7 DIAS</p>
            <ResponsiveContainer width='100%' height={200}>
              <BarChart data={weekData} barSize={32}>
                <CartesianGrid strokeDasharray='3 3' stroke='#1e1e1e'/>
                <XAxis dataKey='day' tick={{fill:'#666',fontSize:12}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#666',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?(v/1000).toFixed(0)+'k':v}/>
                <Tooltip
                  contentStyle={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:8,fontSize:12}}
                  labelStyle={{color:'#aaa'}}
                  formatter={(v:any)=>[fmt(v),'Total']}
                />
                <Bar dataKey='total' fill='#00ff41' radius={[4,4,0,0]} opacity={0.9}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Estoque baixo expandido */}
          {lowStock.length>0&&(
            <div style={{background:'#161616',borderRadius:14,padding:'18px 20px',border:'1px solid #1e1e1e'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                <Package size={16} color='#f59e0b'/>
                <p style={{fontFamily:'Bangers,cursive',fontSize:16,color:'#f59e0b',letterSpacing:1,margin:0}}>PRODUTOS COM ESTOQUE BAIXO</p>
              </div>
              {lowStock.map(p=>(
                <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #1e1e1e'}}>
                  <span style={{fontSize:13,color:'#ccc'}}>{p.name}</span>
                  <span style={{
                    fontSize:13,fontWeight:700,fontFamily:'monospace',
                    color:p.stock===0?'#ff5555':p.stock===1?'#f97316':'#f59e0b',
                    background:p.stock===0?'rgba(255,51,51,0.1)':'rgba(245,158,11,0.1)',
                    padding:'2px 10px',borderRadius:6
                  }}>{p.stock===0?'SEM ESTOQUE':p.stock+' restante'+(p.stock>1?'s':'')}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}