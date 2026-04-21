import{useState,useEffect}from 'react'
import{BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,PieChart,Pie,Cell}from 'recharts'
import{BarChart3,Calendar,TrendingUp,ShoppingCart,Truck,Download,Package,AlertTriangle}from 'lucide-react'
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
  const[products,setProducts]=useState<any[]>([])

  useEffect(()=>{load()},[dateFrom,dateTo])

  async function load(){
    setLoading(true)
    const[o,p,prods]=await Promise.all([
      supabase.from('orders').select('*').in('status',['completed','delivered']).gte('created_at',dateFrom+'T00:00:00').lte('created_at',dateTo+'T23:59:59').order('created_at',{ascending:true}),
      supabase.from('order_payments').select('*'),
      supabase.from('products').select('id,name,price,cost_price,stock,active,has_sizes').eq('active',true)
    ])
    const ords=o.data||[]
    setOrders(ords)
    setPayments(p.data||[])
    // Load variants to calculate real stock for has_sizes products
    const{data:varData}=await supabase.from('product_variants').select('product_id,stock,name').eq('active',true)
    const varMap:Record<string,number>={}
    const varSeen:Record<string,Set<string>>={}
    ;(varData||[]).forEach((v:any)=>{
      if(!varSeen[v.product_id])varSeen[v.product_id]=new Set()
      if(!varSeen[v.product_id].has(v.name)){
        varSeen[v.product_id].add(v.name)
        varMap[v.product_id]=(varMap[v.product_id]||0)+(v.stock||0)
      }
    })
    const enrichedProds=(prods.data||[]).map((pr:any)=>
      pr.has_sizes?{...pr,stock:varMap[pr.id]||0}:pr
    )
    setProducts(enrichedProds)
    if(ords.length>0){
      const ids=ords.map((x:any)=>x.id)
      const{data:it}=await supabase.from('order_items').select('*').in('order_id',ids)
      setItems(it||[])
    }else{setItems([])}
    setLoading(false)
  }

  const total=orders.reduce((s,o)=>s+Number(o.total),0)
  const pdvTotal=orders.filter(o=>o.type==='pdv').reduce((s,o)=>s+Number(o.total),0)
  const delivTotal=orders.filter(o=>o.type==='delivery').reduce((s,o)=>s+Number(o.total),0)
  const avgTicket=orders.length?total/orders.length:0

  const byDay:Record<string,{day:string;total:number;pdv:number;delivery:number;n:number}>={} 
  orders.forEach(o=>{
    const d=new Date(o.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})
    if(!byDay[d])byDay[d]={day:d,total:0,pdv:0,delivery:0,n:0}
    byDay[d].total+=Number(o.total);byDay[d].n++
    if(o.type==='pdv')byDay[d].pdv+=Number(o.total)
    else byDay[d].delivery+=Number(o.total)
  })
  const dailyArr=Object.values(byDay)

  const ordIds=new Set(orders.map(o=>o.id))
  const payMap:Record<string,number>={}
  payments.filter(p=>ordIds.has(p.order_id)).forEach(p=>{
    const l=p.method==='pix'?'PIX':p.method==='dinheiro'?'Dinheiro':p.method==='debito'?'Debito':'Credito'
    payMap[l]=(payMap[l]||0)+Number(p.amount)
  })
  const payArr=Object.entries(payMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)

  const prodMap:Record<string,{name:string;qty:number;revenue:number}>={} 
  items.forEach(i=>{
    if(!prodMap[i.product_name])prodMap[i.product_name]={name:i.product_name,qty:0,revenue:0}
    prodMap[i.product_name].qty+=i.quantity
    prodMap[i.product_name].revenue+=Number(i.total_price)
  })
  const topProds=Object.values(prodMap).sort((a,b)=>b.revenue-a.revenue).slice(0,10)

  // Stock calculations
  const totalUnits=products.reduce((s,p)=>s+Number(p.stock),0)
  const totalCost=products.reduce((s,p)=>s+(Number(p.cost_price)||0)*Number(p.stock),0)
  const totalSaleValue=products.reduce((s,p)=>s+Number(p.price)*Number(p.stock),0)
  const totalProfit=totalSaleValue-totalCost
  const marginPct=totalSaleValue>0?(totalProfit/totalSaleValue*100):0
  const lowStock=products.filter(p=>p.stock<=5&&p.stock>0)
  const outStock=products.filter(p=>p.stock===0)

  function exportCSV(){
    const rows=[['#','Data','Hora','Tipo','Cliente','Total','Status']]
    orders.forEach(o=>rows.push([o.order_number,new Date(o.created_at).toLocaleDateString('pt-BR'),new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),o.type==='pdv'?'PDV':'Delivery',o.customer_name||'Avulso',Number(o.total).toFixed(2),o.status]))
    const csv=rows.map(r=>r.join(';')).join('\n')
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='relatorio.csv';a.click()
  }

  const tip={background:'#111811',border:'1px solid var(--border)',borderRadius:8,color:'var(--white)',fontSize:12}

  return(
    <div style={{height:'100%',overflowY:'auto',padding:'16px 20px',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <BarChart3 size={22} color='var(--neon)'/>
          <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>RELATÓRIOS</h1>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <Calendar size={13} color='var(--muted)'/>
          {[{k:'today',l:'Hoje'},{k:'week',l:'7 dias'},{k:'month',l:'Este mês'},{k:'last',l:'Mês ant.'}].map(p=>(
            <button key={p.k} onClick={()=>{
              const d=new Date()
              if(p.k==='today'){setDateFrom(today());setDateTo(today())}
              else if(p.k==='week'){const w=new Date(d);w.setDate(d.getDate()-7);setDateFrom(w.toISOString().split('T')[0]);setDateTo(today())}
              else if(p.k==='month'){setDateFrom(monthStart());setDateTo(today())}
              else{const lm=new Date(d.getFullYear(),d.getMonth()-1,1);const le=new Date(d.getFullYear(),d.getMonth(),0);setDateFrom(lm.toISOString().split('T')[0]);setDateTo(le.toISOString().split('T')[0])}
            }} style={{padding:'5px 10px',borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>{p.l}</button>
          ))}
          <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
          <span style={{fontSize:11,color:'var(--muted)'}}>até</span>
          <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
          {orders.length>0&&<button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--card)',color:'var(--muted)',cursor:'pointer',fontSize:12}}><Download size={13}/>CSV</button>}
        </div>
      </div>

      {/* ESTOQUE — sempre visível independente do período */}
      {products.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <Package size={15} color='#06b6d4'/>
            <p style={{fontSize:14,fontWeight:700,color:'#06b6d4',letterSpacing:0.5,fontFamily:'Bangers,cursive'}}>ESTOQUE ATUAL</p>
          </div>
          {/* Stock KPI cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:10,marginBottom:10}}>
            <div className='card' style={{padding:'14px 16px',borderLeft:'3px solid #06b6d4'}}>
              <p style={{fontSize:11,color:'var(--muted)',marginBottom:4,letterSpacing:0.5}}>UNIDADES EM ESTOQUE</p>
              <p style={{fontSize:26,fontWeight:700,color:'#06b6d4',fontFamily:'JetBrains Mono,monospace',lineHeight:1}}>{totalUnits.toLocaleString('pt-BR')}</p>
              <p style={{fontSize:10,color:'var(--muted)',marginTop:4}}>{products.length} produto(s) ativo(s)</p>
            </div>
            <div className='card' style={{padding:'14px 16px',borderLeft:'3px solid #ff3333'}}>
              <p style={{fontSize:11,color:'var(--muted)',marginBottom:4,letterSpacing:0.5}}>CUSTO TOTAL ESTOQUE</p>
              <p style={{fontSize:18,fontWeight:700,color:'#ff3333',fontFamily:'JetBrains Mono,monospace',lineHeight:1}}>{fmt(totalCost)}</p>
              <p style={{fontSize:10,color:'var(--muted)',marginTop:4}}>Valor investido</p>
            </div>
            <div className='card' style={{padding:'14px 16px',borderLeft:'3px solid var(--neon)'}}>
              <p style={{fontSize:11,color:'var(--muted)',marginBottom:4,letterSpacing:0.5}}>VALOR DE VENDA</p>
              <p style={{fontSize:18,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',lineHeight:1}}>{fmt(totalSaleValue)}</p>
              <p style={{fontSize:10,color:'var(--muted)',marginTop:4}}>Se vender tudo</p>
            </div>
            <div className='card' style={{padding:'14px 16px',borderLeft:'3px solid #10b981'}}>
              <p style={{fontSize:11,color:'var(--muted)',marginBottom:4,letterSpacing:0.5}}>LUCRO POTENCIAL</p>
              <p style={{fontSize:18,fontWeight:700,color:'#10b981',fontFamily:'JetBrains Mono,monospace',lineHeight:1}}>{fmt(totalProfit)}</p>
              <p style={{fontSize:10,color:'var(--muted)',marginTop:4}}>{marginPct.toFixed(1)}% de margem</p>
            </div>
          </div>

          {/* Alertas */}
          {(outStock.length>0||lowStock.length>0)&&(
            <div style={{padding:'10px 14px',background:'rgba(255,170,0,0.06)',borderRadius:10,border:'1px solid rgba(255,170,0,0.2)',display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-start',marginBottom:10}}>
              <AlertTriangle size={14} color='#ffaa00' style={{flexShrink:0,marginTop:2}}/>
              <div>
                {outStock.length>0&&<p style={{fontSize:12,color:'#ff3333',marginBottom:2,fontWeight:600}}>⚠️ {outStock.length} sem estoque: {outStock.map(p=>p.name).join(', ')}</p>}
                {lowStock.length>0&&<p style={{fontSize:12,color:'#ffaa00'}}>⚡ {lowStock.length} com estoque baixo: {lowStock.map(p=>p.name+' ('+p.stock+')').join(', ')}</p>}
              </div>
            </div>
          )}

          {/* Per product table */}
          <div className='card' style={{overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid var(--border)',background:'var(--surface)'}}>
                {['PRODUTO','ESTQ','CUSTO UNIT','VENDA UNIT','CUSTO TOTAL','VENDA TOTAL','MARGEM'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:h==='PRODUTO'?'left':'right',fontSize:10,color:'var(--muted)',fontWeight:600,letterSpacing:0.5}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...products].sort((a,b)=>Number(b.stock)*Number(b.price)-Number(a.stock)*Number(a.price)).map(p=>{
                  const margin=p.price>0?((p.price-(p.cost_price||0))/p.price*100):0
                  const costTotal=(Number(p.cost_price)||0)*Number(p.stock)
                  const saleTotal=Number(p.price)*Number(p.stock)
                  return(
                    <tr key={p.id} style={{borderBottom:'1px solid rgba(26,46,26,0.4)',opacity:p.stock===0?0.5:1}}>
                      <td style={{padding:'8px 12px',fontSize:13,color:p.stock===0?'#ff5555':p.stock<=5?'#ffaa00':'var(--white)',fontWeight:600}}>{p.name}{p.stock===0?' ⚠️':p.stock<=5?' ⚡':''}</td>
                      <td style={{padding:'8px 12px',textAlign:'right',fontSize:13,fontWeight:700,color:p.stock===0?'#ff3333':p.stock<=5?'#ffaa00':'var(--text)'}}>{p.stock}</td>
                      <td style={{padding:'8px 12px',textAlign:'right',fontSize:12,color:'var(--muted)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(p.cost_price)||0)}</td>
                      <td style={{padding:'8px 12px',textAlign:'right',fontSize:12,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(p.price))}</td>
                      <td style={{padding:'8px 12px',textAlign:'right',fontSize:12,color:'#ff5555',fontFamily:'JetBrains Mono,monospace'}}>{fmt(costTotal)}</td>
                      <td style={{padding:'8px 12px',textAlign:'right',fontSize:12,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>{fmt(saleTotal)}</td>
                      <td style={{padding:'8px 12px',textAlign:'right'}}>
                        <span style={{fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:20,background:margin>=40?'rgba(0,255,65,0.1)':margin>=25?'rgba(255,170,0,0.1)':'rgba(255,51,51,0.1)',color:margin>=40?'var(--neon)':margin>=25?'#ffaa00':'#ff3333'}}>{margin.toFixed(0)}%</span>
                      </td>
                    </tr>
                  )
                })}
                {/* TOTALS ROW */}
                <tr style={{borderTop:'2px solid var(--border)',background:'var(--surface)'}}>
                  <td style={{padding:'10px 12px',fontSize:12,fontWeight:700,color:'var(--white)'}}>TOTAL</td>
                  <td style={{padding:'10px 12px',textAlign:'right',fontSize:13,fontWeight:700,color:'#06b6d4'}}>{totalUnits}</td>
                  <td colSpan={2}></td>
                  <td style={{padding:'10px 12px',textAlign:'right',fontSize:13,fontWeight:700,color:'#ff3333',fontFamily:'JetBrains Mono,monospace'}}>{fmt(totalCost)}</td>
                  <td style={{padding:'10px 12px',textAlign:'right',fontSize:13,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(totalSaleValue)}</td>
                  <td style={{padding:'10px 12px',textAlign:'right'}}>
                    <span style={{fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:20,background:'rgba(16,185,129,0.1)',color:'#10b981'}}>{marginPct.toFixed(0)}%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VENDAS do período */}
      {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:orders.length===0?(
        <div style={{textAlign:'center',padding:60,color:'var(--muted)'}}><BarChart3 size={40} style={{opacity:0.3,marginBottom:12}}/><p style={{fontFamily:'Bangers,cursive',fontSize:18}}>NENHUMA VENDA NO PERÍODO</p></div>
      ):(
        <>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <TrendingUp size={15} color='var(--neon)'/>
            <p style={{fontSize:14,fontWeight:700,color:'var(--neon)',letterSpacing:0.5,fontFamily:'Bangers,cursive'}}>VENDAS DO PERÍODO</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:10,marginBottom:16}}>
            {[
              {l:'Total do período',v:fmt(total),c:'#00ff41'},
              {l:'Pedidos',v:String(orders.length),c:'#06b6d4'},
              {l:'Ticket médio',v:fmt(avgTicket),c:'#7c3aed'},
              {l:'PDV',v:fmt(pdvTotal),c:'#f59e0b'},
              {l:'Delivery',v:fmt(delivTotal),c:'#10b981'},
            ].map((k,i)=>(
              <div key={i} className='card' style={{padding:'14px 16px'}}>
                <p style={{fontSize:18,fontWeight:700,color:k.c,fontFamily:'JetBrains Mono,monospace',lineHeight:1}}>{k.v}</p>
                <p style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{k.l}</p>
              </div>
            ))}
          </div>
          {dailyArr.length>0&&(
            <div className='card' style={{padding:'16px 18px',marginBottom:16}}>
              <p style={{fontSize:13,fontWeight:600,color:'var(--white)',marginBottom:12}}>Faturamento por dia</p>
              <ResponsiveContainer width='100%' height={180}>
                <BarChart data={dailyArr} margin={{top:0,right:0,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray='3 3' stroke='rgba(255,255,255,0.05)'/>
                  <XAxis dataKey='day' tick={{fill:'#64748b',fontSize:11}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fill:'#64748b',fontSize:11}} tickLine={false} axisLine={false} tickFormatter={v=>v>=1000?(v/1000).toFixed(1)+'k':String(v)}/>
                  <Tooltip contentStyle={tip} formatter={(v:any,n:string)=>[fmt(Number(v)),n==='pdv'?'PDV':'Delivery']}/>
                  <Bar dataKey='pdv' stackId='a' fill='#00ff41' name='pdv' maxBarSize={40}/>
                  <Bar dataKey='delivery' stackId='a' fill='#06b6d4' name='delivery' radius={[4,4,0,0]} maxBarSize={40}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
            {payArr.length>0&&(
              <div className='card' style={{padding:'16px 18px'}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--white)',marginBottom:12}}>Pagamentos</p>
                <ResponsiveContainer width='100%' height={120}><PieChart><Pie data={payArr} cx='50%' cy='50%' innerRadius={28} outerRadius={52} dataKey='value' strokeWidth={0}>{payArr.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={tip} formatter={(v:any)=>[fmt(Number(v))]}/></PieChart></ResponsiveContainer>
                {payArr.map((p,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'4px 0',borderBottom:'1px solid rgba(26,46,26,0.4)'}}><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:2,background:COLORS[i%COLORS.length]}}/><span style={{color:'var(--muted)'}}>{p.name}</span></div><span style={{color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.value)}</span></div>))}
              </div>
            )}
            {topProds.length>0&&(
              <div className='card' style={{padding:'16px 18px'}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--white)',marginBottom:12}}>Mais vendidos</p>
                {topProds.map((p,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:'1px solid rgba(26,46,26,0.4)'}}><span style={{fontSize:11,color:'var(--neon)',minWidth:16,fontWeight:700}}>{i+1}.</span><span style={{flex:1,fontSize:12,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span><span style={{fontSize:11,color:'var(--muted)',minWidth:36,textAlign:'right'}}>{p.qty}un</span><span style={{fontSize:12,fontWeight:600,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',minWidth:75,textAlign:'right'}}>{fmt(p.revenue)}</span></div>))}
              </div>
            )}
          </div>
          <div className='card' style={{overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>Vendas ({orders.length})</p>
              {orders.length>0&&<button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:7,border:'1px solid var(--border)',background:'var(--card)',color:'var(--muted)',cursor:'pointer',fontSize:11}}><Download size={11}/>CSV</button>}
            </div>
            <div style={{maxHeight:300,overflowY:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{borderBottom:'1px solid var(--border)',position:'sticky',top:0,background:'var(--card)'}}>
                  {['#','Data','Tipo','Cliente','Total'].map(h=>(<th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:10,color:'var(--muted)',fontWeight:600}}>{h}</th>))}
                </tr></thead>
                <tbody>
                  {orders.slice().reverse().map(o=>(
                    <tr key={o.id} style={{borderBottom:'1px solid rgba(26,46,26,0.4)'}}>
                      <td style={{padding:'7px 12px',fontSize:12,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>#{o.order_number}</td>
                      <td style={{padding:'7px 12px',fontSize:12,color:'var(--muted)'}}>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                      <td style={{padding:'7px 12px'}}><span style={{fontSize:10,padding:'2px 6px',borderRadius:5,background:o.type==='pdv'?'rgba(0,255,65,0.1)':'rgba(6,182,212,0.1)',color:o.type==='pdv'?'var(--neon)':'#06b6d4'}}>{o.type==='pdv'?'PDV':'Delivery'}</span></td>
                      <td style={{padding:'7px 12px',fontSize:12,color:'var(--text)'}}>{o.customer_name||'—'}</td>
                      <td style={{padding:'7px 12px',fontSize:13,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(o.total))}</td>
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