import{useState,useEffect}from 'react'
import{LayoutDashboard,TrendingUp,ShoppingCart,Truck,DollarSign,Calendar,RefreshCw}from 'lucide-react'
import{supabase}from '@/lib/supabase'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

function todayStr(){return new Date().toISOString().substring(0,10)}
function daysAgo(n:number){const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().substring(0,10)}
function monthStart(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1).toISOString().substring(0,10)}

export default function DashboardPage(){
  const[loading,setLoading]=useState(true)
  const[period,setPeriod]=useState<'today'|'7d'|'30d'|'month'|'custom'>('today')
  const[dateFrom,setDateFrom]=useState(todayStr())
  const[dateTo,setDateTo]=useState(todayStr())
  const[orders,setOrders]=useState<any[]>([])
  const[prevOrders,setPrevOrders]=useState<any[]>([])

  useEffect(()=>{
    if(period==='today'){setDateFrom(todayStr());setDateTo(todayStr())}
    else if(period==='7d'){setDateFrom(daysAgo(7));setDateTo(todayStr())}
    else if(period==='30d'){setDateFrom(daysAgo(30));setDateTo(todayStr())}
    else if(period==='month'){setDateFrom(monthStart());setDateTo(todayStr())}
  },[period])

  useEffect(()=>{load()},[dateFrom,dateTo])

  async function load(){
    setLoading(true)
    const from=dateFrom+'T00:00:00'
    const to=dateTo+'T23:59:59'
    // Calc previous period for comparison
    const days=Math.max(1,Math.round((new Date(dateTo).getTime()-new Date(dateFrom).getTime())/(1000*60*60*24))+1)
    const prevFrom=new Date(dateFrom);prevFrom.setDate(prevFrom.getDate()-days)
    const prevTo=new Date(dateFrom);prevTo.setDate(prevTo.getDate()-1)
    const[curr,prev]=await Promise.all([
      supabase.from('orders').select('*,order_payments(method,amount)').neq('status','cancelled').gte('created_at',from).lte('created_at',to),
      supabase.from('orders').select('total').neq('status','cancelled').gte('created_at',prevFrom.toISOString().substring(0,10)+'T00:00:00').lte('created_at',prevTo.toISOString().substring(0,10)+'T23:59:59'),
    ])
    setOrders(curr.data||[])
    setPrevOrders(prev.data||[])
    setLoading(false)
  }

  const revenue=orders.reduce((s,o)=>s+Number(o.total),0)
  const prevRevenue=prevOrders.reduce((s,o)=>s+Number(o.total),0)
  const revChange=prevRevenue>0?((revenue-prevRevenue)/prevRevenue*100):0
  const pdvOrders=orders.filter(o=>o.type==='pdv')
  const delivOrders=orders.filter(o=>o.type==='delivery')
  const avgTicket=orders.length>0?revenue/orders.length:0

  // Payment breakdown
  const pays:Record<string,number>={pix:0,dinheiro:0,debito:0,credito:0}
  orders.forEach(o=>{
    (o.order_payments||[]).forEach((p:any)=>{
      const m=p.method?.toLowerCase()||'pix'
      pays[m]=(pays[m]||0)+Number(p.amount)
    })
    // fallback if no payments recorded
    if(!(o.order_payments||[]).length) pays['pix']=(pays['pix']||0)+Number(o.total)
  })

  // Daily chart data
  const days2=Math.max(1,Math.round((new Date(dateTo).getTime()-new Date(dateFrom).getTime())/(1000*60*60*24))+1)
  const chartDays=Math.min(days2,14)
  const dayData:Array<{label:string;revenue:number;count:number}>=[]
  for(let i=chartDays-1;i>=0;i--){
    const d=new Date(dateTo);d.setDate(d.getDate()-i)
    const ds=d.toISOString().substring(0,10)
    const dayOrders=orders.filter(o=>o.created_at?.substring(0,10)===ds)
    dayData.push({
      label:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),
      revenue:dayOrders.reduce((s,o)=>s+Number(o.total),0),
      count:dayOrders.length
    })
  }
  const maxRev=Math.max(...dayData.map(d=>d.revenue),1)

  const PERIODS=[
    {k:'today',l:'Hoje'},
    {k:'7d',l:'7 dias'},
    {k:'month',l:'Este mês'},
    {k:'30d',l:'30 dias'},
    {k:'custom',l:'Período'},
  ]

  const KPIs=[
    {label:'Receita Total',value:fmt(revenue),icon:DollarSign,color:'var(--neon)',change:revChange},
    {label:'Pedidos',value:String(orders.length),icon:ShoppingCart,color:'#06b6d4',sub:'PDV: '+pdvOrders.length+' | Delivery: '+delivOrders.length},
    {label:'Ticket Médio',value:fmt(avgTicket),icon:TrendingUp,color:'#f59e0b'},
    {label:'PDV',value:fmt(pdvOrders.reduce((s,o)=>s+Number(o.total),0)),icon:ShoppingCart,color:'var(--neon)',sub:pdvOrders.length+' vendas'},
    {label:'Delivery',value:fmt(delivOrders.reduce((s,o)=>s+Number(o.total),0)),icon:Truck,color:'#06b6d4',sub:delivOrders.length+' pedidos'},
  ]

  const PAY_COLORS:Record<string,string>={pix:'#06b6d4',dinheiro:'#10b981',debito:'#7c3aed',credito:'#f59e0b'}
  const PAY_LABELS:Record<string,string>={pix:'PIX',dinheiro:'Dinheiro',debito:'Débito',credito:'Crédito'}

  return(
    <div style={{height:'100%',overflowY:'auto',background:'var(--bg)',padding:'14px 16px'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <LayoutDashboard size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:24}}>DASHBOARD</h1>
        <button onClick={load} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',padding:4}}><RefreshCw size={14}/></button>
        {/* Period selector */}
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginLeft:'auto'}}>
          {PERIODS.map(p=>(
            <button key={p.k} onClick={()=>setPeriod(p.k as any)} style={{padding:'5px 10px',borderRadius:8,border:period===p.k?'1px solid var(--neon)':'1px solid var(--border)',background:period===p.k?'var(--neon-glow)':'transparent',color:period===p.k?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>{p.l}</button>
          ))}
        </div>
        {period==='custom'&&(
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{fontSize:12,padding:'4px 8px'}}/>
            <span style={{color:'var(--muted)',fontSize:12}}>até</span>
            <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{fontSize:12,padding:'4px 8px'}}/>
          </div>
        )}
      </div>

      {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:(
        <>
          {/* KPI cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:16}}>
            {KPIs.map((k,i)=>(
              <div key={i} className='card' style={{padding:'14px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
                  <k.icon size={14} color={k.color}/>
                  <span style={{fontSize:11,color:'var(--muted)',letterSpacing:0.5}}>{k.label}</span>
                </div>
                <p style={{fontSize:20,fontWeight:700,color:k.color,fontFamily:'JetBrains Mono,monospace',lineHeight:1}}>{k.value}</p>
                {k.change!=null&&k.change!==0&&(
                  <p style={{fontSize:10,color:k.change>0?'#10b981':'#ff3333',marginTop:4}}>
                    {k.change>0?'▲':'▼'} {Math.abs(k.change).toFixed(1)}% vs período anterior
                  </p>
                )}
                {k.sub&&<p style={{fontSize:10,color:'var(--muted)',marginTop:4}}>{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,marginBottom:16}}>
            {/* Daily revenue bar chart */}
            <div className='card' style={{padding:'14px 16px'}}>
              <p style={{fontSize:12,color:'var(--muted)',marginBottom:12,fontWeight:600,letterSpacing:0.5}}>RECEITA POR DIA</p>
              {orders.length===0?(
                <div style={{height:100,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',fontSize:12}}>Sem dados no período</div>
              ):(
                <div style={{display:'flex',alignItems:'flex-end',gap:4,height:100}}>
                  {dayData.map((d,i)=>(
                    <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                      <div title={fmt(d.revenue)+' | '+d.count+' pedidos'} style={{width:'100%',background:d.revenue>0?'var(--neon)':'var(--border)',height:Math.max(3,d.revenue/maxRev*80)+'px',borderRadius:'3px 3px 0 0',opacity:d.revenue>0?1:0.3,transition:'height 0.3s',cursor:'default'}}/>
                      <span style={{fontSize:9,color:'var(--muted)',transform:'rotate(-30deg)',transformOrigin:'center',whiteSpace:'nowrap'}}>{d.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment methods */}
            <div className='card' style={{padding:'14px 16px',minWidth:170}}>
              <p style={{fontSize:12,color:'var(--muted)',marginBottom:12,fontWeight:600,letterSpacing:0.5}}>PAGAMENTOS</p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {Object.entries(pays).filter(([,v])=>v>0).map(([method,val])=>{
                  const pct=revenue>0?(val/revenue*100):0
                  return(
                    <div key={method}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
                        <span style={{color:PAY_COLORS[method]||'var(--muted)'}}>{PAY_LABELS[method]||method}</span>
                        <span style={{color:'var(--text)',fontFamily:'JetBrains Mono,monospace'}}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{height:5,background:'var(--surface)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:pct+'%',background:PAY_COLORS[method]||'var(--neon)',borderRadius:3,transition:'width 0.5s'}}/>
                      </div>
                      <p style={{fontSize:10,color:'var(--muted)',marginTop:1}}>{fmt(val)}</p>
                    </div>
                  )
                })}
                {Object.values(pays).every(v=>v===0)&&<p style={{fontSize:12,color:'var(--muted)'}}>Sem dados</p>}
              </div>
            </div>
          </div>

          {/* Summary footer */}
          <div className='card' style={{padding:'10px 16px',display:'flex',gap:20,flexWrap:'wrap'}}>
            <p style={{fontSize:11,color:'var(--muted)'}}>Período: <strong style={{color:'var(--text)'}}>{new Date(dateFrom).toLocaleDateString('pt-BR')} — {new Date(dateTo).toLocaleDateString('pt-BR')}</strong></p>
            <p style={{fontSize:11,color:'var(--muted)'}}>Total de pedidos: <strong style={{color:'var(--neon)'}}>{orders.length}</strong></p>
            <p style={{fontSize:11,color:'var(--muted)'}}>Receita bruta: <strong style={{color:'var(--neon)'}}>{fmt(revenue)}</strong></p>
            {prevRevenue>0&&<p style={{fontSize:11,color:'var(--muted)'}}>Período anterior: <strong style={{color:'var(--muted)'}}>{fmt(prevRevenue)}</strong></p>}
          </div>
        </>
      )}
    </div>
  )
}