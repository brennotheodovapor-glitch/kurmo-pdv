import{sendWhatsApp,WA_MESSAGES}from '@/lib/whatsapp'
import{useState,useEffect}from 'react'
import{Truck,Plus,X,Check,Phone,MapPin,AlertTriangle,ChevronDown,ChevronUp,Search,Loader2,CheckCircle,Minus,ShoppingCart}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Order={id:string;order_number:number;customer_name:string;customer_phone:string;status:string;total:number;delivery_fee:number;created_at:string;notes:string|null}
type Product={id:string;name:string;price:number;stock:number;image_url?:string;description?:string}
type CartItem=Product&{qty:number}
type DeliveryForm={nome:string;sobrenome:string;whatsapp:string;cep:string;numero:string;endereco:string;complemento:string;bairro:string;cidade:string;estado:string;referencia:string}
type Zone={id:string;name:string;fee:number;min_time:number;max_time:number}

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const STATUS_COLOR:Record<string,string>={pending:'#ffaa00',accepted:'#06b6d4',preparing:'#7c3aed',ready:'#00ff41',delivering:'#f59e0b',delivered:'#10b981',cancelled:'#ff3333',completed:'#00ff41'}
const STATUS_LABEL:Record<string,string>={pending:'AGUARDANDO',accepted:'ACEITO',preparing:'PREPARANDO',ready:'PRONTO',delivering:'A CAMINHO',delivered:'ENTREGUE',cancelled:'CANCELADO',completed:'CONCLUIDO'}
const NEXT:Record<string,string>={pending:'accepted',accepted:'preparing',preparing:'ready',ready:'delivering',delivering:'delivered'}
const EMPTY_FORM:DeliveryForm={nome:'',sobrenome:'',whatsapp:'',cep:'',numero:'',endereco:'',complemento:'',bairro:'',cidade:'',estado:'',referencia:''}
const fmtCEP=(v:string)=>v.replace(/\D/g,'').replace(/(\d{5})(\d{3})/,'$1-$2')
const fmtWA=(v:string)=>{const n=v.replace(/\D/g,'').substring(0,11);if(n.length<=2)return n;if(n.length<=7)return '('+n.slice(0,2)+') '+n.slice(2);return '('+n.slice(0,2)+') '+n.slice(2,7)+'-'+n.slice(7)}

const INP={width:'100%',background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'11px 14px',color:'var(--text)',fontSize:14,outline:'none',boxSizing:'border-box' as const,transition:'border-color 0.2s'}
const LBL={fontSize:11,color:'var(--muted)',display:'block' as const,marginBottom:5,fontWeight:600,letterSpacing:'0.06em'}

export default function DeliveryPage(){
  const[orders,setOrders]=useState<Order[]>([])
  const[products,setProducts]=useState<Product[]>([])
  const[zones,setZones]=useState<Zone[]>([])
  const[loading,setLoading]=useState(true)
  const[expanded,setExpanded]=useState<string|null>(null)
  const[itemsCache,setItemsCache]=useState<Record<string,any[]>>({})
  const[search,setSearch]=useState('')
  const[statusFilter,setStatusFilter]=useState('active')
  const[cancelModal,setCancelModal]=useState<Order|null>(null)
  const[cancelReason,setCancelReason]=useState('')
  const[newModal,setNewModal]=useState(false)
  const[newStep,setNewStep]=useState<'products'|'address'>('products')
  const[cart,setCart]=useState<CartItem[]>([])
  const[prodSearch,setProdSearch]=useState('')
  const[form,setForm]=useState<DeliveryForm>(EMPTY_FORM)
  const[cepLoading,setCepLoading]=useState(false)
  const[matchedZone,setMatchedZone]=useState<Zone|null>(null)
  const[saving,setSaving]=useState(false)

  useEffect(()=>{loadData()},[]) 

  async function loadData(){
    setLoading(true)
    const[o,p,z]=await Promise.all([
      supabase.from('orders').select('*').eq('type','delivery').order('created_at',{ascending:false}).limit(100),
      supabase.from('products').select('*').eq('active',true).order('name'),
      supabase.from('delivery_zones').select('*').eq('active',true).order('name')
    ])
    setOrders(o.data||[]);setProducts(p.data||[]);setZones(z.data||[])
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
    const order=orders.find(o=>o.id===id)
    if(order&&order.customer_phone&&WA_MESSAGES[status]){
      const msg=WA_MESSAGES[status](order.customer_name||'Cliente',order.order_number)
      sendWhatsApp(order.customer_phone,msg).then(sent=>{if(sent)toast.success('WhatsApp enviado!')})
    }
    toast.success(STATUS_LABEL[status]);loadData()
  }

  async function confirmCancel(){
    if(!cancelModal)return
    if(!cancelReason.trim()){toast.error('Informe o motivo');return}
    const{error}=await supabase.from('orders').update({status:'cancelled',cancel_reason:cancelReason,cancelled_at:new Date().toISOString()}).eq('id',cancelModal.id)
    if(error){toast.error(error.message);return}
    toast.success('Pedido cancelado');setCancelModal(null);setCancelReason('');loadData()
  }

  const sf=(k:keyof DeliveryForm,v:string)=>setForm(f=>({...f,[k]:v}))

  async function handleCEP(raw:string){
    const clean=raw.replace(/\D/g,'')
    sf('cep',clean)
    if(clean.length!==8)return
    setCepLoading(true)
    try{
      const r=await fetch('https://viacep.com.br/ws/'+clean+'/json/')
      const d=await r.json()
      if(d.erro){toast.error('CEP nao encontrado');return}
      const bairro=d.bairro||''
      setForm(f=>({...f,cep:clean,endereco:d.logradouro||'',bairro,cidade:d.localidade||'',estado:d.uf||''}))
      const z=zones.find(z=>bairro.toLowerCase().includes(z.name.toLowerCase())||z.name.toLowerCase().includes(bairro.toLowerCase().split(' ')[0]))
      setMatchedZone(z||null)
      if(z) toast.success('Bairro: '+z.name+' | Frete: '+fmt(z.fee))
      else toast.success('Endereco encontrado!')
    }catch{toast.error('Erro ao buscar CEP')}
    finally{setCepLoading(false)}
  }

  const addToCart=(p:Product)=>setCart(c=>{const ex=c.find(i=>i.id===p.id);if(ex)return c.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i);return[...c,{...p,qty:1}]})
  const updQty=(id:string,d:number)=>setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+d)}:i).filter(i=>i.qty>0))
  const subtotal=cart.reduce((s,i)=>s+i.price*i.qty,0)
  const delivFee=matchedZone?.fee||0
  const cartTotal=subtotal+delivFee
  const itemCount=cart.reduce((s,i)=>s+i.qty,0)

  async function saveOrder(){
    if(!form.nome.trim()||!form.sobrenome.trim()){toast.error('Informe nome e sobrenome');return}
    if(!form.whatsapp||form.whatsapp.replace(/\D/g,'').length<10){toast.error('WhatsApp invalido');return}
    if(!form.cep||form.cep.replace(/\D/g,'').length!==8){toast.error('CEP invalido');return}
    if(!form.numero.trim()){toast.error('Informe o numero');return}
    setSaving(true)
    try{
      const fullAddr=form.endereco+', '+form.numero+(form.complemento?' '+form.complemento:'')+' - '+form.bairro+' - '+form.cidade+'/'+form.estado+' CEP:'+form.cep+(form.referencia?' | Ref: '+form.referencia:'')
      const{data:order,error}=await supabase.from('orders').insert({
        customer_name:form.nome+' '+form.sobrenome,
        customer_phone:form.whatsapp,
        type:'delivery',status:'pending',
        subtotal,discount:0,delivery_fee:delivFee,total:cartTotal,
        delivery_zone_id:matchedZone?.id||null,
        notes:fullAddr
      }).select().single()
      if(error)throw error
      await supabase.from('order_items').insert(cart.map(i=>({order_id:order.id,product_id:i.id,product_name:i.name,quantity:i.qty,unit_price:i.price,total_price:i.price*i.qty})))
      toast.success('Pedido #'+order.order_number+' criado!')
      setNewModal(false);setCart([]);setForm(EMPTY_FORM);setMatchedZone(null);setNewStep('products');loadData()
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setSaving(false)}
  }

  const filteredOrders=orders.filter(o=>{
    if(statusFilter==='active')return['pending','accepted','preparing','ready','delivering'].includes(o.status)
    if(statusFilter==='done')return['delivered','completed','cancelled'].includes(o.status)
    return true
  }).filter(o=>!search||(o.customer_name||'').toLowerCase().includes(search.toLowerCase())||String(o.order_number).includes(search))

  const filtProd=products.filter(p=>!prodSearch||p.name.toLowerCase().includes(prodSearch.toLowerCase()))
  const activeCount=orders.filter(o=>['pending','accepted','preparing','ready','delivering'].includes(o.status)).length

  function closeNew(){setNewModal(false);setCart([]);setForm(EMPTY_FORM);setMatchedZone(null);setNewStep('products')}

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>

      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <Truck size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>DELIVERY</h1>
        <div style={{position:'relative',maxWidth:220,flex:1}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar...' style={{paddingLeft:28,fontSize:13}}/>
        </div>
        <div style={{display:'flex',gap:5}}>
          {[{k:'active',l:'Ativos ('+activeCount+')'},{k:'done',l:'Finalizados'},{k:'all',l:'Todos'}].map(f=>(
            <button key={f.k} onClick={()=>setStatusFilter(f.k)} style={{padding:'5px 10px',borderRadius:8,border:statusFilter===f.k?'1px solid var(--neon)':'1px solid var(--border)',background:statusFilter===f.k?'var(--neon-glow)':'transparent',color:statusFilter===f.k?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>
              {f.l}
            </button>
          ))}
        </div>
        <button onClick={()=>setNewModal(true)} className='btn-neon-fill' style={{marginLeft:'auto',fontSize:13,padding:'8px 16px'}}>
          <Plus size={14} style={{display:'inline',marginRight:6}}/>NOVO PEDIDO
        </button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        filteredOrders.length===0?(<div style={{textAlign:'center',padding:64,color:'var(--muted)'}}><Truck size={40} style={{opacity:0.3,marginBottom:12}}/><p style={{fontFamily:'Bangers,cursive',fontSize:18}}>NENHUM PEDIDO</p></div>):
        filteredOrders.map(o=>(
          <div key={o.id} className='card' style={{marginBottom:10,overflow:'hidden',borderLeft:'3px solid '+(STATUS_COLOR[o.status]||'var(--border)')}}>
            <div onClick={()=>expandOrder(o.id)} style={{padding:'11px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',flexWrap:'wrap'}}>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'var(--neon)',minWidth:36}}>#{o.order_number}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{o.customer_name}</p>
                <div style={{display:'flex',gap:8,marginTop:2}}>
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
                {o.notes&&<div style={{padding:'8px 12px',background:'var(--surface)',borderRadius:8,marginBottom:10,fontSize:12,color:'var(--text)',display:'flex',gap:6}}><MapPin size={12} style={{flexShrink:0,marginTop:1,color:'var(--muted)'}}/><span>{o.notes}</span></div>}
                <div style={{marginBottom:10}}>{(itemsCache[o.id]||[]).map(i=>(<div key={i.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'2px 0'}}><span style={{color:'var(--text)'}}>{i.quantity}x {i.product_name}</span><span style={{color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(i.total_price)}</span></div>))}</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {NEXT[o.status]&&<button onClick={()=>updateStatus(o.id,NEXT[o.status])} style={{flex:2,minWidth:120,padding:'9px 12px',borderRadius:8,border:'1px solid var(--neon)',background:'var(--neon-glow)',color:'var(--neon)',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive',letterSpacing:1}}>{o.status==='pending'?'ACEITAR PEDIDO':'AVANCAR: '+STATUS_LABEL[NEXT[o.status]]}</button>}
                  {!['cancelled','delivered','completed'].includes(o.status)&&<button onClick={e=>{e.stopPropagation();setCancelModal(o);setCancelReason('')}} style={{padding:'9px 14px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.08)',color:'#ff3333',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive'}}>CANCELAR</button>}
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
              <div><h2 className='font-bangers' style={{fontSize:20,color:'#ff3333'}}>CANCELAR PEDIDO #{cancelModal.order_number}</h2><p style={{fontSize:12,color:'var(--muted)'}}>Cliente: {cancelModal.customer_name} | {fmt(cancelModal.total)}</p></div>
            </div>
            <div style={{padding:'9px 12px',background:'rgba(255,51,51,0.06)',borderRadius:8,marginBottom:14,fontSize:12,color:'#ff8888'}}>Esta acao nao pode ser desfeita.</div>
            <div style={{marginBottom:12}}>
              <label style={LBL}>MOTIVO DO CANCELAMENTO *</label>
              <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder='Explique o motivo...' rows={3} autoFocus style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:8,padding:'10px 12px',fontSize:13,resize:'none' as const,outline:'none',boxSizing:'border-box' as const}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:14}}>
              {['Cliente nao atendeu','Fora da area','Produto em falta','Pedido duplicado'].map(r=>(
                <button key={r} onClick={()=>setCancelReason(r)} style={{padding:'7px 10px',borderRadius:8,border:cancelReason===r?'1px solid #ff3333':'1px solid var(--border)',background:cancelReason===r?'rgba(255,51,51,0.1)':'transparent',color:cancelReason===r?'#ff3333':'var(--muted)',cursor:'pointer',fontSize:11,textAlign:'left' as const}}>{r}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setCancelModal(null);setCancelReason('')}} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>VOLTAR</button>
              <button onClick={confirmCancel} style={{flex:2,padding:11,borderRadius:8,border:'none',background:'#ff3333',color:'white',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15}}>CONFIRMAR CANCELAMENTO</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW ORDER MODAL - FULL SCREEN */}
      {newModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'var(--bg)',zIndex:50,display:'flex',flexDirection:'column',overflow:'hidden'}}>

          {/* Header */}
          <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
            <Truck size={18} color='var(--neon)'/>
            <h2 className='font-bangers neon-text-sm' style={{fontSize:22}}>NOVO PEDIDO DELIVERY</h2>
            {/* Steps */}
            <div style={{display:'flex',alignItems:'center',gap:6,marginLeft:16}}>
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:20,background:newStep==='products'?'var(--neon-glow)':'transparent',border:newStep==='products'?'1px solid var(--neon)':'1px solid var(--border)'}}>
                <span style={{width:18,height:18,borderRadius:'50%',background:newStep==='products'?'var(--neon)':'var(--border)',color:newStep==='products'?'#000':'var(--muted)',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>1</span>
                <span style={{fontSize:12,color:newStep==='products'?'var(--neon)':'var(--muted)',fontFamily:'Bangers,cursive'}}>PRODUTOS</span>
              </div>
              <span style={{color:'var(--muted)',fontSize:14}}>›</span>
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:20,background:newStep==='address'?'var(--neon-glow)':'transparent',border:newStep==='address'?'1px solid var(--neon)':'1px solid var(--border)'}}>
                <span style={{width:18,height:18,borderRadius:'50%',background:newStep==='address'?'var(--neon)':'var(--border)',color:newStep==='address'?'#000':'var(--muted)',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>2</span>
                <span style={{fontSize:12,color:newStep==='address'?'var(--neon)':'var(--muted)',fontFamily:'Bangers,cursive'}}>DADOS ENTREGA</span>
              </div>
            </div>
            <button onClick={closeNew} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--muted)',cursor:'pointer',padding:4}}><X size={20}/></button>
          </div>

          {/* STEP 1 - PRODUCTS */}
          {newStep==='products'&&(
            <div style={{flex:1,display:'flex',overflow:'hidden',minHeight:0}}>
              {/* Product grid */}
              <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',background:'var(--surface)'}}>
                  <div style={{position:'relative'}}>
                    <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
                    <input value={prodSearch} onChange={e=>setProdSearch(e.target.value)} placeholder='Buscar produto...' style={{paddingLeft:28,fontSize:13}}/>
                  </div>
                </div>
                <div style={{flex:1,overflowY:'auto',padding:12,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,alignContent:'start'}}>
                  {filtProd.map(p=>(
                    <button key={p.id} onClick={()=>addToCart(p)} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:10,cursor:'pointer',textAlign:'left' as const,transition:'all 0.15s',position:'relative' as const}} className='card-hover'>
                      {p.image_url&&p.image_url.startsWith('http')
                        ?<img src={p.image_url} style={{width:'100%',height:76,objectFit:'cover' as const,borderRadius:8,marginBottom:7}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                        :<div style={{width:'100%',height:76,background:'var(--surface)',borderRadius:8,marginBottom:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'var(--muted)',opacity:0.5}}>sem foto</div>
                      }
                      <p style={{fontSize:12,fontWeight:600,color:'var(--white)',marginBottom:3,lineHeight:1.3}}>{p.name}</p>
                      <p style={{fontSize:14,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.price)}</p>
                      {cart.find(i=>i.id===p.id)&&<div style={{position:'absolute' as const,top:7,right:7,background:'var(--neon)',color:'#000',borderRadius:'50%',width:22,height:22,fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{cart.find(i=>i.id===p.id)?.qty}</div>}
                    </button>
                  ))}
                  {filtProd.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:48,color:'var(--muted)'}}>Nenhum produto</div>}
                </div>
              </div>
              {/* Cart sidebar */}
              <div style={{width:320,display:'flex',flexDirection:'column',borderLeft:'1px solid var(--border)',background:'var(--surface)',flexShrink:0,overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span className='font-bangers' style={{fontSize:16,color:'var(--neon)'}}>CARRINHO {itemCount>0?'('+itemCount+')':''}</span>
                  {cart.length>0&&<button onClick={()=>setCart([])} style={{fontSize:11,color:'#ff3333',background:'none',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive'}}>LIMPAR</button>}
                </div>
                <div style={{flex:1,overflowY:'auto',padding:'6px 14px'}}>
                  {cart.length===0?<div style={{textAlign:'center',padding:40,color:'var(--muted)'}}><ShoppingCart size={28} style={{opacity:0.3,marginBottom:8}}/><p style={{fontSize:12}}>Clique nos produtos</p></div>:
                  cart.map(item=>(
                    <div key={item.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid rgba(26,46,26,0.5)'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:12,fontWeight:600,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{item.name}</p>
                        <p style={{fontSize:11,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price)}</p>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        <button onClick={()=>updQty(item.id,-1)} style={{width:24,height:24,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={11}/></button>
                        <span style={{fontSize:13,fontWeight:700,color:'var(--white)',width:22,textAlign:'center' as const}}>{item.qty}</span>
                        <button onClick={()=>updQty(item.id,1)} style={{width:24,height:24,borderRadius:6,border:'1px solid var(--neon)',background:'var(--neon-glow)',color:'var(--neon)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={11}/></button>
                        <button onClick={()=>setCart(c=>c.filter(i=>i.id!==item.id))} style={{width:24,height:24,borderRadius:6,border:'none',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:2}}><X size={11}/></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{padding:'12px 14px',borderTop:'1px solid var(--border)',flexShrink:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',marginBottom:10}}><span>SUBTOTAL</span><span>{fmt(subtotal)}</span></div>
                  <button onClick={()=>{if(cart.length===0){toast.error('Adicione produtos');return}setNewStep('address')}} className='btn-neon-fill' style={{width:'100%',fontSize:14,padding:12}} disabled={cart.length===0}>
                    CONTINUAR: DADOS DE ENTREGA ›
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 - ADDRESS */}
          {newStep==='address'&&(
            <div style={{flex:1,overflow:'hidden',display:'flex',minHeight:0}}>
              {/* Form */}
              <div style={{flex:1,overflowY:'auto',padding:'20px 24px',maxWidth:600}}>
                <h3 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'var(--white)',letterSpacing:1,marginBottom:20}}>DADOS DE ENTREGA</h3>

                {/* Nome + Sobrenome */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                  <div><label style={LBL}>NOME *</label><input value={form.nome} onChange={e=>sf('nome',e.target.value)} placeholder='Seu nome' style={INP}/></div>
                  <div><label style={LBL}>SOBRENOME *</label><input value={form.sobrenome} onChange={e=>sf('sobrenome',e.target.value)} placeholder='Sobrenome' style={INP}/></div>
                </div>

                {/* WhatsApp */}
                <div style={{marginBottom:14}}>
                  <label style={LBL}>WHATSAPP *</label>
                  <input value={form.whatsapp} onChange={e=>sf('whatsapp',fmtWA(e.target.value))} placeholder='(27) 99999-9999' style={INP} type='tel' maxLength={15}/>
                </div>

                <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14}}>
                    <MapPin size={14} color='var(--neon)'/>
                    <p style={{fontSize:14,color:'var(--neon)',fontWeight:600,letterSpacing:'0.05em',fontFamily:'Bangers,cursive'}}>ENDERECO DE ENTREGA</p>
                  </div>

                  {/* CEP */}
                  <div style={{marginBottom:14}}>
                    <label style={LBL}>CEP *</label>
                    <div style={{position:'relative'}}>
                      <input value={fmtCEP(form.cep)} onChange={e=>handleCEP(e.target.value)} placeholder='00000-000' style={INP} type='tel' maxLength={9}/>
                      {cepLoading&&<div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)'}}><Loader2 size={16} color='var(--neon)' style={{animation:'spin 1s linear infinite'}}/></div>}
                      {!cepLoading&&form.endereco&&<div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)'}}><CheckCircle size={16} color='var(--neon)'/></div>}
                    </div>
                    <p style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Digite o CEP para preencher automaticamente</p>
                  </div>

                  {/* Frete zone info */}
                  {form.endereco&&(
                    <div style={{marginBottom:14}}>
                      {matchedZone?(
                        <div style={{padding:'10px 14px',background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <div><p style={{fontSize:13,color:'var(--white)',fontWeight:600}}>{matchedZone.name}</p><p style={{fontSize:11,color:'var(--muted)'}}>{matchedZone.min_time}-{matchedZone.max_time} min</p></div>
                          <p style={{fontSize:18,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{matchedZone.fee===0?'Gratis':fmt(matchedZone.fee)}</p>
                        </div>
                      ):(
                        <div style={{padding:'9px 14px',background:'rgba(255,170,0,0.08)',border:'1px solid rgba(255,170,0,0.3)',borderRadius:10,fontSize:12,color:'#ffaa00'}}>
                          Bairro sem frete configurado. Verifique em Bairros.
                        </div>
                      )}
                    </div>
                  )}

                  {form.endereco&&(
                    <>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 100px',gap:12,marginBottom:14}}>
                        <div><label style={LBL}>ENDERECO</label><input value={form.endereco} onChange={e=>sf('endereco',e.target.value)} style={INP}/></div>
                        <div><label style={LBL}>NUMERO *</label><input value={form.numero} onChange={e=>sf('numero',e.target.value)} placeholder='123' style={INP} autoFocus/></div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                        <div><label style={LBL}>BAIRRO</label><input value={form.bairro} onChange={e=>sf('bairro',e.target.value)} style={INP}/></div>
                        <div><label style={LBL}>CIDADE / ESTADO</label><input value={form.cidade+(form.estado?' / '+form.estado:'')} readOnly style={{...INP,color:'var(--muted)',cursor:'default' as const}}/></div>
                      </div>
                      <div style={{marginBottom:14}}><label style={LBL}>COMPLEMENTO (opcional)</label><input value={form.complemento} onChange={e=>sf('complemento',e.target.value)} placeholder='Apto 302, Bloco B...' style={INP}/></div>
                      <div><label style={LBL}>PONTO DE REFERENCIA</label><input value={form.referencia} onChange={e=>sf('referencia',e.target.value)} placeholder='Proximo ao mercado...' style={INP}/></div>
                    </>
                  )}
                </div>
              </div>

              {/* Order summary sidebar */}
              <div style={{width:300,borderLeft:'1px solid var(--border)',background:'var(--surface)',display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
                <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
                  <p className='font-bangers' style={{fontSize:15,color:'var(--neon)',letterSpacing:1}}>RESUMO DO PEDIDO</p>
                </div>
                <div style={{flex:1,overflowY:'auto',padding:'8px 16px'}}>
                  {cart.map(item=>(
                    <div key={item.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'6px 0',borderBottom:'1px solid rgba(26,46,26,0.4)'}}>
                      <span style={{color:'var(--text)'}}>{item.qty}x {item.name}</span>
                      <span style={{color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price*item.qty)}</span>
                    </div>
                  ))}
                </div>
                <div style={{padding:'12px 16px',borderTop:'1px solid var(--border)',flexShrink:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)',marginBottom:4}}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                  {delivFee>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span style={{color:'var(--muted)'}}>Frete ({matchedZone?.name})</span><span style={{color:'#f59e0b',fontFamily:'JetBrains Mono,monospace'}}>{fmt(delivFee)}</span></div>}
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:17,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',padding:'8px 0',borderTop:'1px solid var(--border)',marginTop:4,marginBottom:12}}><span>TOTAL</span><span>{fmt(cartTotal)}</span></div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>setNewStep('products')} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:13}}>VOLTAR</button>
                    <button onClick={saveOrder} disabled={saving} className='btn-neon-fill' style={{flex:2,fontSize:13,padding:10,opacity:saving?0.7:1}}>
                      <Check size={13} style={{display:'inline',marginRight:5}}/>{saving?'CRIANDO...':'CRIAR PEDIDO'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}