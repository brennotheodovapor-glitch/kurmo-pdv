import { useState, useEffect } from 'react'
import { History, Search, X, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Order = {id:string;order_number:number;seller_id:string|null;customer_name:string|null;type:string;status:string;subtotal:number;discount:number;total:number;created_at:string;cancel_reason:string|null;sellers?:{name:string}|null}
const fmt = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function HistoryPage() {
  const [orders,setOrders] = useState<Order[]>([])
  const [loading,setLoading] = useState(true)
  const [search,setSearch] = useState('')
  const [expanded,setExpanded] = useState<string|null>(null)
  const [cancelModal,setCancelModal] = useState<Order|null>(null)
  const [cancelReason,setCancelReason] = useState('')
  const [itemsCache,setItemsCache] = useState<Record<string,any[]>>({})
  const [paymentsCache,setPaymentsCache] = useState<Record<string,any[]>>({})

  useEffect(()=>{loadOrders()},[])

  async function loadOrders() {
    setLoading(true)
    const {data} = await supabase.from('orders').select('*,sellers(name)').order('created_at',{ascending:false}).limit(300)
    setOrders(data||[]); setLoading(false)
  }

  async function expandOrder(id:string) {
    if(expanded===id){setExpanded(null);return}
    setExpanded(id)
    if(!itemsCache[id]) {
      const [{data:items},{data:payments}] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id',id),
        supabase.from('order_payments').select('*').eq('order_id',id)
      ])
      setItemsCache(c=>({...c,[id]:items||[]}))
      setPaymentsCache(c=>({...c,[id]:payments||[]}))
    }
  }

  async function cancelOrder() {
    if(!cancelModal) return
    if(!cancelReason.trim()){toast.error('Informe o motivo do cancelamento');return}
    const {error} = await supabase.from('orders').update({status:'cancelled',cancel_reason:cancelReason,cancelled_at:new Date().toISOString()}).eq('id',cancelModal.id)
    if(error){toast.error('Erro: '+error.message);return}
    toast.success('Venda cancelada')
    setCancelModal(null); setCancelReason(''); loadOrders()
  }

  const filtered = orders.filter(o=>(o.customer_name||'').toLowerCase().includes(search.toLowerCase())||String(o.order_number).includes(search))
  const statusColor = (s:string) => s==='completed'?'#00ff41':s==='cancelled'?'#ff3333':'#ffaa00'
  const statusLabel = (s:string) => s==='completed'?'PAGO':s==='cancelled'?'CANCELADO':'PENDENTE'

  const totals = {
    completed: orders.filter(o=>o.status==='completed').reduce((s,o)=>s+o.total,0),
    count: orders.filter(o=>o.status==='completed').length,
    cancelled: orders.filter(o=>o.status==='cancelled').length,
  }

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <History size={20} color="var(--neon)"/>
        <h1 className="font-bangers neon-text-sm" style={{fontSize:26}}>HISTORICO</h1>
        <div style={{position:'relative',flex:1,maxWidth:280}}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente ou #numero..." style={{paddingLeft:32}}/>
        </div>
        <div style={{display:'flex',gap:12,marginLeft:'auto'}}>
          <div style={{textAlign:'center'}}><p style={{fontSize:18,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(totals.completed)}</p><p style={{fontSize:10,color:'var(--muted)'}}>TOTAL VENDAS</p></div>
          <div style={{textAlign:'center'}}><p style={{fontSize:18,fontWeight:700,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{totals.count}</p><p style={{fontSize:10,color:'var(--muted)'}}>VENDAS</p></div>
          <div style={{textAlign:'center'}}><p style={{fontSize:18,fontWeight:700,color:'#ff3333',fontFamily:'JetBrains Mono,monospace'}}>{totals.cancelled}</p><p style={{fontSize:10,color:'var(--muted)'}}>CANCELADAS</p></div>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
        {loading ? <div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div> :
        filtered.length===0 ? <div style={{textAlign:'center',padding:48,color:'var(--muted)'}}><History size={36} style={{opacity:0.3,marginBottom:8}}/><p>Nenhuma venda encontrada</p></div> :
        filtered.map(o=>(
          <div key={o.id} className="card" style={{marginBottom:8,overflow:'hidden',opacity:o.status==='cancelled'?0.7:1}}>
            <div onClick={()=>expandOrder(o.id)} style={{padding:'11px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'var(--neon)',minWidth:36}}>#{o.order_number}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{o.customer_name||'Cliente Avulso'}</p>
                <p style={{fontSize:11,color:'var(--muted)'}}>{(o.sellers as any)?.name||'Sem vendedor'} · {new Date(o.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</p>
              </div>
              <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,background:statusColor(o.status)+'20',color:statusColor(o.status),whiteSpace:'nowrap'}}>{statusLabel(o.status)}</span>
              <span style={{fontSize:15,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',minWidth:80,textAlign:'right'}}>{fmt(o.total)}</span>
              {o.status==='completed' && (
                <button onClick={e=>{e.stopPropagation();setCancelModal(o)}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid #ff3333',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',fontSize:10,fontFamily:'Bangers,cursive',whiteSpace:'nowrap'}}>
                  CANCELAR
                </button>
              )}
              {expanded===o.id ? <ChevronUp size={15} color="var(--muted)"/> : <ChevronDown size={15} color="var(--muted)"/>}
            </div>
            {expanded===o.id && (
              <div style={{padding:'0 16px 14px',borderTop:'1px solid var(--border)'}}>
                {o.cancel_reason && <div style={{margin:'8px 0',padding:'8px 12px',background:'rgba(255,51,51,0.08)',borderRadius:8,fontSize:12,color:'#ff3333',display:'flex',alignItems:'center',gap:6}}><AlertTriangle size={12}/>Cancelado: {o.cancel_reason}</div>}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:10}}>
                  <div>
                    <p style={{fontSize:10,color:'var(--muted)',letterSpacing:1,marginBottom:6}}>ITENS</p>
                    {(itemsCache[o.id]||[]).map(i=>(
                      <div key={i.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                        <span style={{color:'var(--text)'}}>{i.quantity}x {i.product_name}</span>
                        <span style={{color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(i.total_price)}</span>
                      </div>
                    ))}
                    {o.discount>0 && <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginTop:4,paddingTop:4,borderTop:'1px solid var(--border)'}}><span style={{color:'var(--muted)'}}>Desconto</span><span style={{color:'#ff3333'}}>-{fmt(o.discount)}</span></div>}
                  </div>
                  <div>
                    <p style={{fontSize:10,color:'var(--muted)',letterSpacing:1,marginBottom:6}}>PAGAMENTOS</p>
                    {(paymentsCache[o.id]||[]).map(p=>(
                      <div key={p.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                        <span style={{color:'var(--text)',textTransform:'capitalize'}}>{p.method}</span>
                        <span style={{color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {cancelModal && (
        <div className="animate-fade-in" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div className="card" style={{width:'100%',maxWidth:420,padding:24,margin:16,border:'1px solid #ff3333',boxShadow:'0 0 30px rgba(255,51,51,0.2)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <AlertTriangle size={20} color="#ff3333"/>
              <h2 className="font-bangers" style={{fontSize:20,color:'#ff3333'}}>CANCELAR VENDA #{cancelModal.order_number}</h2>
            </div>
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:4}}>Valor: <strong style={{color:'var(--neon)'}}>{fmt(cancelModal.total)}</strong></p>
            <p style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>Esta acao nao pode ser desfeita. Informe o motivo:</p>
            <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder="Ex: Pedido duplicado, cliente desistiu..." rows={3} style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:8,padding:'10px 12px',fontSize:13,resize:'none',outline:'none',boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:10,marginTop:14}}>
              <button onClick={()=>{setCancelModal(null);setCancelReason('')}} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>VOLTAR</button>
              <button onClick={cancelOrder} style={{flex:2,padding:10,borderRadius:8,border:'none',background:'#ff3333',color:'white',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CONFIRMAR CANCELAMENTO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}