import{useState,useEffect}from 'react'
import{BarChart2,TrendingUp,ShoppingCart,Truck,DollarSign,Users,Package,ArrowUp,ArrowDown}from 'lucide-react'
import{supabase}from '@/lib/supabase'
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const fmtN=(v:number)=>new Intl.NumberFormat('pt-BR').format(v)
export default function DashboardPage(){
  const[loading,setLoading]=useState(true)
  const[period,setPeriod]=useState<'7d'|'30d'|'90d'>('7d')
  const[stats,setStats]=useState({totalRevenue:0,totalOrders:0,avgTicket:0,cancelRate:0,pdvRevenue:0,deliveryRevenue:0,topProducts:[] as any[],dailySales:[] as any[],paymentBreakdown:{} as Record<string,number>,hourlyPeak:[] as number[],prevRevenue:0,prevOrders:0})
  useEffect(()=>{load()},[period])
  async function load(){
    setLoading(true)
    const days=period==='7d'?7:period==='30d'?30:90
    const from=new Date();from.setDate(from.getDate()-days)
    const fromPrev=new Date();fromPrev.setDate(fromPrev.getDate()-days*2)
    const fromStr=from.toISOString()
    const fromPrevStr=fromPrev.toISOString()
    const[curr,prev,items]=await Promise.all([
      supabase.from('orders').select('id,total,subtotal,type,status,payment_method,created_at').gte('created_at',fromStr),
      supabase.from('orders').select('id,total,status').gte('created_at',fromPrevStr).lt('created_at',fromStr),
      supabase.from('order_items').select('product_name,quantity,total_price,order_id').gte('created_at',fromStr)
    ])
    const orders=(curr.data||[])
    const prevOrders=(prev.data||[])
    const allItems=(items.data||[])
    const done=orders.filter(o=>o.status!=='cancelled')
    const prevDone=prevOrders.filter(o=>o.status!=='cancelled')
    const totalRevenue=done.reduce((s,o)=>s+Number(o.total),0)
    const prevRevenue=prevDone.reduce((s,o)=>s+Number(o.total),0)
    // Payment breakdown
    const payBreak:Record<string,number>={}
    done.forEach(o=>{const m=o.payment_method||'outros';payBreak[m]=(payBreak[m]||0)+Number(o.total)})
    // Top products
    const prodMap:Record<string,{name:string;qty:number;revenue:number}>={}
    allItems.forEach((i:any)=>{
      if(!prodMap[i.product_name])prodMap[i.product_name]={name:i.product_name,qty:0,revenue:0}
      prodMap[i.product_name].qty+=Number(i.quantity)
      prodMap[i.product_name].revenue+=Number(i.total_price)
    })
    const topProducts=Object.values(prodMap).sort((a,b)=>b.revenue-a.revenue).slice(0,8)
    // Daily sales (last N days)
    const dailyMap:Record<string,number>={}
    for(let i=0;i<days;i++){
      const d=new Date();d.setDate(d.getDate()-i)
      dailyMap[d.toISOString().split('T')[0]]=0
    }
    done.forEach(o=>{const day=o.created_at.split('T')[0];if(dailyMap.hasOwnProperty(day))dailyMap[day]+=Number(o.total)})
    const dailySales=Object.entries(dailyMap).sort(([a],[b])=>a>b?1:-1).map(([date,total])=>({date,total}))
    // Hourly peak
    const hourly=Array(24).fill(0)
    done.forEach(o=>{const h=new Date(o.created_at).getHours();hourly[h]+=Number(o.total)})
    setStats({
      totalRevenue,prevRevenue,
      totalOrders:done.length,prevOrders:prevDone.length,
      avgTicket:done.length>0?totalRevenue/done.length:0,
      cancelRate:orders.length>0?(orders.filter(o=>o.status==='cancelled').length/orders.length*100):0,
      pdvRevenue:done.filter(o=>o.type==='pdv').reduce((s,o)=>s+Number(o.total),0),
      deliveryRevenue:done.filter(o=>o.type==='delivery').reduce((s,o)=>s+Number(o.total),0),
      topProducts,dailySales,paymentBreakdown:payBreak,hourlyPeak:hourly
    })
    setLoading(false)
  }
  const maxDay=Math.max(...stats.dailySales.map(d=>d.total),1)
  const maxHour=Math.max(...stats.hourlyPeak,1)
  const revenueChange=stats.prevRevenue>0?((stats.totalRevenue-stats.prevRevenue)/stats.prevRevenue*100):0
  const ordersChange=stats.prevOrders>0?((stats.totalOrders-stats.prevOrders)/stats.prevOrders*100):0
  const PL:Record<string,string>={pix:'💚 PIX',dinheiro:'💵 Dinheiro',debito:'💳 Débito',credito:'💳 Crédito',outros:'Outros'}
  const PC:Record<string,string>={pix:'#00ff41',dinheiro:'#10b981',debito:'#06b6d4',credito:'#7c3aed',outros:'#888'}
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <BarChart2 size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>DASHBOARD</h1>
        <div style={{marginLeft:'auto',display:'flex',gap:6}}>
          {(['7d','30d','90d'] as const).map(p=>(
            <button key={p} onClick={()=>setPeriod(p)} style={{padding:'5px 12px',borderRadius:8,border:period===p?'1px solid var(--neon)':'1px solid var(--border)',background:period===p?'var(--neon-glow)':'transparent',color:period===p?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>
              {p==='7d'?'7 dias':p==='30d'?'30 dias':'90 dias'}
            </button>
          ))}
        </div>
      </div>
      {loading?<div style={{textAlign:'center',padding:64,color:'var(--muted)'}}>Carregando dados...</div>:(
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {/* KPI Cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:20}}>
          {[
            {label:'RECEITA TOTAL',value:fmt(stats.totalRevenue),change:revenueChange,icon:<DollarSign size={18} color='var(--neon)'/>},
            {label:'PEDIDOS',value:fmtN(stats.totalOrders),change:ordersChange,icon:<ShoppingCart size={18} color='#06b6d4'/>},
            {label:'TICKET MÉDIO',value:fmt(stats.avgTicket),icon:<TrendingUp size={18} color='#f59e0b'/>},
            {label:'CANCELAMENTOS',value:stats.cancelRate.toFixed(1)+'%',icon:<Package size={18} color='#ff3333'/>},
            {label:'PDV',value:fmt(stats.pdvRevenue),icon:<ShoppingCart size={18} color='var(--neon)'/>},
            {label:'DELIVERY',value:fmt(stats.deliveryRevenue),icon:<Truck size={18} color='#06b6d4'/>},
          ].map(k=>(
            <div key={k.label} className='card' style={{padding:'12px 14px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:9,color:'var(--muted)',fontWeight:600,letterSpacing:0.8}}>{k.label}</span>
                {k.icon}
              </div>
              <p style={{fontSize:20,fontWeight:700,color:'var(--white)',fontFamily:'JetBrains Mono,monospace',lineHeight:1}}>{k.value}</p>
              {k.change!==undefined&&(
                <div style={{display:'flex',alignItems:'center',gap:3,marginTop:4}}>
                  {k.change>=0?<ArrowUp size={10} color='#00ff41'/>:<ArrowDown size={10} color='#ff3333'/>}
                  <span style={{fontSize:10,color:k.change>=0?'#00ff41':'#ff3333'}}>{Math.abs(k.change).toFixed(1)}% vs período anterior</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Daily Sales Chart */}
        <div className='card' style={{padding:'14px 16px',marginBottom:16}}>
          <p style={{fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1,marginBottom:12}}>VENDAS POR DIA</p>
          <div style={{display:'flex',alignItems:'flex-end',gap:3,height:80,overflowX:'auto',paddingBottom:4}}>
            {stats.dailySales.map((d,i)=>{
              const h=Math.max(4,Math.round((d.total/maxDay)*76))
              const isToday=d.date===new Date().toISOString().split('T')[0]
              return(
                <div key={i} title={d.date+': '+fmt(d.total)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,flexShrink:0,flex:1,minWidth:8}}>
                  <div style={{width:'100%',minWidth:6,height:h,background:isToday?'var(--neon)':'rgba(0,255,65,0.35)',borderRadius:'3px 3px 0 0',transition:'height 0.3s'}}/>
                  {stats.dailySales.length<=14&&<span style={{fontSize:8,color:'var(--muted)',transform:'rotate(-45deg)',transformOrigin:'center',whiteSpace:'nowrap'}}>{d.date.slice(5)}</span>}
                </div>
              )
            })}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'var(--muted)',marginTop:4}}>
            <span>{stats.dailySales[0]?.date||''}</span>
            <span>{fmt(maxDay)} max</span>
            <span>{stats.dailySales[stats.dailySales.length-1]?.date||''}</span>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
          {/* Payment Breakdown */}
          <div className='card' style={{padding:'14px 16px'}}>
            <p style={{fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1,marginBottom:12}}>FORMAS DE PAGAMENTO</p>
            {Object.entries(stats.paymentBreakdown).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).map(([k,v])=>{
              const total=Object.values(stats.paymentBreakdown).reduce((s,x)=>s+x,0)
              const pct=total>0?Math.round(v/total*100):0
              return(
                <div key={k} style={{marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:2}}>
                    <span style={{color:'var(--text)'}}>{PL[k]||k}</span>
                    <span style={{color:PC[k]||'#888',fontFamily:'JetBrains Mono,monospace',fontWeight:600}}>{pct}%</span>
                  </div>
                  <div style={{height:4,background:'var(--surface)',borderRadius:2}}>
                    <div style={{height:4,borderRadius:2,background:PC[k]||'#888',width:pct+'%'}}/>
                  </div>
                  <p style={{fontSize:9,color:'var(--muted)',marginTop:1,textAlign:'right'}}>{fmt(v)}</p>
                </div>
              )
            })}
            {Object.values(stats.paymentBreakdown).every(v=>v===0)&&<p style={{fontSize:12,color:'var(--muted)',textAlign:'center',padding:16}}>Sem dados</p>}
          </div>
          {/* Hourly Peak */}
          <div className='card' style={{padding:'14px 16px'}}>
            <p style={{fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1,marginBottom:12}}>PICO DE VENDAS (HORA)</p>
            <div style={{display:'flex',alignItems:'flex-end',gap:2,height:72}}>
              {stats.hourlyPeak.map((v,h)=>{
                const height=Math.max(2,Math.round((v/maxHour)*68))
                const isPeak=v===maxHour&&v>0
                return(
                  <div key={h} title={h+'h: '+fmt(v)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
                    <div style={{width:'100%',height,background:isPeak?'#f59e0b':'rgba(245,158,11,0.25)',borderRadius:'2px 2px 0 0'}}/>
                  </div>
                )
              })}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:8,color:'var(--muted)',marginTop:2}}>
              {[0,6,12,18,23].map(h=><span key={h}>{h}h</span>)}
            </div>
            {maxHour>0&&(
              <p style={{fontSize:10,color:'#f59e0b',marginTop:6,textAlign:'center'}}>
                🔥 Pico: {stats.hourlyPeak.indexOf(maxHour)}h ({fmt(maxHour)})
              </p>
            )}
          </div>
        </div>
        {/* Top Products */}
        {stats.topProducts.length>0&&(
          <div className='card' style={{padding:'14px 16px'}}>
            <p style={{fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1,marginBottom:12}}>PRODUTOS MAIS VENDIDOS</p>
            {stats.topProducts.map((p,i)=>{
              const maxRev=stats.topProducts[0].revenue
              const pct=Math.round(p.revenue/maxRev*100)
              return(
                <div key={i} style={{marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:2}}>
                    <span style={{color:'var(--white)',fontWeight:i===0?700:400}}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':'  '} {p.name}
                    </span>
                    <div style={{display:'flex',gap:10,flexShrink:0}}>
                      <span style={{fontSize:10,color:'var(--muted)'}}>{p.qty} un</span>
                      <span style={{color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',fontWeight:600,fontSize:12}}>{fmt(p.revenue)}</span>
                    </div>
                  </div>
                  <div style={{height:3,background:'var(--surface)',borderRadius:2}}>
                    <div style={{height:3,borderRadius:2,background:i===0?'var(--neon)':'rgba(0,255,65,0.4)',width:pct+'%'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}
    </div>
  )
}