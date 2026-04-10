import{useState,useEffect}from 'react'
import{BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,PieChart,Pie,Cell}from 'recharts'
import{TrendingUp,ShoppingCart,DollarSign,Package,Truck}from 'lucide-react'
import{supabase}from '@/lib/supabase'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const PAY_COLORS:Record<string,string>={PIX:'#06b6d4',Dinheiro:'#10b981',Debito:'#7c3aed',Credito:'#f59e0b'}

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

    const{data:orders}=await supabase.from('orders').select('id,total,type,created_at').in('status',['completed','delivered']).gte('created_at',fromStr).order('created_at',{ascending:true})
    const ords=orders||[]
    const ordIds=ords.map(o=>o.id)

    let payments:any[]=[],items:any[]=[]
    if(ordIds.length>0){
      const[pRes,iRes]=await Promise.all([
        supabase.from('order_payments').select('method,amount,order_id').in('order_id',ordIds),
        supabase.from('order_items').select('product_name,quantity,total_price,order_id').in('order_id',ordIds)
      ])
      payments=pRes.data||[];items=iRes.data||[]
    }

    const{data:products}=await supabase.from('products').select('id').eq('active',true)

    const revenue=ords.reduce((s,o)=>s+Number(o.total),0)
    const pdvRev=ords.filter(o=>o.type==='pdv').reduce((s,o)=>s+Number(o.total),0)
    const delivRev=ords.filter(o=>o.type==='delivery').reduce((s,o)=>s+Number(o.total),0)
    setStats({revenue,orders:ords.length,avgTicket:ords.length?revenue/ords.length:0,products:(products||[]).length,deliveryRev:delivRev,pdvRev})

    // Daily
    const byDate:Record<string,any>={}
    ords.forEach(o=>{
      const d=new Date(o.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})
      if(!byDate[d])byDate[d]={date:d,vendas:0,pedidos:0}
      byDate[d].vendas+=Number(o.total);byDate[d].pedidos++
    })
    setDailyData(Object.values(byDate).slice(-14))

    // Payment breakdown by method
    const ordIdSet=new Set(ordIds)
    const payMap:Record<string,number>={PIX:0,Dinheiro:0,Debito:0,Credito:0}
    payments.filter(p=>ordIdSet.has(p.order_id)).forEach(p=>{
      const label=p.method==='pix'?'PIX':p.method==='dinheiro'?'Dinheiro':p.method==='debito'?'Debito':'Credito'
      payMap[label]=(payMap[label]||0)+Number(p.amount)
    })
    setPayData(Object.entries(payMap).filter(([,v])=>v>0).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value))

    // Top products
    const prodMap:Record<string,any>={}
    items.forEach(i=>{
      if(!prodMap[i.product_name])prodMap[i.product_name]={name:i.product_name,qty:0,revenue:0}
      prodMap[i.product_name].qty+=i.quantity;prodMap[i.product_name].revenue+=Number(i.total_price)
    })
    setTopProducts(Object.values(prodMap).sort((a,b)=>b.revenue-a.revenue).slice(0,5))
    setLoading(false)
  }

  const tip={background:'#111811',border:'1px solid var(--border)',borderRadius:8,color:'var(--white)',fontSize:12}

  return(
    <div style={{height:'100%',overflowY:'auto',padding:'20px',background:'var(--bg)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontFamily:'Bangers,cursive',fontSize:28,color:'var(--neon)',letterSpacing:2}}>DASHBOARD</h1>
        <div style={{display:'flex',gap:6}}>
          {([['7d','7 dias'],['30d','30 dias'],['90d','90 dias']] as const).map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)} style={{padding:'6px 12px',borderRadius:8,border:period===v?'1px solid var(--neon)':'1px solid var(--border)',background:period===v?'var(--neon-glow)':'transparent',color:period===v?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>{l}</button>
          ))}
        </div>
      </div>

      {loading?<div style={{textAlign:'center',padding:64,color:'var(--muted)'}}>Carregando...</div>:(
        <>
          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:14,marginBottom:24}}>
            {[
              {icon:DollarSign,label:'Faturamento total',value:fmt(stats.revenue),sub:'PDV: '+fmt(stats.pdvRev),color:'#00ff41'},
              {icon:ShoppingCart,label:'Pedidos concluidos',value:String(stats.orders),sub:'Ticket: '+fmt(stats.avgTicket),color:'#06b6d4'},
              {icon:Truck,label:'Receita Delivery',value:fmt(stats.deliveryRev),sub:'',color:'#f59e0b'},
              {icon:Package,label:'Produtos ativos',value:String(stats.products),sub:'',color:'#7c3aed'},
            ].map((k,i)=>(
              <div key={i} className='card' style={{padding:'18px 20px',display:'flex',alignItems:'flex-start',gap:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:k.color+'20',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <k.icon size={20} color={k.color}/>
                </div>
                <div>
                  <p style={{fontSize:22,fontWeight:700,color:'var(--white)',fontFamily:'JetBrains Mono,monospace',lineHeight:1}}>{k.value}</p>
                  <p style={{fontSize:12,color:'var(--muted)',marginTop:3}}>{k.label}</p>
                  {k.sub&&<p style={{fontSize:11,color:'var(--muted)',opacity:0.7,marginTop:2}}>{k.sub}</p>}
                </div>
              </div>
            ))}
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
                    <YAxis tick={{fill:'#64748b',fontSize:11}} tickLine={false} axisLine={false} tickFormatter={v=>v>=1000?(v/1000).toFixed(1)+'k':String(v)}/>
                    <Tooltip contentStyle={tip} formatter={(v:any)=>[fmt(Number(v)),'Vendas']}/>
                    <Bar dataKey='vendas' fill='#00ff41' radius={[4,4,0,0]} maxBarSize={40}/>
                  </BarChart>
                </ResponsiveContainer>
              }
            </div>
            {/* Payment breakdown */}
            <div className='card' style={{padding:'18px 20px'}}>
              <p style={{fontSize:14,fontWeight:600,color:'var(--white)',marginBottom:14}}>Formas de pagamento</p>
              {payData.length===0
                ?<div style={{textAlign:'center',padding:40,color:'var(--muted)',fontSize:13}}>Sem dados</div>
                :<>
                  <ResponsiveContainer width='100%' height={120}>
                    <PieChart>
                      <Pie data={payData} cx='50%' cy='50%' innerRadius={30} outerRadius={55} dataKey='value' strokeWidth={0}>
                        {payData.map((p:any,i:number)=><Cell key={i} fill={PAY_COLORS[p.name]||'#888'}/>)}
                      </Pie>
                      <Tooltip contentStyle={tip} formatter={(v:any)=>[fmt(Number(v))]}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
                    {payData.map((p:any,i:number)=>{
                      const total=payData.reduce((s:number,x:any)=>s+x.value,0)
                      const pct=total>0?((p.value/total)*100).toFixed(0):'0'
                      return(
                        <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:12}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:2,background:PAY_COLORS[p.name]||'#888'}}/><span style={{color:'var(--muted)'}}>{p.name}</span></div>
                          <div style={{display:'flex',gap:8,alignItems:'center'}}>
                            <span style={{fontSize:10,color:'var(--muted)'}}>{pct}%</span>
                            <span style={{color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.value)}</span>
                          </div>
                        </div>
                      )
                    })}
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