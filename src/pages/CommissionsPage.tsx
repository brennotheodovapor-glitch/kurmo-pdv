import{useState,useEffect}from 'react'
import{Percent,TrendingUp,Download,ChevronDown,ChevronUp,User}from 'lucide-react'
import{supabase}from '@/lib/supabase'

type Seller={id:string;name:string;commission_pct:number;email:string}
type Order={id:string;order_number:number;total:number;created_at:string;status:string;type:string}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const todayStr=()=>new Date().toISOString().split('T')[0]
const monthStr=()=>new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split('T')[0]

export default function CommissionsPage(){
  const[sellers,setSellers]=useState<Seller[]>([])
  const[selectedSeller,setSelectedSeller]=useState<string>('all')
  const[orders,setOrders]=useState<Order[]>([])
  const[loading,setLoading]=useState(true)
  const[dateFrom,setDateFrom]=useState(monthStr())
  const[dateTo,setDateTo]=useState(todayStr())
  const[expanded,setExpanded]=useState(true)

  useEffect(()=>{loadSellers()},[]) 
  useEffect(()=>{loadOrders()},[selectedSeller,dateFrom,dateTo])

  async function loadSellers(){
    const{data}=await supabase.from('sellers').select('id,name,commission_pct,email').eq('active',true).order('name')
    setSellers(data||[])
  }

  async function loadOrders(){
    setLoading(true)
    let q=supabase.from('orders').select('id,order_number,total,created_at,status,type,seller_id')
      .in('status',['completed','delivered'])
      .gte('created_at',dateFrom+'T00:00:00')
      .lte('created_at',dateTo+'T23:59:59')
      .order('created_at',{ascending:false})
    if(selectedSeller!=='all') q=q.eq('seller_id',selectedSeller)
    const{data}=await q
    setOrders(data||[])
    setLoading(false)
  }

  // Compute stats for selected seller(s)
  function getSellerStats(sellerId:string){
    const sellerOrders=sellerId==='all'?orders:orders.filter(o=>(o as any).seller_id===sellerId)
    const seller=sellers.find(s=>s.id===sellerId)
    const pct=seller?.commission_pct||0
    const totalSales=sellerOrders.reduce((s,o)=>s+Number(o.total),0)
    const commission=totalSales*(pct/100)
    return{orders:sellerOrders,totalSales,commission,pct,count:sellerOrders.length}
  }

  function setPreset(p:string){
    const d=new Date()
    if(p==='today'){setDateFrom(todayStr());setDateTo(todayStr())}
    else if(p==='week'){const w=new Date(d);w.setDate(d.getDate()-7);setDateFrom(w.toISOString().split('T')[0]);setDateTo(todayStr())}
    else if(p==='month'){setDateFrom(monthStr());setDateTo(todayStr())}
    else if(p==='lastmonth'){const lm=new Date(d.getFullYear(),d.getMonth()-1,1);const le=new Date(d.getFullYear(),d.getMonth(),0);setDateFrom(lm.toISOString().split('T')[0]);setDateTo(le.toISOString().split('T')[0])}
  }

  function exportCSV(sellerId:string){
    const{orders:ords}=getSellerStats(sellerId)
    const seller=sellers.find(s=>s.id===sellerId)
    const rows=[['#','Data','Hora','Tipo','Total','Comissao']]
    ords.forEach(o=>{
      const pct=(seller?.commission_pct||0)/100
      rows.push([String(o.order_number),new Date(o.created_at).toLocaleDateString('pt-BR'),new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),o.type==='pdv'?'PDV':'Delivery',Number(o.total).toFixed(2),(Number(o.total)*pct).toFixed(2)])
    })
    const csv=rows.map(r=>r.join(';')).join('\n')
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='comissoes-'+(seller?.name||'todos')+'.csv';a.click()
  }

  const sellerList=selectedSeller==='all'?sellers:[sellers.find(s=>s.id===selectedSeller)].filter(Boolean) as Seller[]

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>

      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <Percent size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>COMISSOES</h1>
      </div>

      {/* Filters */}
      <div style={{padding:'10px 20px',borderBottom:'1px solid var(--border)',background:'var(--card)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        {/* Seller selector */}
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <User size={14} color='var(--muted)'/>
          <select value={selectedSeller} onChange={e=>setSelectedSeller(e.target.value)} style={{fontSize:13,padding:'6px 10px',minWidth:160}}>
            <option value='all'>Todos os vendedores</option>
            {sellers.map(s=>(<option key={s.id} value={s.id}>{s.name} ({s.commission_pct}%)</option>))}
          </select>
        </div>
        <div style={{width:1,height:24,background:'var(--border)'}}/>
        {[{k:'today',l:'Hoje'},{k:'week',l:'7 dias'},{k:'month',l:'Este mes'},{k:'lastmonth',l:'Mes anterior'}].map(p=>(
          <button key={p.k} onClick={()=>setPreset(p.k)} style={{padding:'5px 10px',borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>{p.l}</button>
        ))}
        <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
        <span style={{fontSize:11,color:'var(--muted)'}}>ate</span>
        <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {sellers.length===0?(
          <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}><User size={48} style={{opacity:0.3,marginBottom:16}}/><p style={{fontFamily:'Bangers,cursive',fontSize:18}}>NENHUM VENDEDOR CADASTRADO</p><p style={{fontSize:13,marginTop:8}}>Cadastre vendedores na aba Vendedores para ver as comissoes.</p></div>
        ):loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:(
          sellerList.map(seller=>{ 
            const stats=getSellerStats(seller.id)
            const isExpanded=expanded||sellerList.length===1
            return(
              <div key={seller.id} className='card' style={{marginBottom:16,overflow:'hidden'}}>
                {/* Seller header */}
                <div onClick={()=>setExpanded(!expanded)} style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:14,cursor:sellerList.length>1?'pointer':'default',flexWrap:'wrap'}}>
                  <div style={{width:42,height:42,borderRadius:12,background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <User size={20} color='var(--neon)'/>
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:15,fontWeight:700,color:'var(--white)'}}>{seller.name}</p>
                    <p style={{fontSize:12,color:'var(--muted)'}}>Comissao: {seller.commission_pct}% | {seller.email||'Sem email'}</p>
                  </div>
                  {/* KPIs */}
                  <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                    <div style={{textAlign:'center'}}>
                      <p style={{fontSize:18,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(stats.totalSales)}</p>
                      <p style={{fontSize:10,color:'var(--muted)'}}>Total vendido</p>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <p style={{fontSize:18,fontWeight:700,color:'#f59e0b',fontFamily:'JetBrains Mono,monospace'}}>{fmt(stats.commission)}</p>
                      <p style={{fontSize:10,color:'var(--muted)'}}>Comissao ({stats.pct}%)</p>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <p style={{fontSize:18,fontWeight:700,color:'var(--white)'}}>{stats.count}</p>
                      <p style={{fontSize:10,color:'var(--muted)'}}>Vendas</p>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    {stats.count>0&&<button onClick={e=>{e.stopPropagation();exportCSV(seller.id)}} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--muted)',cursor:'pointer',fontSize:12}}><Download size={12}/>CSV</button>}
                    {sellerList.length>1&&(isExpanded?<ChevronUp size={16} color='var(--muted)'/>:<ChevronDown size={16} color='var(--muted)'/>)}
                  </div>
                </div>

                {/* Orders list */}
                {(isExpanded||sellerList.length===1)&&(
                  <div style={{borderTop:'1px solid var(--border)'}}>
                    {stats.orders.length===0?(
                      <div style={{padding:'24px',textAlign:'center',color:'var(--muted)',fontSize:13}}>Nenhuma venda no periodo selecionado</div>
                    ):(
                      <>
                        <div style={{maxHeight:320,overflowY:'auto'}}>
                          <table style={{width:'100%',borderCollapse:'collapse'}}>
                            <thead><tr style={{borderBottom:'1px solid var(--border)',background:'var(--surface)',position:'sticky',top:0}}>
                              {['#','Data','Hora','Tipo','Total','Comissao'].map(h=>(
                                <th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>
                              {stats.orders.map(o=>(
                                <tr key={o.id} style={{borderBottom:'1px solid rgba(26,46,26,0.4)'}}>
                                  <td style={{padding:'8px 14px',fontSize:12,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>#{o.order_number}</td>
                                  <td style={{padding:'8px 14px',fontSize:12,color:'var(--muted)'}}>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                                  <td style={{padding:'8px 14px',fontSize:12,color:'var(--muted)'}}>{new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
                                  <td style={{padding:'8px 14px'}}><span style={{fontSize:11,padding:'2px 7px',borderRadius:6,background:o.type==='pdv'?'rgba(0,255,65,0.1)':'rgba(6,182,212,0.1)',color:o.type==='pdv'?'var(--neon)':'#06b6d4'}}>{o.type==='pdv'?'PDV':'Delivery'}</span></td>
                                  <td style={{padding:'8px 14px',fontSize:12,fontWeight:600,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(o.total))}</td>
                                  <td style={{padding:'8px 14px',fontSize:12,fontWeight:700,color:'#f59e0b',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(o.total)*(stats.pct/100))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div style={{padding:'12px 14px',borderTop:'1px solid var(--border)',background:'var(--surface)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontSize:13,color:'var(--muted)'}}>Total do periodo</span>
                          <div style={{display:'flex',gap:24}}>
                            <div style={{textAlign:'right'}}><p style={{fontSize:14,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(stats.totalSales)}</p><p style={{fontSize:10,color:'var(--muted)'}}>vendido</p></div>
                            <div style={{textAlign:'right'}}><p style={{fontSize:14,fontWeight:700,color:'#f59e0b',fontFamily:'JetBrains Mono,monospace'}}>{fmt(stats.commission)}</p><p style={{fontSize:10,color:'var(--muted)'}}>comissao ({stats.pct}%)</p></div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}