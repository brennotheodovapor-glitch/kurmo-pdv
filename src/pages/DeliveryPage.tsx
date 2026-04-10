import{useState,useEffect}from 'react'
import{Truck,Plus,X,Check,Clock,Phone,MapPin,AlertTriangle,ChevronDown,ChevronUp,User,Package,DollarSign,Search}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Order={id:string;order_number:number;customer_name:string;customer_phone:string;status:string;total:number;delivery_fee:number;created_at:string;notes:string|null;type:string}
type Product={id:string;name:string;price:number;stock:number;image_url?:string}
type CartItem=Product&{qty:number}

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const STATUS_COLOR:Record<string,string>={pending:'#ffaa00',accepted:'#06b6d4',preparing:'#7c3aed',ready:'#00ff41',delivering:'#f59e0b',delivered:'#10b981',cancelled:'#ff3333',completed:'#00ff41'}
const STATUS_LABEL:Record<string,string>={pending:'AGUARDANDO',accepted:'ACEITO',preparing:'PREPARANDO',ready:'PRONTO',delivering:'A CAMINHO',delivered:'ENTREGUE',cancelled:'CANCELADO',completed:'CONCLUIDO'}
const NEXT:Record<string,string>={pending:'accepted',accepted:'preparing',preparing:'ready',ready:'delivering',delivering:'delivered'}

export default function DeliveryPage(){
  const[orders,setOrders]=useState<Order[]>([])
  const[products,setProducts]=useState<Product[]>([])
  const[loading,setLoading]=useState(true)
  const[expanded,setExpanded]=useState<string|null>(null)
  const[itemsCache,setItemsCache]=useState<Record<string,any[]>>({})
  const[search,setSearch]=useState('')
  const[statusFilter,setStatusFilter]=useState<string>('active')

  // Cancel modal
  const[cancelModal,setCancelModal]=useState<Order|null>(null)
  const[cancelReason,setCancelReason]=useState('')

  // New order modal
  const[newModal,setNewModal]=useState(false)
  const[cart,setCart]=useState<CartItem[]>([])
  const[prodSearch,setProdSearch]=useState('')
  const[newForm,setNewForm]=useState({customer_name:'',customer_phone:'',notes:'',discount:0})
  const[saving,setSaving]=useState(false)

  useEffect(()=>{loadData()},[]) 

  async function loadData(){
    setLoading(true)
    const[o,p]=await Promise.all([
      supabase.from('orders').select('*').eq('type','delivery').order('created_at',{ascending:false}).limit(100),
      supabase.from('products').select('*').eq('active',true).order('name')
    ])
    setOrders(o.data||[])
    setProducts(p.data||[])
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

  async function updateStatus(id:string,status:string){
    await supabase.from('orders').update({status}).eq('id',id)
    toast.success(STATUS_LABEL[status]||status)
    loadData()
  }

  async function confirmCancel(){
    if(!cancelModal)return
    if(!cancelReason.trim()){toast.error('Informe o motivo do cancelamento');return}
    const{error}=await supabase.from('orders').update({status:'cancelled',cancel_reason:cancelReason,cancelled_at:new Date().toISOString()}).eq('id',cancelModal.id)
    if(error){toast.error('Erro: '+error.message);return}
    toast.success('Pedido #'+cancelModal.order_number+' cancelado')
    setCancelModal(null);setCancelReason('');loadData()
  }

  // Cart helpers for new order
  const addToCart=(p:Product)=>setCart(c=>{const ex=c.find(i=>i.id===p.id);if(ex)return c.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i);return[...c,{...p,qty:1}]})
  const updateQty=(id:string,d:number)=>setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+d)}:i).filter(i=>i.qty>0))
  const cartTotal=cart.reduce((s,i)=>s+i.price*i.qty,0)
  const cartFinal=Math.max(0,cartTotal-(newForm.discount||0))

  async function saveNewOrder(){
    if(cart.length===0){toast.error('Adicione produtos ao pedido');return}
    if(!newForm.customer_name.trim()){toast.error('Informe o nome do cliente');return}
    setSaving(true)
    try{
      const{data:order,error}=await supabase.from('orders').insert({
        customer_name:newForm.customer_name,
        customer_phone:newForm.customer_phone||null,
        type:'delivery',status:'pending',
        subtotal:cartTotal,discount:newForm.discount||0,total:cartFinal,
        notes:newForm.notes||null
      }).select().single()
      if(error)throw error
      await supabase.from('order_items').insert(cart.map(i=>({order_id:order.id,product_id:i.id,product_name:i.name,quantity:i.qty,unit_price:i.price,total_price:i.price*i.qty})))
      toast.success('Pedido #'+order.order_number+' criado!')
      setNewModal(false);setCart([]);setNewForm({customer_name:'',customer_phone:'',notes:'',discount:0});loadData()
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setSaving(false)}
  }

  const filteredOrders=orders.filter(o=>{
    if(statusFilter==='active')return['pending','accepted','preparing','ready','delivering'].includes(o.status)
    if(statusFilter==='done')return['delivered','completed','cancelled'].includes(o.status)
    return true
  }).filter(o=>!search||(o.customer_name||'').toLowerCase().includes(search.toLowerCase())||String(o.order_number).includes(search))

  const filteredProducts=products.filter(p=>!prodSearch||p.name.toLowerCase().includes(prodSearch.toLowerCase()))

  const counts={active:orders.filter(o=>['pending','accepted','preparing','ready','delivering'].includes(o.status)).length,all:orders.length}

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>

      {/* Header */}
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <Truck size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>DELIVERY</h1>
        <div style={{position:'relative',maxWidth:240,flex:1}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar cliente ou #...' style={{paddingLeft:30,fontSize:13}}/>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[{k:'active',l:'Ativos ('+counts.active+')'},{k:'done',l:'Finalizados'},{k:'all',l:'Todos'}].map(f=>(
            <button key={f.k} onClick={()=>setStatusFilter(f.k)} style={{padding:'6px 12px',borderRadius:8,border:statusFilter===f.k?'1px solid var(--neon)':'1px solid var(--border)',background:statusFilter===f.k?'var(--neon-glow)':'transparent',color:statusFilter===f.k?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',letterSpacing:'0.05em'}}>{f.l}</button>
          ))}
        </div>
        <button onClick={()=>setNewModal(true)} className='btn-neon-fill' style={{marginLeft:'auto',fontSize:13,padding:'8px 16px'}}>
          <Plus size={14} style={{display:'inline',marginRight:6}}/>NOVO PEDIDO
        </button>
      </div>

      {/* Orders list */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        filteredOrders.length===0?(
          <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}>
            <Truck size={40} style={{opacity:0.3,marginBottom:12}}/>
            <p style={{fontFamily:'Bangers,cursive',fontSize:18,letterSpacing:1}}>NENHUM PEDIDO ENCONTRADO</p>
          </div>
        ):filteredOrders.map(o=>(
          <div key={o.id} className='card' style={{marginBottom:10,overflow:'hidden',borderLeft:'3px solid '+(STATUS_COLOR[o.status]||'var(--border)')}}>
            <div onClick={()=>expandOrder(o.id)} style={{padding:'11px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',flexWrap:'wrap'}}>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'var(--neon)',minWidth:36}}>#{o.order_number}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{o.customer_name||'Cliente'}</p>
                <div style={{display:'flex',gap:8,marginTop:2,flexWrap:'wrap'}}>
                  {o.customer_phone&&<span style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:3}}><Phone size={10}/>{o.customer_phone}</span>}
                  <span style={{fontSize:11,color:'var(--muted)'}}>{new Date(o.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              </div>
              <span style={{fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:20,background:(STATUS_COLOR[o.status]||'#888')+'20',color:STATUS_COLOR[o.status]||'#888',whiteSpace:'nowrap'}}>{STATUS_LABEL[o.status]||o.status}</span>
              <span style={{fontSize:15,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(o.total)}</span>
              {expanded===o.id?<ChevronUp size={15} color='var(--muted)'/>:<ChevronDown size={15} color='var(--muted)'/>}
            </div>

            {expanded===o.id&&(
              <div style={{padding:'0 16px 14px',borderTop:'1px solid var(--border)'}}>
                {o.notes&&(
                  <div style={{padding:'8px 12px',background:'var(--surface)',borderRadius:8,marginBottom:10,fontSize:12,color:'var(--text)',display:'flex',gap:6}}>
                    <MapPin size={12} style={{flexShrink:0,marginTop:1,color:'var(--muted)'}}/>
                    <span>{o.notes}</span>
                  </div>
                )}
                {(itemsCache[o.id]||[]).length>0&&(
                  <div style={{marginBottom:10}}>
                    {(itemsCache[o.id]||[]).map(i=>(
                      <div key={i.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'2px 0'}}>
                        <span style={{color:'var(--text)'}}>{i.quantity}x {i.product_name}</span>
                        <span style={{color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(i.total_price)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {NEXT[o.status]&&(
                    <button onClick={()=>updateStatus(o.id,NEXT[o.status])} style={{flex:2,minWidth:120,padding:'9px 12px',borderRadius:8,border:'1px solid var(--neon)',background:'var(--neon-glow)',color:'var(--neon)',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive',letterSpacing:1}}>
                      {o.status==='pending'?'ACEITAR PEDIDO':'AVANCAR: '+STATUS_LABEL[NEXT[o.status]]}
                    </button>
                  )}
                  {!['cancelled','delivered','completed'].includes(o.status)&&(
                    <button onClick={e=>{e.stopPropagation();setCancelModal(o);setCancelReason('')}} style={{padding:'9px 14px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.08)',color:'#ff3333',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive',letterSpacing:1}}>
                      CANCELAR
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
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:440,padding:24,border:'2px solid #ff3333',boxShadow:'0 0 30px rgba(255,51,51,0.2)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{width:40,height:40,borderRadius:12,background:'rgba(255,51,51,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <AlertTriangle size={20} color='#ff3333'/>
              </div>
              <div>
                <h2 className='font-bangers' style={{fontSize:20,color:'#ff3333'}}>CANCELAR PEDIDO #{cancelModal.order_number}</h2>
                <p style={{fontSize:12,color:'var(--muted)'}}>Cliente: {cancelModal.customer_name} | {fmt(cancelModal.total)}</p>
              </div>
            </div>
            <div style={{padding:'10px 14px',background:'rgba(255,51,51,0.06)',borderRadius:8,marginBottom:14,fontSize:12,color:'#ff8888'}}>
              Esta acao nao pode ser desfeita. O pedido sera marcado como cancelado no historico.
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,letterSpacing:1}}>MOTIVO DO CANCELAMENTO *</label>
              <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder='Ex: Cliente nao atendeu, Fora da area de entrega, Produto indisponivel...' rows={3} autoFocus style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:8,padding:'10px 12px',fontSize:13,resize:'none',outline:'none',boxSizing:'border-box' as const}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              {['Cliente nao atendeu','Fora da area','Produto em falta','Pedido duplicado'].map(r=>(
                <button key={r} onClick={()=>setCancelReason(r)} style={{padding:'7px 10px',borderRadius:8,border:cancelReason===r?'1px solid #ff3333':'1px solid var(--border)',background:cancelReason===r?'rgba(255,51,51,0.1)':'transparent',color:cancelReason===r?'#ff3333':'var(--muted)',cursor:'pointer',fontSize:11,textAlign:'left' as const}}>{r}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setCancelModal(null);setCancelReason('')}} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>VOLTAR</button>
              <button onClick={confirmCancel} style={{flex:2,padding:11,borderRadius:8,border:'none',background:'#ff3333',color:'white',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15,letterSpacing:1}}>CONFIRMAR CANCELAMENTO</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW ORDER MODAL */}
      {newModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'stretch',justifyContent:'center',zIndex:50}}>
          <div style={{width:'100%',maxWidth:860,display:'flex',height:'100%',maxHeight:'100vh',background:'var(--bg)',overflow:'hidden',flexDirection:'column'}}>

            {/* Modal header */}
            <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
              <Truck size={18} color='var(--neon)'/>
              <h2 className='font-bangers neon-text-sm' style={{fontSize:22}}>NOVO PEDIDO DELIVERY</h2>
              <button onClick={()=>{setNewModal(false);setCart([]);setNewForm({customer_name:'',customer_phone:'',notes:'',discount:0})}} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--muted)',cursor:'pointer',padding:4}}><X size={20}/></button>
            </div>

            <div style={{flex:1,display:'flex',overflow:'hidden',minHeight:0}}>
              {/* Products panel */}
              <div style={{flex:1,display:'flex',flexDirection:'column',borderRight:'1px solid var(--border)',overflow:'hidden'}}>
                <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--surface)'}}>
                  <div style={{position:'relative'}}>
                    <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
                    <input value={prodSearch} onChange={e=>setProdSearch(e.target.value)} placeholder='Buscar produto...' style={{paddingLeft:30,fontSize:13}}/>
                  </div>
                </div>
                <div style={{flex:1,overflowY:'auto',padding:10,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8,alignContent:'start'}}>
                  {filteredProducts.map(p=>(
                    <button key={p.id} onClick={()=>addToCart(p)} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:10,cursor:'pointer',textAlign:'left' as const,transition:'all 0.15s',position:'relative' as const}} className='card-hover'>
                      {p.image_url&&p.image_url.startsWith('http')&&<img src={p.image_url} style={{width:'100%',height:64,objectFit:'cover' as const,borderRadius:7,marginBottom:6}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                      <p style={{fontSize:12,fontWeight:600,color:'var(--white)',marginBottom:2}}>{p.name}</p>
                      <p style={{fontSize:13,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.price)}</p>
                      {cart.find(i=>i.id===p.id)&&<div style={{position:'absolute' as const,top:6,right:6,background:'var(--neon)',color:'#000',borderRadius:'50%',width:20,height:20,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{cart.find(i=>i.id===p.id)?.qty}</div>}
                    </button>
                  ))}
                  {filteredProducts.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:32,color:'var(--muted)',fontSize:13}}>Nenhum produto</div>}
                </div>
              </div>

              {/* Right panel: cart + customer form */}
              <div style={{width:320,display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
                {/* Customer data */}
                <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',flexDirection:'column',gap:8}}>
                  <p style={{fontSize:10,color:'var(--muted)',letterSpacing:1,fontWeight:600}}>DADOS DO CLIENTE</p>
                  <input value={newForm.customer_name} onChange={e=>setNewForm(f=>({...f,customer_name:e.target.value}))} placeholder='Nome do cliente *' style={{fontSize:13}}/>
                  <input value={newForm.customer_phone} onChange={e=>setNewForm(f=>({...f,customer_phone:e.target.value}))} placeholder='Telefone' style={{fontSize:13}}/>
                  <textarea value={newForm.notes} onChange={e=>setNewForm(f=>({...f,notes:e.target.value}))} placeholder='Endereco / Observacoes' rows={2} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text)',fontSize:13,resize:'none' as const,outline:'none'}}/>
                </div>

                {/* Cart items */}
                <div style={{flex:1,overflowY:'auto',padding:'6px 14px'}}>
                  {cart.length===0?(
                    <div style={{textAlign:'center',padding:32,color:'var(--muted)'}}>
                      <Package size={28} style={{opacity:0.3,marginBottom:8}}/>
                      <p style={{fontSize:12}}>Clique nos produtos para adicionar</p>
                    </div>
                  ):cart.map(item=>(
                    <div key={item.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid rgba(26,46,26,0.5)'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:12,fontWeight:600,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{item.name}</p>
                        <p style={{fontSize:11,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price)}</p>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        <button onClick={()=>updateQty(item.id,-1)} style={{width:22,height:22,borderRadius:5,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>-</button>
                        <span style={{fontSize:13,fontWeight:700,color:'var(--white)',width:20,textAlign:'center' as const}}>{item.qty}</span>
                        <button onClick={()=>updateQty(item.id,1)} style={{width:22,height:22,borderRadius:5,border:'1px solid var(--neon)',background:'var(--neon-glow)',color:'var(--neon)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                        <button onClick={()=>setCart(c=>c.filter(i=>i.id!==item.id))} style={{width:22,height:22,borderRadius:5,border:'none',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',marginLeft:2}}>x</button>
                      </div>
                      <p style={{fontSize:12,fontWeight:700,color:'var(--white)',fontFamily:'JetBrains Mono,monospace',minWidth:60,textAlign:'right' as const}}>{fmt(item.price*item.qty)}</p>
                    </div>
                  ))}
                </div>

                {/* Totals + save */}
                <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)',flexShrink:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)',marginBottom:4}}><span>Subtotal</span><span>{fmt(cartTotal)}</span></div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:12,color:'var(--muted)'}}>Desconto R$</span>
                    <input type='number' min='0' value={newForm.discount===0?'':newForm.discount} onChange={e=>setNewForm(f=>({...f,discount:e.target.value===''?0:parseFloat(e.target.value)||0}))} placeholder='0,00' style={{width:80,textAlign:'right' as const,fontSize:12,padding:'4px 8px'}}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:17,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',padding:'6px 0',borderTop:'1px solid var(--border)',marginBottom:10}}><span>TOTAL</span><span>{fmt(cartFinal)}</span></div>
                  <button onClick={saveNewOrder} className='btn-neon-fill' disabled={saving||cart.length===0||!newForm.customer_name.trim()} style={{width:'100%',fontSize:14,padding:11,opacity:cart.length===0||!newForm.customer_name.trim()?0.5:1}}>
                    <Check size={14} style={{display:'inline',marginRight:6}}/>{saving?'SALVANDO...':'CRIAR PEDIDO'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}