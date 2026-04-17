import{useState,useEffect}from 'react'
import{History,Search,ChevronDown,ChevronUp,Calendar,Edit2,AlertTriangle,Check,X}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import{useCashRegister}from '@/hooks/useCashRegister'
import toast from 'react-hot-toast'

type Order={id:string;order_number:number;customer_name:string;status:string;total:number;type:string;payment_method:string|null;seller_id:string|null;created_at:string;cancel_reason:string|null;subtotal:number;discount:number}
type Payment={id?:string;method:string;amount:number}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const SC:Record<string,string>={pending:'#ffaa00',accepted:'#06b6d4',completed:'#00ff41',cancelled:'#ff3333',delivered:'#10b981'}
const SL:Record<string,string>={pending:'Pendente',accepted:'Aceito',preparing:'Preparando',ready:'Pronto',delivering:'A caminho',delivered:'Entregue',completed:'Concluido',cancelled:'Cancelado'}
const PL:Record<string,string>={pix:'PIX',dinheiro:'Dinheiro',debito:'Debito',credito:'Credito'}
const METHODS=[{key:'pix',label:'PIX'},{key:'dinheiro',label:'Dinheiro'},{key:'debito',label:'Debito'},{key:'credito',label:'Credito'}]
const today=()=>new Date().toISOString().split('T')[0]

export default function HistoryPage({sellerId}:{sellerId?:string|null}){
  const cash=useCashRegister()
  const[orders,setOrders]=useState<Order[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[expanded,setExpanded]=useState<string|null>(null)
  const[itemsCache,setItemsCache]=useState<Record<string,any[]>>({})
  const[paymentsCache,setPaymentsCache]=useState<Record<string,Payment[]>>({})
  const[dateFrom,setDateFrom]=useState(today())
  const[dateTo,setDateTo]=useState(today())
  const[statusF,setStatusF]=useState('all')
  const[typeF,setTypeF]=useState('all')
  // Cancel modal
  const[cancelModal,setCancelModal]=useState<Order|null>(null)
  const[cancelReason,setCancelReason]=useState('')
  // Edit payment modal
  const[editModal,setEditModal]=useState<Order|null>(null)
  const[editPays,setEditPays]=useState<Payment[]>([])
  const[saving,setSaving]=useState(false)

  useEffect(()=>{loadOrders()},[dateFrom,dateTo])

  async function loadOrders(){
    setLoading(true)
    let q:any=supabase.from('orders').select('*,sellers(name),order_payments(method,amount)').gte('created_at',dateFrom+'T00:00:00').lte('created_at',dateTo+'T23:59:59').order('created_at',{ascending:false})
    if(sellerId)q=q.eq('seller_id',sellerId)
    const{data}=await q
    setOrders(data||[])
    setLoading(false)
  }

  async function expandOrder(id:string){
    if(expanded===id){setExpanded(null);return}
    setExpanded(id)
    if(!itemsCache[id]){
      const[items,pays]=await Promise.all([
        supabase.from('order_items').select('*').eq('order_id',id),
        supabase.from('order_payments').select('*').eq('order_id',id)
      ])
      setItemsCache(c=>({...c,[id]:items.data||[]}))
      setPaymentsCache(c=>({...c,[id]:pays.data||[]}))
    }
  }

  async function cancelOrder(){
    if(!cancelModal||!cancelReason.trim()){toast.error('Informe o motivo');return}
    // First get order items to restore stock
    const{data:items}=await supabase.from('order_items').select('product_id,quantity').eq('order_id',cancelModal.id)
    // Cancel the order
    const{error}=await supabase.from('orders').update({status:'cancelled',cancel_reason:cancelReason,cancelled_at:new Date().toISOString()}).eq('id',cancelModal.id)
    if(error){toast.error(error.message);return}
    // Restore stock for each item
    if(items&&items.length>0){
      for(const item of items){
        if(!item.product_id)continue
        // Get current stock first
        const{data:prod}=await supabase.from('products').select('stock').eq('id',item.product_id).single()
        if(prod){
          await supabase.from('products').update({stock:(prod.stock||0)+item.quantity}).eq('id',item.product_id)
        }
      }
    }
    toast.success('Venda #'+cancelModal.order_number+' cancelada — estoque restaurado!')
    setCancelModal(null);setCancelReason('');loadOrders()
  }

  function openEdit(o:Order){
    setEditModal(o)
    const pays=paymentsCache[o.id]||[]
    setEditPays(pays.length>0?pays:[{method:'pix',amount:o.total}])
  }

  async function saveEditPays(){
    if(!editModal)return
    const total=editPays.reduce((s,p)=>s+p.amount,0)
    setSaving(true)
    try{
      // Delete old payments and insert new
      await supabase.from('order_payments').delete().eq('order_id',editModal.id)
      if(editPays.filter(p=>p.amount>0).length>0){
        await supabase.from('order_payments').insert(editPays.filter(p=>p.amount>0).map(p=>({order_id:editModal!.id,method:p.method,amount:p.amount})))
      }
      toast.success('Pagamento atualizado!')
      setPaymentsCache(c=>({...c,[editModal.id]:editPays.filter(p=>p.amount>0)}))
      setEditModal(null)
    }catch(e:any){toast.error(e.message)}
    finally{setSaving(false)}
  }

  function setPreset(p:string){
    const d=new Date()
    if(p==='today'){setDateFrom(today());setDateTo(today())}
    else if(p==='yesterday'){const y=new Date(d);y.setDate(d.getDate()-1);const s=y.toISOString().split('T')[0];setDateFrom(s);setDateTo(s)}
    else if(p==='week'){const w=new Date(d);w.setDate(d.getDate()-7);setDateFrom(w.toISOString().split('T')[0]);setDateTo(today())}
    else if(p==='month'){setDateFrom(new Date(d.getFullYear(),d.getMonth(),1).toISOString().split('T')[0]);setDateTo(today())}
  }

  const filtered=orders.filter(o=>{
    if(statusF!=='all'&&o.status!==statusF)return false
    if(typeF!=='all'&&o.type!==typeF)return false
    if(search&&!(o.customer_name||'').toLowerCase().includes(search.toLowerCase())&&!String(o.order_number).includes(search))return false
    return true
  })

  const totalV=filtered.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+Number(o.total),0)
  const qtdV=filtered.filter(o=>o.status!=='cancelled').length
  const qtdC=filtered.filter(o=>o.status==='cancelled').length

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

      {/* Cash status bar */}
      <div style={{padding:'8px 20px',borderBottom:'1px solid var(--border)',background:cash.isOpen?'rgba(0,255,65,0.03)':'rgba(255,170,0,0.04)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:cash.isOpen?'var(--neon)':'#ffaa00',flexShrink:0}}/>
          <span style={{fontSize:12,color:cash.isOpen?'var(--neon)':'#ffaa00',fontFamily:'Bangers,cursive',letterSpacing:1}}>
            {cash.isOpen?'CAIXA ABERTO — '+new Date(cash.current!.opened_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'CAIXA FECHADO'}
          </span>
        </div>
        {cash.isOpen
          ?<button onClick={()=>cash.setCloseModal(true)} style={{padding:'5px 14px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.08)',color:'#ff3333',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:12}}>FECHAR CAIXA</button>
          :<button onClick={()=>cash.setOpenModal(true)} style={{padding:'5px 14px',borderRadius:8,border:'1px solid #ffaa00',background:'rgba(255,170,0,0.08)',color:'#ffaa00',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:12}}>ABRIR CAIXA</button>
        }
      </div>

      {/* Date filter */}
      <div style={{padding:'8px 20px',borderBottom:'1px solid var(--border)',background:'var(--card)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <Calendar size={13} color='var(--muted)'/>
        {[{k:'today',l:'Hoje'},{k:'yesterday',l:'Ontem'},{k:'week',l:'7 dias'},{k:'month',l:'Este mes'}].map(p=>(
          <button key={p.k} onClick={()=>setPreset(p.k)} style={{padding:'4px 9px',borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',whiteSpace:'nowrap'}}>{p.l}</button>
        ))}
        <span style={{fontSize:11,color:'var(--muted)'}}>De</span>
        <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{fontSize:12,padding:'4px 8px',width:130}}/>
        <span style={{fontSize:11,color:'var(--muted)'}}>Ate</span>
        <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{fontSize:12,padding:'4px 8px',width:130}}/>
        <div style={{display:'flex',gap:5,marginLeft:'auto',flexWrap:'wrap'}}>
          {['all','pdv','delivery'].map(t=>(
            <button key={t} onClick={()=>setTypeF(t)} style={{padding:'3px 8px',borderRadius:6,border:typeF===t?'1px solid var(--neon)':'1px solid var(--border)',background:typeF===t?'var(--neon-glow)':'transparent',color:typeF===t?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>
              {t==='all'?'Todos':t.toUpperCase()}
            </button>
          ))}
          {['all','completed','cancelled'].map(s=>(
            <button key={s} onClick={()=>setStatusF(s)} style={{padding:'3px 8px',borderRadius:6,border:statusF===s?'1px solid var(--neon)':'1px solid var(--border)',background:statusF===s?'var(--neon-glow)':'transparent',color:statusF===s?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>
              {s==='all'?'Tudo':s==='completed'?'Concluidas':'Canceladas'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div style={{padding:'6px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',gap:20,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:11,color:'var(--muted)'}}>Total:</span><span style={{fontSize:14,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(totalV)}</span></div>
        <div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:11,color:'var(--muted)'}}>Vendas:</span><span style={{fontSize:14,fontWeight:700,color:'var(--white)'}}>{qtdV}</span></div>
        <div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:11,color:'var(--muted)'}}>Canceladas:</span><span style={{fontSize:14,fontWeight:700,color:'#ff3333'}}>{qtdC}</span></div>
        <div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:11,color:'var(--muted)'}}>Ticket medio:</span><span style={{fontSize:14,fontWeight:700,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{qtdV>0?fmt(totalV/qtdV):'—'}</span></div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        filtered.length===0?(
          <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}><History size={40} style={{opacity:0.3,marginBottom:12}}/><p style={{fontFamily:'Bangers,cursive',fontSize:18}}>NENHUMA VENDA NO PERIODO</p></div>
        ):filtered.map(o=>(
          <div key={o.id} className='card' style={{marginBottom:8,overflow:'hidden',borderLeft:'3px solid '+(SC[o.status]||'var(--border)')}}>
            <div onClick={()=>expandOrder(o.id)} style={{padding:'10px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',flexWrap:'wrap'}}>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--neon)',minWidth:34}}>#{o.order_number}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.customer_name||'Cliente Avulso'}</p>
                <div style={{display:'flex',gap:8,marginTop:2,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,color:'var(--muted)'}}>{new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
                  <span style={{fontSize:11,color:'var(--muted)',background:'var(--surface)',padding:'1px 6px',borderRadius:4}}>{o.type==='delivery'?'Delivery':'PDV'}</span>
                </div>
              </div>
              <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:(SC[o.status]||'#888')+'20',color:SC[o.status]||'#888',whiteSpace:'nowrap'}}>{SL[o.status]||o.status}</span>
              <span style={{fontSize:14,fontWeight:700,color:o.status==='cancelled'?'#ff3333':'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(o.total))}</span>
              {expanded===o.id?<ChevronUp size={13} color='var(--muted)'/>:<ChevronDown size={13} color='var(--muted)'/>}
            </div>

            {expanded===o.id&&(
              <div style={{padding:'0 16px 12px',borderTop:'1px solid var(--border)'}}>
                {o.cancel_reason&&<div style={{padding:'6px 10px',background:'rgba(255,51,51,0.06)',borderRadius:7,margin:'8px 0',fontSize:12,color:'#ff8888'}}><strong>Motivo cancelamento:</strong> {o.cancel_reason}</div>}
                {/* Items */}
                <div style={{marginBottom:8,paddingTop:8}}>
                  {(itemsCache[o.id]||[]).map(i=>(
                    <div key={i.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'2px 0'}}>
                      <span style={{color:'var(--text)'}}>{i.quantity}x {i.product_name}</span>
                      <span style={{color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(i.total_price)}</span>
                    </div>
                  ))}
                  {(paymentsCache[o.id]||[]).length>0&&(
                    <div style={{borderTop:'1px solid var(--border)',paddingTop:6,marginTop:4}}>
                      {(paymentsCache[o.id]||[]).map((p,i)=>(
                        <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'2px 0'}}>
                          <span style={{color:'var(--muted)'}}>{PL[p.method]||p.method}</span>
                          <span style={{color:'var(--muted)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Action buttons */}
                <div style={{display:'flex',gap:8,flexWrap:'wrap',paddingTop:4}}>
                  {o.status!=='cancelled'&&(
                    <button onClick={()=>openEdit(o)} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:8,border:'1px solid var(--neon)',background:'var(--neon-glow)',color:'var(--neon)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',letterSpacing:0.5}}>
                      <Edit2 size={12}/>EDITAR PAGAMENTO
                    </button>
                  )}
                  {!['cancelled','delivered','completed'].includes(o.status)&&(
                    <button onClick={()=>{setCancelModal(o);setCancelReason('')}} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.08)',color:'#ff3333',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>
                      <X size={12}/>CANCELAR VENDA
                    </button>
                  )}
                  {o.status==='completed'&&(
                    <button onClick={()=>{setCancelModal(o);setCancelReason('')}} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.08)',color:'#ff3333',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>
                      <X size={12}/>CANCELAR VENDA
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CANCEL MODAL */}
      {cancelModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:440,padding:24,border:'2px solid #ff3333',boxShadow:'0 0 30px rgba(255,51,51,0.2)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
              <div style={{width:40,height:40,borderRadius:12,background:'rgba(255,51,51,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><AlertTriangle size={20} color='#ff3333'/></div>
              <div><h2 className='font-bangers' style={{fontSize:20,color:'#ff3333'}}>CANCELAR VENDA #{cancelModal.order_number}</h2><p style={{fontSize:12,color:'var(--muted)'}}>{cancelModal.customer_name||'Cliente Avulso'} | {fmt(Number(cancelModal.total))}</p></div>
            </div>
            <div style={{padding:'8px 12px',background:'rgba(255,51,51,0.06)',borderRadius:8,marginBottom:14,fontSize:12,color:'#ff8888'}}>Esta acao nao pode ser desfeita.</div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>MOTIVO DO CANCELAMENTO *</label>
              <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder='Ex: Erro no pedido, solicitacao do cliente...' rows={3} autoFocus style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:8,padding:'9px 12px',fontSize:13,resize:'none',outline:'none',boxSizing:'border-box' as const}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:14}}>
              {['Erro no pedido','Produto em falta','Solicitacao do cliente','Pedido duplicado'].map(r=>(
                <button key={r} onClick={()=>setCancelReason(r)} style={{padding:'6px 10px',borderRadius:8,border:cancelReason===r?'1px solid #ff3333':'1px solid var(--border)',background:cancelReason===r?'rgba(255,51,51,0.1)':'transparent',color:cancelReason===r?'#ff3333':'var(--muted)',cursor:'pointer',fontSize:11,textAlign:'left' as const}}>{r}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setCancelModal(null)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>VOLTAR</button>
              <button onClick={cancelOrder} style={{flex:2,padding:11,borderRadius:8,border:'none',background:'#ff3333',color:'white',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15}}>CONFIRMAR CANCELAMENTO</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PAYMENT MODAL */}
      {editModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:420,padding:24,border:'1px solid var(--border-bright)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div><h2 className='font-bangers neon-text-sm' style={{fontSize:20}}>EDITAR PAGAMENTO</h2><p style={{fontSize:12,color:'var(--muted)'}}>Venda #{editModal.order_number} | {fmt(Number(editModal.total))}</p></div>
              <button onClick={()=>setEditModal(null)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={18}/></button>
            </div>
            <div style={{marginBottom:14}}>
              {editPays.map((pm,i)=>(
                <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
                  <select value={pm.method} onChange={e=>setEditPays(p=>p.map((x,j)=>j===i?{...x,method:e.target.value}:x))} style={{flex:1,fontSize:13,padding:'8px 10px'}}>
                    {METHODS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                  <input type='number' min='0' step='0.01' value={pm.amount===0?'':pm.amount} onChange={e=>setEditPays(p=>p.map((x,j)=>j===i?{...x,amount:e.target.value===''?0:parseFloat(e.target.value)||0}:x))} placeholder='0,00' style={{width:100,textAlign:'right',fontSize:13}}/>
                  {editPays.length>1&&<button onClick={()=>setEditPays(p=>p.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'#ff3333',cursor:'pointer'}}><X size={14}/></button>}
                </div>
              ))}
              <button onClick={()=>setEditPays(p=>[...p,{method:'pix',amount:0}])} style={{fontSize:12,color:'var(--neon)',background:'none',border:'none',cursor:'pointer',marginTop:4}}>+ Adicionar forma</button>
            </div>
            <div style={{padding:'8px 12px',background:'var(--surface)',borderRadius:8,display:'flex',justifyContent:'space-between',marginBottom:14,fontSize:13}}>
              <span style={{color:'var(--muted)'}}>Total pagamentos</span>
              <span style={{fontWeight:700,color:Math.abs(editPays.reduce((s,p)=>s+p.amount,0)-Number(editModal.total))<0.01?'var(--neon)':'#ffaa00',fontFamily:'JetBrains Mono,monospace'}}>{fmt(editPays.reduce((s,p)=>s+p.amount,0))}</span>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setEditModal(null)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={saveEditPays} disabled={saving} className='btn-neon-fill' style={{flex:2,fontSize:14}}>
                <Check size={13} style={{display:'inline',marginRight:5}}/>{saving?'SALVANDO...':'SALVAR PAGAMENTO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash modals */}
      {cash.openModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:380,padding:24,border:'2px solid #ffaa00'}}>
            <h2 className='font-bangers' style={{fontSize:22,color:'#ffaa00',marginBottom:6}}>ABRIR CAIXA</h2>
            <p style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,letterSpacing:1}}>SALDO INICIAL (R$)</label>
            <input type='number' min='0' step='0.01' value={cash.openBal} onChange={e=>cash.setOpenBal(e.target.value)} placeholder='0,00' autoFocus style={{fontSize:18,textAlign:'center',fontFamily:'JetBrains Mono,monospace',marginBottom:18}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>cash.setOpenModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={cash.openCash} disabled={cash.saving} style={{flex:2,padding:11,borderRadius:8,border:'none',background:'#ffaa00',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:16,opacity:cash.saving?0.7:1}}>{cash.saving?'ABRINDO...':'ABRIR CAIXA'}</button>
            </div>
          </div>
        </div>
      )}
      {cash.closeModal&&cash.current&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:420,padding:24,border:'2px solid #ff3333'}}>
            <h2 className='font-bangers' style={{fontSize:22,color:'#ff3333',marginBottom:14}}>FECHAR CAIXA</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
              {[{l:'Saldo Abertura',v:fmt(Number(cash.current.opening_balance)||0)},{l:'Total Vendas',v:fmt(totalV)},{l:'Saldo Esperado',v:fmt((Number(cash.current.opening_balance)||0)+totalV)}].map((k,i)=>(
                <div key={i} style={{padding:'8px 12px',background:'var(--surface)',borderRadius:8}}><p style={{fontSize:10,color:'var(--muted)'}}>{k.l}</p><p style={{fontSize:13,fontWeight:600,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p></div>
              ))}
            </div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>SALDO FISICO CONTADO (R$)</label>
            <input type='number' min='0' step='0.01' value={cash.closeBal} onChange={e=>cash.setCloseBal(e.target.value)} placeholder='0,00' autoFocus style={{fontSize:16,textAlign:'center',fontFamily:'JetBrains Mono,monospace',marginBottom:10}}/>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>OBSERVACOES</label>
            <textarea value={cash.closeNotes} onChange={e=>cash.setCloseNotes(e.target.value)} rows={2} style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text)',fontSize:13,resize:'none',outline:'none',boxSizing:'border-box' as const,marginBottom:14}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>cash.setCloseModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={()=>cash.closeCash((Number(cash.current!.opening_balance)||0)+totalV)} disabled={cash.saving} style={{flex:2,padding:11,borderRadius:8,border:'none',background:'#ff3333',color:'white',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15,opacity:cash.saving?0.7:1}}>{cash.saving?'FECHANDO...':'FECHAR CAIXA'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}