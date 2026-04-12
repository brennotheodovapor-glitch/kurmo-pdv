import{useState,useEffect}from 'react'
import{supabase}from '@/lib/supabase'
import{BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,PieChart,Pie,Cell,Legend}from 'recharts'
import{TrendingUp,ShoppingCart,Truck,DollarSign,Calendar,RefreshCw}from 'lucide-react'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const COLORS=['#00ff41','#06b6d4','#7c3aed','#f59e0b','#10b981']

export default function DashboardPage(){
  const[period,setPeriod]=useState<'today'|'week'|'month'|'custom'>('today')
  const[dateFrom,setDateFrom]=useState(new Date().toISOString().slice(0,10))
  const[dateTo,setDateTo]=useState(new Date().toISOString().slice(0,10))
  const[loading,setLoading]=useState(true)
  const[orders,setOrders]=useState<any[]>([])
  const[lastRefresh,setLastRefresh]=useState(new Date())

  useEffect(()=>{load()},[period,dateFrom,dateTo])

  function getRange(){
    const now=new Date()
    const toStr=(d:Date)=>d.toISOString().slice(0,10)
    if(period==='today'){const t=toStr(now);return{from:t,to:t}}
    if(period==='week'){
      const mon=new Date(now);mon.setDate(now.getDate()-now.getDay()+1)
      return{from:toStr(mon),to:toStr(now)}
    }
    if(period==='month'){
      const first=new Date(now.getFullYear(),now.getMonth(),1)
      return{from:toStr(first),to:toStr(now)}
    }
    return{from:dateFrom,to:dateTo}
  }

  async function load(){
    setLoading(true)
    const{from,to}=getRange()
    const fromISO=from+'T00:00:00'
    const toISO=to+'T23:59:59'
    const{data}=await supabase.from('orders')
      .select('*')
      .gte('created_at',fromISO)
      .lte('created_at',toISO)
      .not('status','eq','cancelled')
      .order('created_at',{ascending:true})
    setOrders(data||[])
    setLastRefresh(new Date())
    setLoading(false)
  }

  // KPIs
  const totalRev=orders.reduce((s,o)=>s+Number(o.total),0)
  const pdvOrders=orders.filter(o=>o.type==='pdv')
  const delOrders=orders.filter(o=>o.type==='delivery')
  const avgTicket=orders.length>0?totalRev/orders.length:0

  // Daily chart
  const dayMap:Record<string,number>={}
  orders.forEach(o=>{
    const day=o.created_at.slice(0,10)
    dayMap[day]=(dayMap[day]||0)+Number(o.total)
  })
  const chartData=Object.entries(dayMap).map(([date,total])=>({
    date:new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),
    total:Number(total.toFixed(2))
  }))

  // Payment pie
  const payMap:Record<string,number>={}
  orders.forEach(o=>{
    // Get payment methods from order data
    const method=o.payment_method||'pix'
    payMap[method]=(payMap[method]||0)+Number(o.total)
  })
  // Try from order_payments if empty
  const pieData=Object.entries(payMap).map(([name,value])=>({
    name:name==='pix'?'PIX':name==='dinheiro'?'Dinheiro':name==='debito'?'Débito':name==='credito'?'Crédito':name,
    value:Number(value.toFixed(2))
  }))

  // PDV vs Delivery
  const typeData=[
    {name:'PDV',value:pdvOrders.reduce((s,o)=>s+Number(o.total),0)},
    {name:'Delivery',value:delOrders.reduce((s,o)=>s+Number(o.total),0)},
  ].filter(d=>d.value>0)

  const PERIODS=[{k:'today',l:'Hoje'},{k:'week',l:'Semana'},{k:'month',l:'Mês'},{k:'custom',l:'Período'}]

  return(
    <div style={{height:'100%',overflowY:'auto',padding:'16px 20px',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <TrendingUp size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>DASHBOARD</h1>
        <div style={{display:'flex',gap:5,marginLeft:'auto',flexWrap:'wrap'}}>
          {PERIODS.map(p=>(<button key={p.k} onClick={()=>setPeriod(p.k as any)} style={{padding:'5px 12px',borderRadius:8,border:period===p.k?'1px solid var(--neon)':'1px solid var(--border)',background:period===p.k?'var(--neon-glow)':'transparent',color:period===p.k?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>{p.l}</button>))}
          <button onClick={load} style={{padding:'5px 9px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer'}}><RefreshCw size={13} style={{display:'block',animation:loading?'spin 1s linear infinite':'none'}}/></button>
        </div>
      </div>
      {period==='custom'&&(
        <div style={{display:'flex',gap:10,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{display:'flex',gap:6,alignItems:'center'}}><Calendar size={13} color='var(--muted)'/><input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{fontSize:13,padding:'5px 10px'}}/></div>
          <span style={{color:'var(--muted)',fontSize:12}}>até</span>
          <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{fontSize:13,padding:'5px 10px'}}/>
        </div>
      )}

      {/* KPI cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20}}>
        {[
          {icon:DollarSign,label:'Receita Total',value:fmt(totalRev),color:'var(--neon)'},
          {icon:ShoppingCart,label:'Pedidos',value:orders.length,color:'#06b6d4'},
          {icon:TrendingUp,label:'Ticket Médio',value:fmt(avgTicket),color:'#f59e0b'},
          {icon:ShoppingCart,label:'PDV',value:pdvOrders.length+' vendas',color:'#7c3aed'},
          {icon:Truck,label:'Delivery',value:delOrders.length+' pedidos',color:'#10b981'},
        ].map((k,i)=>(<div key={i} className='card' style={{padding:'14px 16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <k.icon size={14} color={k.color}/>
            <span style={{fontSize:11,color:'var(--muted)',letterSpacing:0.5}}>{k.label}</span>
          </div>
          <p style={{fontSize:20,fontWeight:700,color:k.color,fontFamily:'JetBrains Mono,monospace'}}>{loading?'..':k.value}</p>
        </div>))}
      </div>

      {orders.length===0&&!loading?(
        <div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>
          <TrendingUp size={40} style={{opacity:0.2,marginBottom:12}}/>
          <p style={{fontFamily:'Bangers,cursive',fontSize:18}}>NENHUMA VENDA NO PERÍODO</p>
          <p style={{fontSize:12,marginTop:6}}>Tente selecionar outro período</p>
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16}}>
          {/* Daily revenue chart */}
          {chartData.length>0&&(<div className='card' style={{padding:'16px 12px'}}>
            <p style={{fontFamily:'Bangers,cursive',fontSize:15,color:'var(--white)',marginBottom:12,letterSpacing:0.5}}>RECEITA POR DIA</p>
            <ResponsiveContainer width='100%' height={200}>
              <BarChart data={chartData} margin={{top:0,right:8,left:0,bottom:0}}>
                <XAxis dataKey='date' tick={{fontSize:10,fill:'#4a7c59'}}/>
                <YAxis tick={{fontSize:10,fill:'#4a7c59'}} tickFormatter={v=>v>=1000?(v/1000).toFixed(0)+'k':v}/>
                <Tooltip formatter={(v:any)=>fmt(v)} contentStyle={{background:'#0a1a0a',border:'1px solid #1a3a1a',borderRadius:8,fontSize:12}}/>
                <Bar dataKey='total' fill='#00ff41' radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>)}

          {/* PDV vs Delivery */}
          {typeData.length>0&&(<div className='card' style={{padding:'16px 12px'}}>
            <p style={{fontFamily:'Bangers,cursive',fontSize:15,color:'var(--white)',marginBottom:12,letterSpacing:0.5}}>PDV vs DELIVERY</p>
            <ResponsiveContainer width='100%' height={200}>
              <PieChart>
                <Pie data={typeData} cx='50%' cy='50%' outerRadius={75} dataKey='value' label={({name,percent})=>name+' '+Math.round(percent*100)+'%'} labelLine={{stroke:'#4a7c59',strokeWidth:1}}>
                  {typeData.map((_,i)=>(<Cell key={i} fill={COLORS[i]}/>))}
                </Pie>
                <Tooltip formatter={(v:any)=>fmt(v)} contentStyle={{background:'#0a1a0a',border:'1px solid #1a3a1a',borderRadius:8,fontSize:12}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>)}

          {/* Recent orders */}
          <div className='card' style={{padding:'14px 16px'}}>
            <p style={{fontFamily:'Bangers,cursive',fontSize:15,color:'var(--white)',marginBottom:10,letterSpacing:0.5}}>ÚLTIMOS PEDIDOS</p>
            {orders.slice(-8).reverse().map(o=>(<div key={o.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid rgba(26,46,26,0.4)',fontSize:12}}>
              <div>
                <span style={{color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',marginRight:8}}>#{o.order_number}</span>
                <span style={{color:'var(--text)'}}>{o.customer_name||'—'}</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:10,padding:'1px 6px',borderRadius:10,background:o.type==='pdv'?'rgba(0,255,65,0.1)':'rgba(6,182,212,0.1)',color:o.type==='pdv'?'var(--neon)':'#06b6d4'}}>{o.type?.toUpperCase()}</span>
                <span style={{fontWeight:600,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(o.total))}</span>
              </div>
            </div>))}
          </div>
        </div>
      )}
      <p style={{fontSize:10,color:'var(--muted)',textAlign:'right',marginTop:12}}>Atualizado: {lastRefresh.toLocaleTimeString('pt-BR')}</p>
    </div>
  )
}