import{useState,useEffect}from 'react'
import{BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,PieChart,Pie,Cell,LineChart,Line}from 'recharts'
import{TrendingUp,ShoppingCart,DollarSign,Package,Truck,ShoppingBag}from 'lucide-react'
import{supabase}from '@/lib/supabase'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const COLORS=['#00ff41','#06b6d4','#7c3aed','#f59e0b','#ef4444','#10b981']

export default function DashboardPage(){
  const[period,setPeriod]=useState<'7d'|'30d'|'90d'>('30d')
  const[loading,setLoading]=useState(true)
  const[stats,setStats]=useState({revenue:0,orders:0,avgTicket:0,products:0,deliveryRev:0,pdvRev:0})
  const[dailyData,setDailyData]=useState<any[]>([])
  const[payData,setPayData]=useState<any[]>([])
  const[topProducts,setTopProducts]=useState<any[]>([])

  useEffect(()=>{loadData()},[period])

  async function loadData(){
    setLoading(true)
    const days=period==='7d'?7:period==='30d'?30:90
    const from=new Date();from.setDate(from.getDate()-days)
    const fromStr=from.toISOString()

    // Load all completed orders in period
    const{data:orders}=await supabase.from('orders')
      .select('id,total,type,created_at,status')
      .in('status',['completed','delivered'])
      .gte('created_at',fromStr)
      .order('created_at',{ascending:true})

    const{data:payments}=await supabase.from('order_payments')
      .select('method,amount,order_id')

    const{data:items}=await supabase.from('order_items')
      .select('product_name,quantity,total_price,order_id')

    const{data:products}=await supabase.from('products').select('id').eq('active',true)

    const ords=orders||[]
    const revenue=ords.reduce((s,o)=>s+Number(o.total),0)
    const pdvRev=ords.filter(o=>o.type==='pdv').reduce((s,o)=>s+Number(o.total),0)
    const delivRev=ords.filter(o=>o.type==='delivery').reduce((s,o)=>s+Number(o.total),0)

    setStats({revenue,orders:ords.length,avgTicket:ords.length?revenue/ords.length:0,products:(products||[]).length,deliveryRev:delivRev,pdvRev})

    // Daily data - group by date
    const byDate:Record<string,{date:string;vendas:number;pedidos:number}>={}
    ords.forEach(o=>{
      const d=new Date(o.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})
      if(!byDate[d])byDate[d]={date:d,vendas:0,pedidos:0}
      byDate[d].vendas+=Number(o.total)
      byDate[d].pedidos++
    })
    setDailyData(Object.values(byDate).slice(-14))

    // Payment methods
    const ordIds=new Set(ords.map(o=>o.id))
    const payMap:Record<string,number>={}
    ;(payments||[]).filter(p=>ordIds.has(p.order_id)).forEach(p=>{
      const label=p.method==='pix'?'PIX':p.method==='dinheiro'?'Dinheiro':p.method==='debito'?'Debito':'Credito'
      payMap[label]=(payMap[label]||0)+Number(p.amount)
    })
    setPayData(Object.entries(payMap).map(([name,value])=>({name,value})))

    // Top products
    const prodMap:Record<string,{name:string;qty:number;revenue:number}>={}
    ;(items||[]).forEach(i=>{
      if(!prodMap[i.product_name])prodMap[i.product_name]={name:i.product_name,qty:0,revenue:0}
      prodMap[i.product_name].qty+=i.quantity
      prodMap[i.product_name].revenue+=Number(i.total_price)
    })
    setTopProducts(Object.values(prodMap).sort((a,b)=>b.revenue-a.revenue).slice(0,5))

    setLoading(false)
  }

  const KPI=({icon:Icon,label,value,sub,color}:{icon:any;label:string;value:string;sub?:string;color:string})=>(
    <div className='card' style={{padding:'18px 20px',display:'flex',alignItems:'flex-start',gap:14}}>
      <div style={{width:44,height:44,borderRadius:12,background:color+'20',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <Icon size={20} color={color}/>
      </div>
      <div>
        <p style={{fontSize:22,fontWeight:700,color:'var(--white)',fontFamily:'JetBrains Mono,monospace',lineHeight:1}}>{value}</p>
        <p style={{fontSize:12,color:'var(--muted)',marginTop:3}}>{label}</p>
        {sub&&<p style={{fontSize:11,color:'var(--muted)',opacity:0.7,marginTop:2}}>{sub}</p>}
      </div>
    </div>
  )

  const tooltipStyle={background:'#111811',border:'1px solid var(--border)',borderRadius:8,color:'var(--white)',fontSize:12}

  return(
    <div style={{height:'100%',overflowY:'auto',padding:'20px',background:'var(--bg)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontFamily:'Bangers,cursive',fontSize:28,color:'var(--neon)',letterSpacing:2}}>DASHBOARD</h1>
        <div style={{display:'flex',gap:6}}>
          {([['7d','7 dias'],['30d','30 dias'],['90d','90 dias']] as const).map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)} style={{padding:'6px 12px',borderRadius:8,border:period===v?'1px solid var(--neon)':'1px solid var(--border)',background:period===v?'var(--neon-glow)':'transparent',color:period===v?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading?<div style={{textAlign:'center',padding:64,color:'var(--muted)'}}>Carregando...</div>:(
        <>
          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14,marginBottom:24}}>
            <KPI icon={DollarSign} label='Faturamento total' value={fmt(stats.revenue)} sub={`PDV: ${fmt(stats.pdvRev)}`} color='#00ff41'/>
            <KPI icon={ShoppingCart} label='Pedidos concluidos' value={String(stats.orders)} sub={`Ticket medio: ${fmt(stats.avgTicket)}`} color='#06b6d4'/>
            <KPI icon={Truck} label='Receita Delivery' value={fmt(stats.deliveryRev)} color='#f59e0b'/>
            <KPI icon={Package} label='Produtos ativos' value={String(stats.products)} color='#7c3aed'/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16}}>
            {/* Daily chart */}
            <div className='card' style={{padding:'18px 20px'}}>
              <p style={{fontSize:14,fontWeight:600,color:'var(--white)',marginBottom:16}}>Vendas por dia</p>
              {dailyData.length===0
                ?<div style={{textAlign:'center',padding:40,color:'var(--muted)',fontSize:13}}>Sem vendas no periodo</div>
                :<ResponsiveContainer width='100%' height={200}>
                  <BarChart data={dailyData} margin={{top:0,right:0,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray='3 3' stroke='rgba(255,255,255,0.05)'/>
                    <XAxis dataKey='date' tick={{fill:'#64748b',fontSize:11}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fill:'#64748b',fontSize:11}} tickLine={false} axisLine={false} tickFormatter={v=>v>=1000?(v/1000).toFixed(1)+'k':v}/>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v:any)=>[fmt(Number(v)),'Vendas']}/>
                    <Bar dataKey='vendas' fill='#00ff41' radius={[4,4,0,0]} maxBarSize={40}/>
                  </BarChart>
                </ResponsiveContainer>
              }
            </div>
            {/* Payment pie */}
            <div className='card' style={{padding:'18px 20px'}}>
              <p style={{fontSize:14,fontWeight:600,color:'var(--white)',marginBottom:16}}>Formas de pagamento</p>
              {payData.length===0
                ?<div style={{textAlign:'center',padding:40,color:'var(--muted)',fontSize:13}}>Sem dados</div>
                :<>
                  <ResponsiveContainer width='100%' height={140}>
                    <PieChart>
                      <Pie data={payData} cx='50%' cy='50%' innerRadius={40} outerRadius={65} dataKey='value' strokeWidth={0}>
                        {payData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v:any)=>[fmt(Number(v))]}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    {payData.map((p,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:12}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:2,background:COLORS[i%COLORS.length]}}/><span style={{color:'var(--muted)'}}>{p.name}</span></div>
                        <span style={{color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              }
            </div>
          </div>

          {/* Top products */}
          {topProducts.length>0&&(
            <div className='card' style={{padding:'18px 20px'}}>
              <p style={{fontSize:14,fontWeight:600,color:'var(--white)',marginBottom:14}}>Produtos mais vendidos</p>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {topProducts.map((p,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:12}}>
                    <span style={{width:22,height:22,borderRadius:6,background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'var(--neon)',flexShrink:0}}>{i+1}</span>
                    <span style={{flex:1,fontSize:13,color:'var(--white)'}}>{p.name}</span>
                    <span style={{fontSize:12,color:'var(--muted)'}}>{p.qty} un.</span>
                    <span style={{fontSize:13,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',minWidth:90,textAlign:'right'}}>{fmt(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}