import{useState,useEffect}from 'react'
import{History,Search,ChevronDown,ChevronUp,X,Calendar,Filter}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Order={id:string;order_number:number;customer_name:string;status:string;total:number;type:string;payment_method:string|null;seller_id:string|null;created_at:string;cancel_reason:string|null}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const STATUS_COLOR:Record<string,string>={pending:'#ffaa00',accepted:'#06b6d4',completed:'#00ff41',cancelled:'#ff3333',delivered:'#10b981'}
const STATUS_LABEL:Record<string,string>={pending:'Pendente',accepted:'Aceito',preparing:'Preparando',ready:'Pronto',delivering:'A caminho',delivered:'Entregue',completed:'Concluido',cancelled:'Cancelado'}
const PAY_LABEL:Record<string,string>={pix:'PIX',dinheiro:'Dinheiro',debito:'Debito',credito:'Credito'}

const today=()=>new Date().toISOString().split('T')[0]
const weekAgo=()=>{const d=new Date();d.setDate(d.getDate()-7);return d.toISOString().split('T')[0]}

export default function HistoryPage({sellerId}:{sellerId?:string|null}){
  const[orders,setOrders]=useState<Order[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[expanded,setExpanded]=useState<string|null>(null)
  const[itemsCache,setItemsCache]=useState<Record<string,any[]>>({})
  // Filters
  const[dateFrom,setDateFrom]=useState(today())
  const[dateTo,setDateTo]=useState(today())
  const[statusF,setStatusF]=useState('all')
  const[typeF,setTypeF]=useState('all')
  const[cancelModal,setCancelModal]=useState<Order|null>(null)
  const[cancelReason,setCancelReason]=useState('')

  useEffect(()=>{loadOrders()},[dateFrom,dateTo])

  async function loadOrders(){
    setLoading(true)
    let q=supabase.from('orders').select('*')
      .gte('created_at',dateFrom+'T00:00:00')
      .lte('created_at',dateTo+'T23:59:59')
      .order('created_at',{ascending:false})
    if(sellerId)q=q.eq('seller_id',sellerId)
    const{data}=await q
    setOrders(data||[])
    setLoading(false)
  }

  async function expandOrder(id:string){
    if(expanded===id){setExpanded(null);return}
    setExpanded(id)
    if(!itemsCache[id]){
      const{data}=await supabase.from('order_items').select('*').eq('order_id',id)
      setItemsCache(c=>({...c,[id]:data||[]}))
    }
  }

  async function cancelOrder(){
    if(!cancelModal||!cancelReason.trim()){toast.error('Informe o motivo');return}
    const{error}=await supabase.from('orders').update({status:'cancelled',cancel_reason:cancelReason,cancelled_at:new Date().toISOString()}).eq('id',cancelModal.id)
    if(error){toast.error(error.message);return}
    toast.success('Cancelado')
    setCancelModal(null);setCancelReason('');loadOrders()
  }

  function setPreset(p:string){
    const d=new Date()
    if(p==='today'){setDateFrom(today());setDateTo(today())}
    else if(p==='yesterday'){const y=new Date(d);y.setDate(d.getDate()-1);const s=y.toISOString().split('T')[0];setDateFrom(s);setDateTo(s)}
    else if(p==='week'){setDateFrom(weekAgo());setDateTo(today())}
    else if(p==='month'){const m=new Date(d.getFullYear(),d.getMonth(),1).toISOString().split('T')[0];setDateFrom(m);setDateTo(today())}
  }

  const filtered=orders.filter(o=>{
    if(statusF!=='all'&&o.status!==statusF)return false
    if(typeF!=='all'&&o.type!==typeF)return false
    if(search&&!(o.customer_name||'').toLowerCase().includes(search.toLowerCase())&&!String(o.order_number).includes(search))return false
    return true
  })

  const totalVendas=filtered.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+Number(o.total),0)
  const qtdVendas=filtered.filter(o=>o.status!=='cancelled').length
  const qtdCancel=filtered.filter(o=>o.status==='cancelled').length

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>

      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <History size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>HISTORICO</h1>
        <div style={{position:'relative',maxWidth:220,flex:1}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar cliente ou #...' style={{paddingLeft:28,fontSize:13}}/>
        </div>
      </div>

      {/* Date filter bar */}
      <div style={{padding:'10px 20px',borderBottom:'1px solid var(--border)',background:'var(--card)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <Calendar size={14} color='var(--muted)'/>
        {/* Presets */}
        <div style={{display:'flex',gap:5}}>
          {[{k:'today',l:'Hoje'},{k:'yesterday',l:'Ontem'},{k:'week',l:'7 dias'},{k:'month',l:'Este mes'}].map(p=>(
            <button key={p.k} onClick={()=>setPreset(p.k)} style={{padding:'5px 10px',borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',letterSpacing:'0.03em',whiteSpace:'nowrap'}}>{p.l}</button>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginLeft:8}}>
          <span style={{fontSize:11,color:'var(--muted)'}}>De</span>
          <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
          <span style={{fontSize:11,color:'var(--muted)'}}>Ate</span>
          <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
        </div>
        <div style={{display:'flex',gap:5,marginLeft:'auto'}}>
          {['all','pdv','delivery'].map(t=>(
            <button key={t} onClick={()=>setTypeF(t)} style={{padding:'4px 9px',borderRadius:6,border:typeF===t?'1px solid var(--neon)':'1px solid var(--border)',background:typeF===t?'var(--neon-glow)':'transparent',color:typeF===t?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>
              {t==='all'?'Todos':t.toUpperCase()}
            </button>
          ))}
          {['all','completed','cancelled'].map(s=>(
            <button key={s} onClick={()=>setStatusF(s)} style={{padding:'4px 9px',borderRadius:6,border:statusF===s?'1px solid var(--neon)':'1px solid var(--border)',background:statusF===s?'var(--neon-glow)':'transparent',color:statusF===s?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>
              {s==='all'?'Tudo':s==='completed'?'Concluidas':'Canceladas'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <div style={{padding:'8px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',gap:20,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:11,color:'var(--muted)'}}>Total:</span><span style={{fontSize:14,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(totalVendas)}</span></div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:11,color:'var(--muted)'}}>Vendas:</span><span style={{fontSize:14,fontWeight:700,color:'var(--white)'}}>{qtdVendas}</span></div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:11,color:'var(--muted)'}}>Canceladas:</span><span style={{fontSize:14,fontWeight:700,color:'#ff3333'}}>{qtdCancel}</span></div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:11,color:'var(--muted)'}}>Ticket medio:</span><span style={{fontSize:14,fontWeight:700,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{qtdVendas>0?fmt(totalVendas/qtdVendas):'—'}</span></div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        filtered.length===0?(
          <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}>
            <History size={40} style={{opacity:0.3,marginBottom:12}}/>
            <p style={{fontFamily:'Bangers,cursive',fontSize:18}}>NENHUMA VENDA NO PERIODO</p>
          </div>
        ):filtered.map(o=>(
          <div key={o.id} className='card' style={{marginBottom:8,overflow:'hidden',borderLeft:'3px solid '+(STATUS_COLOR[o.status]||'var(--border)')+(o.status==='cancelled'?'':'')}}>
            <div onClick={()=>expandOrder(o.id)} style={{padding:'10px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',flexWrap:'wrap'}}>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--neon)',minWidth:34}}>#{o.order_number}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.customer_name||'Cliente Avulso'}</p>
                <div style={{display:'flex',gap:8,marginTop:2,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,color:'var(--muted)'}}>{new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
                  <span style={{fontSize:11,color:'var(--muted)',background:'var(--surface)',padding:'1px 6px',borderRadius:4}}>{o.type==='delivery'?'Delivery':'PDV'}</span>
                  {o.payment_method&&<span style={{fontSize:11,color:'var(--muted)'}}>{PAY_LABEL[o.payment_method]||o.payment_method}</span>}
                </div>
              </div>
              <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:(STATUS_COLOR[o.status]||'#888')+'20',color:STATUS_COLOR[o.status]||'#888',whiteSpace:'nowrap'}}>{STATUS_LABEL[o.status]||o.status}</span>
              <span style={{fontSize:14,fontWeight:700,color:o.status==='cancelled'?'#ff3333':'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(o.total))}</span>
              {expanded===o.id?<ChevronUp size={13} color='var(--muted)'/>:<ChevronDown size={13} color='var(--muted)'/>}
            </div>
            {expanded===o.id&&(
              <div style={{padding:'0 16px 12px',borderTop:'1px solid var(--border)'}}>
                {o.cancel_reason&&<div style={{padding:'6px 10px',background:'rgba(255,51,51,0.06)',borderRadius:7,marginBottom:8,fontSize:12,color:'#ff8888'}}><strong>Motivo cancelamento:</strong> {o.cancel_reason}</div>}
                <div style={{marginBottom:8}}>
                  {(itemsCache[o.id]||[]).map(i=>(
                    <div key={i.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'2px 0'}}>
                      <span style={{color:'var(--text)'}}>{i.quantity}x {i.product_name}</span>
                      <span style={{color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(i.total_price)}</span>
                    </div>
                  ))}
                </div>
                {!['cancelled','completed','delivered'].includes(o.status)&&(
                  <button onClick={()=>{setCancelModal(o);setCancelReason('')}} style={{padding:'6px 14px',borderRadius:7,border:'1px solid #ff3333',background:'rgba(255,51,51,0.08)',color:'#ff3333',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>
                    CANCELAR VENDA
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {cancelModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:420,padding:24,border:'2px solid #ff3333'}}>
            <h2 className='font-bangers' style={{fontSize:20,color:'#ff3333',marginBottom:14}}>CANCELAR VENDA #{cancelModal.order_number}</h2>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>MOTIVO *</label>
              <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder='Informe o motivo...' rows={3} autoFocus style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',color:'var(--text)',fontSize:13,resize:'none',outline:'none',boxSizing:'border-box' as const}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:14}}>
              {['Erro no pedido','Produto em falta','Solicitacao do cliente','Teste'].map(r=>(
                <button key={r} onClick={()=>setCancelReason(r)} style={{padding:'6px 10px',borderRadius:7,border:cancelReason===r?'1px solid #ff3333':'1px solid var(--border)',background:cancelReason===r?'rgba(255,51,51,0.1)':'transparent',color:cancelReason===r?'#ff3333':'var(--muted)',cursor:'pointer',fontSize:11,textAlign:'left'}}>{r}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setCancelModal(null)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>VOLTAR</button>
              <button onClick={cancelOrder} style={{flex:2,padding:10,borderRadius:8,border:'none',background:'#ff3333',color:'white',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15}}>CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}