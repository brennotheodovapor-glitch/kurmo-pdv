import{useState,useEffect}from 'react'
import{BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,PieChart,Pie,Cell}from 'recharts'
import{BarChart3,Calendar,TrendingUp,ShoppingCart,Truck,Download}from 'lucide-react'
import{supabase}from '@/lib/supabase'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const COLORS=['#00ff41','#06b6d4','#7c3aed','#f59e0b','#ef4444','#10b981']
const today=()=>new Date().toISOString().split('T')[0]
const monthStart=()=>new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split('T')[0]

export default function ReportsPage(){
  const[loading,setLoading]=useState(true)
  const[dateFrom,setDateFrom]=useState(monthStart())
  const[dateTo,setDateTo]=useState(today())
  const[orders,setOrders]=useState<any[]>([])
  const[items,setItems]=useState<any[]>([])
  const[payments,setPayments]=useState<any[]>([])

  useEffect(()=>{load()},[dateFrom,dateTo])

  async function load(){
    setLoading(true)
    const[o,p]=await Promise.all([
      supabase.from('orders').select('*').in('status',['completed','delivered']).gte('created_at',dateFrom+'T00:00:00').lte('created_at',dateTo+'T23:59:59').order('created_at',{ascending:true}),
      supabase.from('order_payments').select('*')
    ])
    const ords=o.data||[]
    setOrders(ords)
    setPayments(p.data||[])
    if(ords.length>0){
      const ids=ords.map(x=>x.id)
      const{data:it}=await supabase.from('order_items').select('*').in('order_id',ids)
      setItems(it||[])
    } else {setItems([])}
    setLoading(false)
  }

  // Derived stats
  const total=orders.reduce((s,o)=>s+Number(o.total),0)
  const pdvTotal=orders.filter(o=>o.type==='pdv').reduce((s,o)=>s+Number(o.total),0)
  const delivTotal=orders.filter(o=>o.type==='delivery').reduce((s,o)=>s+Number(o.total),0)
  const avgTicket=orders.length?total/orders.length:0

  // Daily grouped
  const byDay:Record<string,{day:string;total:number;pdv:number;delivery:number;n:number}>={}
  orders.forEach(o=>{
    const d=new Date(o.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})
    if(!byDay[d])byDay[d]={day:d,total:0,pdv:0,delivery:0,n:0}
    byDay[d].total+=Number(o.total)
    byDay[d].n++
    if(o.type==='pdv')byDay[d].pdv+=Number(o.total)
    else byDay[d].delivery+=Number(o.total)
  })
  const dailyArr=Object.values(byDay)

  // Payment methods (only for these orders)
  const ordIds=new Set(orders.map(o=>o.id))
  const payMap:Record<string,number>={}
  payments.filter(p=>ordIds.has(p.order_id)).forEach(p=>{
    const l=p.method==='pix'?'PIX':p.method==='dinheiro'?'Dinheiro':p.method==='debito'?'Debito':'Credito'
    payMap[l]=(payMap[l]||0)+Number(p.amount)
  })
  const payArr=Object.entries(payMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)

  // Top products
  const prodMap:Record<string,{name:string;qty:number;revenue:number}>={}
  items.forEach(i=>{
    if(!prodMap[i.product_name])prodMap[i.product_name]={name:i.product_name,qty:0,revenue:0}
    prodMap[i.product_name].qty+=i.quantity
    prodMap[i.product_name].revenue+=Number(i.total_price)
  })
  const topProds=Object.values(prodMap).sort((a,b)=>b.revenue-a.revenue).slice(0,10)

  function exportCSV(){
    const rows=[['#','Data','Hora','Tipo','Cliente','Total','Status']]
    orders.forEach(o=>rows.push([
      o.order_number,
      new Date(o.created_at).toLocaleDateString('pt-BR'),
      new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      o.type==='pdv'?'PDV':'Delivery',
      o.customer_name||'Avulso',
      Number(o.total).toFixed(2),
      o.status
    ]))
    const csv=rows.map(r=>r.join(';')).join('
')
    const blob=new Blob([' '+csv],{type:'text/csv;charset=utf-8'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='relatorio.csv';a.click()
  }

  const tip={background:'#111811',border:'1px solid var(--border)',borderRadius:8,color:'var(--white)',fontSize:12}

  return(
    <div style={{height:'100%',overflowY:'auto',padding:'20px',background:'var(--bg)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <BarChart3 size={22} color='var(--neon)'/>
          <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>RELATORIOS</h1>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <Calendar size={13} color='var(--muted)'/>
          {[{k:'today',l:'Hoje'},{k:'week',l:'7 dias'},{k:'month',l:'Este mes'},{k:'last',l:'Mes ant.'}].map(p=>(
            <button key={p.k} onClick={()=>{
              const d=new Date()
              if(p.k==='today'){setDateFrom(today());setDateTo(today())}
              else if(p.k==='week'){const w=new Date(d);w.setDate(d.getDate()-7);setDateFrom(w.toISOString().split('T')[0]);setDateTo(today())}
              else if(p.k==='month'){setDateFrom(monthStart());setDateTo(today())}
              else{const lm=new Date(d.getFullYear(),d.getMonth()-1,1);const le=new Date(d.getFullYear(),d.getMonth(),0);setDateFrom(lm.toISOString().split('T')[0]);setDateTo(le.toISOString().split('T')[0])}
            }} style={{padding:'5px 10px',borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>
              {p.l}
            </button>
          ))}
          <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
          <span style={{fontSize:11,color:'var(--muted)'}}>ate</span>
          <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
          {orders.length>0&&<button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--card)',color:'var(--muted)',cursor:'pointer',fontSize:12}}><Download size={13}/>CSV</button>}
        </div>
      </div>

      {loading?<div style={{textAlign:'center',padding:64,color:'var(--muted)'}}>Carregando...</div>:orders.length===0?(
        <div style={{textAlign:'center',padding:80,color:'var(--muted)'}}><BarChart3 size={48} style={{opacity:0.3,marginBottom:16}}/><p style={{fontFamily:'Bangers,cursive',fontSize:20}}>NENHUMA VENDA NO PERIODO</p><p style={{fontSize:13,marginTop:8}}>Tente selecionar outro periodo ou aguarde as primeiras vendas.</p></div>
      ):(
        <>
          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:20}}>
            {[
              {l:'Total do periodo',v:fmt(total),c:'#00ff41',icon:TrendingUp},
              {l:'Pedidos',v:String(orders.length),c:'#06b6d4',icon:ShoppingCart},
              {l:'Ticket medio',v:fmt(avgTicket),c:'#7c3aed',icon:ShoppingCart},
              {l:'PDV',v:fmt(pdvTotal),c:'#f59e0b',icon:ShoppingCart},
              {l:'Delivery',v:fmt(delivTotal),c:'#10b981',icon:Truck},
            ].map((k,i)=>(
              <div key={i} className='card' style={{padding:'14px 16px'}}>
                <p style={{fontSize:20,fontWeight:700,color:k.c,fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p>
                <p style={{fontSize:11,color:'var(--muted)',marginTop:3}}>{k.l}</p>
              </div>
            ))}
          </div>

          {/* Daily chart */}
          {dailyArr.length>0&&(
            <div className='card' style={{padding:'18px 20px',marginBottom:16}}>
              <p style={{fontSize:14,fontWeight:600,color:'var(--white)',marginBottom:14}}>Faturamento por dia</p>
              <ResponsiveContainer width='100%' height={200}>
                <BarChart data={dailyArr} margin={{top:0,right:0,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray='3 3' stroke='rgba(255,255,255,0.05)'/>
                  <XAxis dataKey='day' tick={{fill:'#64748b',fontSize:11}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fill:'#64748b',fontSize:11}} tickLine={false} axisLine={false} tickFormatter={v=>v>=1000?(v/1000).toFixed(1)+'k':v}/>
                  <Tooltip contentStyle={tip} formatter={(v:any,n:string)=>[fmt(Number(v)),n==='pdv'?'PDV':n==='delivery'?'Delivery':'Total']}/>
                  <Bar dataKey='pdv' stackId='a' fill='#00ff41' name='pdv' radius={[0,0,0,0]} maxBarSize={40}/>
                  <Bar dataKey='delivery' stackId='a' fill='#06b6d4' name='delivery' radius={[4,4,0,0]} maxBarSize={40}/>
                </BarChart>
              </ResponsiveContainer>
              <div style={{display:'flex',gap:16,marginTop:8,justifyContent:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'var(--muted)'}}><div style={{width:10,height:10,borderRadius:2,background:'#00ff41'}}/>PDV</div>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'var(--muted)'}}><div style={{width:10,height:10,borderRadius:2,background:'#06b6d4'}}/>Delivery</div>
              </div>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            {/* Payment methods */}
            {payArr.length>0&&(
              <div className='card' style={{padding:'18px 20px'}}>
                <p style={{fontSize:14,fontWeight:600,color:'var(--white)',marginBottom:14}}>Formas de pagamento</p>
                <ResponsiveContainer width='100%' height={140}>
                  <PieChart>
                    <Pie data={payArr} cx='50%' cy='50%' innerRadius={35} outerRadius={60} dataKey='value' strokeWidth={0}>
                      {payArr.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={tip} formatter={(v:any)=>[fmt(Number(v))]}/>
                  </PieChart>
                </ResponsiveContainer>
                {payArr.map((p,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:12,padding:'4px 0',borderBottom:'1px solid rgba(26,46,26,0.4)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:2,background:COLORS[i%COLORS.length]}}/><span style={{color:'var(--muted)'}}>{p.name}</span></div>
                    <span style={{color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.value)}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Top products */}
            {topProds.length>0&&(
              <div className='card' style={{padding:'18px 20px'}}>
                <p style={{fontSize:14,fontWeight:600,color:'var(--white)',marginBottom:14}}>Produtos mais vendidos</p>
                {topProds.map((p,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'5px 0',borderBottom:'1px solid rgba(26,46,26,0.4)'}}>
                    <span style={{fontSize:11,color:'var(--neon)',minWidth:18,fontWeight:700}}>{i+1}.</span>
                    <span style={{flex:1,fontSize:12,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
                    <span style={{fontSize:11,color:'var(--muted)',minWidth:40,textAlign:'right'}}>{p.qty}un</span>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',minWidth:80,textAlign:'right'}}>{fmt(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Orders table */}
          <div className='card' style={{overflow:'hidden'}}>
            <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>Todas as vendas ({orders.length})</p>
            </div>
            <div style={{maxHeight:320,overflowY:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{borderBottom:'1px solid var(--border)',position:'sticky',top:0,background:'var(--card)'}}>
                  {['#','Data','Hora','Tipo','Cliente','Pagamento','Total'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {orders.slice().reverse().map(o=>(
                    <tr key={o.id} style={{borderBottom:'1px solid rgba(26,46,26,0.4)'}}>
                      <td style={{padding:'8px 12px',fontSize:12,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>#{o.order_number}</td>
                      <td style={{padding:'8px 12px',fontSize:12,color:'var(--muted)'}}>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                      <td style={{padding:'8px 12px',fontSize:12,color:'var(--muted)'}}>{new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
                      <td style={{padding:'8px 12px'}}><span style={{fontSize:11,padding:'2px 7px',borderRadius:6,background:o.type==='pdv'?'rgba(0,255,65,0.1)':'rgba(6,182,212,0.1)',color:o.type==='pdv'?'var(--neon)':'#06b6d4'}}>{o.type==='pdv'?'PDV':'Delivery'}</span></td>
                      <td style={{padding:'8px 12px',fontSize:12,color:'var(--text)'}}>{o.customer_name||' '}</td>
                      <td style={{padding:'8px 12px',fontSize:11,color:'var(--muted)'}}>{o.payment_method||'m ltiplo'}</td>
                      <td style={{padding:'8px 12px',fontSize:13,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(o.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )

            else{const lm=new Date(d.getFullYear(),d.getMonth()-1,1);const le=new Date(d.getFullYear(),d.getMonth(),0);setDateFrom(lm.toISOString().split('T')[0]);setDateTo(le.toISOString().split('T')[0])}).format(v)
const COLORS=['#00ff41','#06b6d4','#7c3aed','#f59e0b','#ef4444','#10b981']
const today=()=>new Date().toISOString().split('T')[0]
const monthStart=()=>new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split('T')[0]

export default function ReportsPage(){
  const[loading,setLoading]=useState(true)
  const[dateFrom,setDateFrom]=useState(monthStart())
  const[dateTo,setDateTo]=useState(today())
  const[orders,setOrders]=useState<any[]>([])
  const[items,setItems]=useState<any[]>([])
  const[payments,setPayments]=useState<any[]>([])

  useEffect(()=>{load()},[dateFrom,dateTo])

  async function load(){
    setLoading(true)
    const[o,p]=await Promise.all([
      supabase.from('orders').select('*').in('status',['completed','delivered']).gte('created_at',dateFrom+'T00:00:00').lte('created_at',dateTo+'T23:59:59').order('created_at',{ascending:true}),
      supabase.from('order_payments').select('*')
    ])
    const ords=o.data||[]
    setOrders(ords)
    setPayments(p.data||[])
    if(ords.length>0){
      const ids=ords.map(x=>x.id)
      const{data:it}=await supabase.from('order_items').select('*').in('order_id',ids)
      setItems(it||[])
    } else {setItems([])}
    setLoading(false)
  }

  // Derived stats
  const total=orders.reduce((s,o)=>s+Number(o.total),0)
  const pdvTotal=orders.filter(o=>o.type==='pdv').reduce((s,o)=>s+Number(o.total),0)
  const delivTotal=orders.filter(o=>o.type==='delivery').reduce((s,o)=>s+Number(o.total),0)
  const avgTicket=orders.length?total/orders.length:0

  // Daily grouped
  const byDay:Record<string,{day:string;total:number;pdv:number;delivery:number;n:number}>={}
  orders.forEach(o=>{
    const d=new Date(o.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})
    if(!byDay[d])byDay[d]={day:d,total:0,pdv:0,delivery:0,n:0}
    byDay[d].total+=Number(o.total)
    byDay[d].n++
    if(o.type==='pdv')byDay[d].pdv+=Number(o.total)
    else byDay[d].delivery+=Number(o.total)
  })
  const dailyArr=Object.values(byDay)

  // Payment methods (only for these orders)
  const ordIds=new Set(orders.map(o=>o.id))
  const payMap:Record<string,number>={}
  payments.filter(p=>ordIds.has(p.order_id)).forEach(p=>{
    const l=p.method==='pix'?'PIX':p.method==='dinheiro'?'Dinheiro':p.method==='debito'?'Debito':'Credito'
    payMap[l]=(payMap[l]||0)+Number(p.amount)
  })
  const payArr=Object.entries(payMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)

  // Top products
  const prodMap:Record<string,{name:string;qty:number;revenue:number}>={}
  items.forEach(i=>{
    if(!prodMap[i.product_name])prodMap[i.product_name]={name:i.product_name,qty:0,revenue:0}
    prodMap[i.product_name].qty+=i.quantity
    prodMap[i.product_name].revenue+=Number(i.total_price)
  })
  const topProds=Object.values(prodMap).sort((a,b)=>b.revenue-a.revenue).slice(0,10)

  function exportCSV(){
    const rows=[['#','Data','Hora','Tipo','Cliente','Total','Status']]
    orders.forEach(o=>rows.push([
      o.order_number,
      new Date(o.created_at).toLocaleDateString('pt-BR'),
      new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      o.type==='pdv'?'PDV':'Delivery',
      o.customer_name||'Avulso',
      Number(o.total).toFixed(2),
      o.status
    ]))
    const csv=rows.map(r=>r.join(';')).join('
')
    const blob=new Blob([' '+csv],{type:'text/csv;charset=utf-8'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='relatorio.csv';a.click()
  }

  const tip={background:'#111811',border:'1px solid var(--border)',borderRadius:8,color:'var(--white)',fontSize:12}

  return(
    <div style={{height:'100%',overflowY:'auto',padding:'20px',background:'var(--bg)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <BarChart3 size={22} color='var(--neon)'/>
          <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>RELATORIOS</h1>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <Calendar size={13} color='var(--muted)'/>
          {[{k:'today',l:'Hoje'},{k:'week',l:'7 dias'},{k:'month',l:'Este mes'},{k:'last',l:'Mes ant.'}].map(p=>(
            <button key={p.k} onClick={()=>{
              const d=new Date()
              if(p.k==='today'){setDateFrom(today());setDateTo(today())}
              else if(p.k==='week'){const w=new Date(d);w.setDate(d.getDate()-7);setDateFrom(w.toISOString().split('T')[0]);setDateTo(today())}
              else if(p.k==='month'){setDateFrom(monthStart());setDateTo(today())}
              else{const lm=new Date(d.getFullYear(),d.getMonth()-1,1);const le=new Date(d.getFullYear(),d.getMonth(),0);setDateFrom(lm.toISOString().split('T')[0]);setDateTo(le.toISOString().split('T')[0])}
            }} style={{padding:'5px 10px',borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>
              {p.l}
            </button>
          ))}
          <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
          <span style={{fontSize:11,color:'var(--muted)'}}>ate</span>
          <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
          {orders.length>0&&<button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--card)',color:'var(--muted)',cursor:'pointer',fontSize:12}}><Download size={13}/>CSV</button>}
        </div>
      </div>

      {loading?<div style={{textAlign:'center',padding:64,color:'var(--muted)'}}>Carregando...</div>:orders.length===0?(
        <div style={{textAlign:'center',padding:80,color:'var(--muted)'}}><BarChart3 size={48} style={{opacity:0.3,marginBottom:16}}/><p style={{fontFamily:'Bangers,cursive',fontSize:20}}>NENHUMA VENDA NO PERIODO</p><p style={{fontSize:13,marginTop:8}}>Tente selecionar outro periodo ou aguarde as primeiras vendas.</p></div>
      ):(
        <>
          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:20}}>
            {[
              {l:'Total do periodo',v:fmt(total),c:'#00ff41',icon:TrendingUp},
              {l:'Pedidos',v:String(orders.length),c:'#06b6d4',icon:ShoppingCart},
              {l:'Ticket medio',v:fmt(avgTicket),c:'#7c3aed',icon:ShoppingCart},
              {l:'PDV',v:fmt(pdvTotal),c:'#f59e0b',icon:ShoppingCart},
              {l:'Delivery',v:fmt(delivTotal),c:'#10b981',icon:Truck},
            ].map((k,i)=>(
              <div key={i} className='card' style={{padding:'14px 16px'}}>
                <p style={{fontSize:20,fontWeight:700,color:k.c,fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p>
                <p style={{fontSize:11,color:'var(--muted)',marginTop:3}}>{k.l}</p>
              </div>
            ))}
          </div>

          {/* Daily chart */}
          {dailyArr.length>0&&(
            <div className='card' style={{padding:'18px 20px',marginBottom:16}}>
              <p style={{fontSize:14,fontWeight:600,color:'var(--white)',marginBottom:14}}>Faturamento por dia</p>
              <ResponsiveContainer width='100%' height={200}>
                <BarChart data={dailyArr} margin={{top:0,right:0,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray='3 3' stroke='rgba(255,255,255,0.05)'/>
                  <XAxis dataKey='day' tick={{fill:'#64748b',fontSize:11}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fill:'#64748b',fontSize:11}} tickLine={false} axisLine={false} tickFormatter={v=>v>=1000?(v/1000).toFixed(1)+'k':v}/>
                  <Tooltip contentStyle={tip} formatter={(v:any,n:string)=>[fmt(Number(v)),n==='pdv'?'PDV':n==='delivery'?'Delivery':'Total']}/>
                  <Bar dataKey='pdv' stackId='a' fill='#00ff41' name='pdv' radius={[0,0,0,0]} maxBarSize={40}/>
                  <Bar dataKey='delivery' stackId='a' fill='#06b6d4' name='delivery' radius={[4,4,0,0]} maxBarSize={40}/>
                </BarChart>
              </ResponsiveContainer>
              <div style={{display:'flex',gap:16,marginTop:8,justifyContent:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'var(--muted)'}}><div style={{width:10,height:10,borderRadius:2,background:'#00ff41'}}/>PDV</div>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'var(--muted)'}}><div style={{width:10,height:10,borderRadius:2,background:'#06b6d4'}}/>Delivery</div>
              </div>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            {/* Payment methods */}
            {payArr.length>0&&(
              <div className='card' style={{padding:'18px 20px'}}>
                <p style={{fontSize:14,fontWeight:600,color:'var(--white)',marginBottom:14}}>Formas de pagamento</p>
                <ResponsiveContainer width='100%' height={140}>
                  <PieChart>
                    <Pie data={payArr} cx='50%' cy='50%' innerRadius={35} outerRadius={60} dataKey='value' strokeWidth={0}>
                      {payArr.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={tip} formatter={(v:any)=>[fmt(Number(v))]}/>
                  </PieChart>
                </ResponsiveContainer>
                {payArr.map((p,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:12,padding:'4px 0',borderBottom:'1px solid rgba(26,46,26,0.4)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:2,background:COLORS[i%COLORS.length]}}/><span style={{color:'var(--muted)'}}>{p.name}</span></div>
                    <span style={{color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.value)}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Top products */}
            {topProds.length>0&&(
              <div className='card' style={{padding:'18px 20px'}}>
                <p style={{fontSize:14,fontWeight:600,color:'var(--white)',marginBottom:14}}>Produtos mais vendidos</p>
                {topProds.map((p,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'5px 0',borderBottom:'1px solid rgba(26,46,26,0.4)'}}>
                    <span style={{fontSize:11,color:'var(--neon)',minWidth:18,fontWeight:700}}>{i+1}.</span>
                    <span style={{flex:1,fontSize:12,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
                    <span style={{fontSize:11,color:'var(--muted)',minWidth:40,textAlign:'right'}}>{p.qty}un</span>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',minWidth:80,textAlign:'right'}}>{fmt(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Orders table */}
          <div className='card' style={{overflow:'hidden'}}>
            <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>Todas as vendas ({orders.length})</p>
            </div>
            <div style={{maxHeight:320,overflowY:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{borderBottom:'1px solid var(--border)',position:'sticky',top:0,background:'var(--card)'}}>
                  {['#','Data','Hora','Tipo','Cliente','Pagamento','Total'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {orders.slice().reverse().map(o=>(
                    <tr key={o.id} style={{borderBottom:'1px solid rgba(26,46,26,0.4)'}}>
                      <td style={{padding:'8px 12px',fontSize:12,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>#{o.order_number}</td>
                      <td style={{padding:'8px 12px',fontSize:12,color:'var(--muted)'}}>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                      <td style={{padding:'8px 12px',fontSize:12,color:'var(--muted)'}}>{new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
                      <td style={{padding:'8px 12px'}}><span style={{fontSize:11,padding:'2px 7px',borderRadius:6,background:o.type==='pdv'?'rgba(0,255,65,0.1)':'rgba(6,182,212,0.1)',color:o.type==='pdv'?'var(--neon)':'#06b6d4'}}>{o.type==='pdv'?'PDV':'Delivery'}</span></td>
                      <td style={{padding:'8px 12px',fontSize:12,color:'var(--text)'}}>{o.customer_name||' '}</td>
                      <td style={{padding:'8px 12px',fontSize:11,color:'var(--muted)'}}>{o.payment_method||'m ltiplo'}</td>
                      <td style={{padding:'8px 12px',fontSize:13,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(o.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}