import{sendWhatsApp,WA_MESSAGES}from '@/lib/whatsapp'
import{useState,useEffect,useRef,useCallback}from 'react'
import{Truck,Plus,X,Check,Phone,MapPin,AlertTriangle,ChevronDown,ChevronUp,Search,Loader2,CheckCircle,Minus,ShoppingCart,Bell,BellOff,MessageCircle,Send,ExternalLink,Clock,Package,User,Copy}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Order={id:string;order_number:number;customer_name:string;customer_phone:string;status:string;total:number;subtotal:number;discount:number;delivery_fee:number;created_at:string;notes:string|null;cash_requested?:number;change_amount?:number;payment_method?:string;coupon_code?:string|null}
type Product={id:string;name:string;price:number;stock:number;image_url?:string;description?:string}
type CartItem=Product&{qty:number}
type DeliveryForm={nome:string;sobrenome:string;whatsapp:string;cep:string;numero:string;endereco:string;complemento:string;bairro:string;cidade:string;estado:string;referencia:string}
type Zone={id:string;name:string;fee:number;min_time:number;max_time:number}
type Customer={id:string;name:string;phone:string;address?:string;neighborhood?:string;zip_code?:string;complement?:string;reference?:string;orders_count:number;total_spent:number}
type ChatMsg={id:string;role:'user'|'store';text:string;ts:string}

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const STATUS_COLOR:Record<string,string>={pending:'#ffaa00',accepted:'#06b6d4',preparing:'#7c3aed',ready:'#00ff41',delivering:'#f59e0b',delivered:'#10b981',cancelled:'#ff3333',completed:'#00ff41'}
const STATUS_LABEL:Record<string,string>={pending:'AGUARDANDO',accepted:'ACEITO',preparing:'PREPARANDO',ready:'PRONTO',delivering:'A CAMINHO',delivered:'ENTREGUE',cancelled:'CANCELADO',completed:'CONCLUIDO'}
const NEXT:Record<string,string>={pending:'accepted',accepted:'preparing',preparing:'ready',ready:'delivering',delivering:'delivered'}
const EMPTY_FORM:DeliveryForm={nome:'',sobrenome:'',whatsapp:'',cep:'',numero:'',endereco:'',complemento:'',bairro:'',cidade:'',estado:'',referencia:''}
const fmtCEP=(v:string)=>v.replace(/\D/g,'').replace(/(\d{5})(\d{3})/,'$1-$2')
const fmtWA=(v:string)=>{const n=v.replace(/\D/g,'').substring(0,11);if(n.length<=2)return n;if(n.length<=7)return '('+n.slice(0,2)+') '+n.slice(2);return '('+n.slice(0,2)+') '+n.slice(2,7)+'-'+n.slice(7)}
const INP={width:'100%',background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'11px 14px',color:'var(--text)',fontSize:14,outline:'none',boxSizing:'border-box' as const}
const LBL={fontSize:11,color:'var(--muted)',display:'block' as const,marginBottom:5,fontWeight:600,letterSpacing:'0.06em'}

export default function DeliveryPage({soundOnRef}:{soundOnRef?:React.MutableRefObject<boolean>}={}){
  const[orders,setOrders]=useState<Order[]>([])
  const[products,setProducts]=useState<Product[]>([])
  const[zones,setZones]=useState<Zone[]>([])
  const[loading,setLoading]=useState(true)
  const[expanded,setExpanded]=useState<string|null>(null)
  const[itemsCache,setItemsCache]=useState<Record<string,any[]>>({})
  const[search,setSearch]=useState('')
  const[statusFilter,setStatusFilter]=useState<'pending'|'active'|'done'|'all'>('pending')
  const[cancelModal,setCancelModal]=useState<Order|null>(null)
  const[cancelReason,setCancelReason]=useState('')
  const[newModal,setNewModal]=useState(false)
  const[newStep,setNewStep]=useState<'products'|'address'>('products')
  const[cart,setCart]=useState<CartItem[]>([])
  const[prodSearch,setProdSearch]=useState('')
  const[form,setForm]=useState<DeliveryForm>(EMPTY_FORM)
  const[customerFound,setCustomerFound]=useState<Customer|null>(null)
  const[searchingCustomer,setSearchingCustomer]=useState(false)
  const[cashRequested,setCashRequested]=useState('')
  const[payMethodDelivery,setPayMethodDelivery]=useState('pix')
  const[cepLoading,setCepLoading]=useState(false)
  const[matchedZone,setMatchedZone]=useState<Zone|null>(null)
  const[saving,setSaving]=useState(false)
  // Sound alarm
  const[soundOn,setSoundOn]=useState(true)
  // Sync local soundOn state with App-level ref
  useEffect(()=>{if(soundOnRef)soundOnRef.current=soundOn},[soundOn,soundOnRef])
  const[pendingCount,setPendingCount]=useState(0)
  const audioRef=useRef<AudioContext|null>(null)
  // Chat
  const[chatOrder,setChatOrder]=useState<Order|null>(null)
  const[chatMsgs,setChatMsgs]=useState<ChatMsg[]>([])
  const[chatInput,setChatInput]=useState('')
  const[chatSending,setChatSending]=useState(false)
  const prevPendingRef=useRef(0)

  useEffect(()=>{loadData();const i=setInterval(loadData,15000);return()=>clearInterval(i)},[])

  function playAlarm(){} // alarm is now handled globally in App.tsx

  async function loadData(){
    const[o,p,z]=await Promise.all([
      supabase.from('orders').select('*').eq('type','delivery').order('created_at',{ascending:false}).limit(150),
      supabase.from('products').select('*').eq('active',true).order('name'),
      supabase.from('delivery_zones').select('*').eq('active',true).order('name')
    ])
    const newOrders=o.data||[]
    setOrders(newOrders);setProducts(p.data||[]);setZones(z.data||[])
    setLoading(false)
    const pending=newOrders.filter(x=>x.status==='pending').length
    setPendingCount(pending)
    // alarm now handled by App.tsx global polling
    prevPendingRef.current=pending
  }

  async function searchCustomerByPhone(phone:string){
    if(!phone||phone.replace(/\D/g,'').length<8)return
    setSearchingCustomer(true)
    const{data}=await supabase.from('customers').select('*').eq('phone',phone.replace(/\D/g,'')).maybeSingle()
    if(data){
      setCustomerFound(data)
      const nameParts=(data.name||'').split(' ')
      setForm(f=>({...f,
        nome:nameParts[0]||f.nome,
        sobrenome:nameParts.slice(1).join(' ')||f.sobrenome,
        whatsapp:data.phone?fmtWA(data.phone):f.whatsapp,
        bairro:data.neighborhood||f.bairro,
        cep:data.zip_code||f.cep,
        complemento:data.complement||f.complemento,
        referencia:data.reference||f.referencia,
      }))
      toast.success('Cliente: '+data.name+' | '+data.orders_count+' pedidos')
    }else{setCustomerFound(null)}
    setSearchingCustomer(false)
  }

  async function expandOrder(id:string){
    if(expanded===id){setExpanded(null);return}
    setExpanded(id)
    if(!itemsCache[id]){
      const{data}=await supabase.from('order_items').select('*').eq('order_id',id)
      setItemsCache(c=>({...c,[id]:data||[]}))
    }
  }

  async function updateStatus(orderId:string,status:string){
    await supabase.from('orders').update({status}).eq('id',orderId)
    // Devolver estoque ao cancelar pedido
    if(status==='cancelled'){
      try{
        const{data:items}=await supabase.from('order_items').select('product_id,quantity,variant_id').eq('order_id',orderId)
        for(const item of(items||[])){
          if(item.variant_id){
            const{data:vr}=await supabase.from('product_variants').select('stock').eq('id',item.variant_id).single()
            if(vr)await supabase.from('product_variants').update({stock:(vr.stock||0)+item.quantity}).eq('id',item.variant_id)
          }else if(item.product_id){
            const{data:pr}=await supabase.from('products').select('stock').eq('id',item.product_id).single()
            if(pr)await supabase.from('products').update({stock:(pr.stock||0)+item.quantity}).eq('id',item.product_id)
          }
        }
      }catch(e){console.error('Erro ao restaurar estoque:',e)}
    }
    loadData()
  }

  async function confirmCancel(){
    if(!cancelModal)return
    if(!cancelReason.trim()){toast.error('Informe o motivo');return}
    await supabase.from('orders').update({status:'cancelled',cancel_reason:cancelReason,cancelled_at:new Date().toISOString()}).eq('id',cancelModal.id)
    toast.success('Pedido cancelado');setCancelModal(null);setCancelReason('');loadData()
  }

  // Chat functions
  function openChat(order:Order){
    setChatOrder(order)
    setChatMsgs([
      {id:'1',role:'store',text:'Chat com '+order.customer_name+' | Pedido #'+order.order_number,ts:order.created_at},
    ])
  }

  async function sendChat(){
    if(!chatInput.trim()||!chatOrder)return
    setChatSending(true)
    const msg=chatInput.trim();setChatInput('')
    setChatMsgs(m=>[...m,{id:Date.now()+'',role:'store',text:msg,ts:new Date().toISOString()}])
    const sent=await sendWhatsApp(chatOrder.customer_phone,msg)
    if(!sent)toast.error('Falha ao enviar WhatsApp — configure a API em Configuracoes')
    setChatSending(false)
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
      if(z)toast.success('Frete: '+fmt(z.fee))
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
      const phoneClean=form.whatsapp.replace(/\D/g,'')
      if(phoneClean.length>=8){
        const custData={name:form.nome+' '+form.sobrenome,phone:phoneClean,address:form.endereco+', '+form.numero,neighborhood:form.bairro,zip_code:form.cep,complement:form.complemento,reference:form.referencia,updated_at:new Date().toISOString()}
        const{data:existCust}=await supabase.from('customers').select('id,orders_count,total_spent').eq('phone',phoneClean).maybeSingle()
        if(existCust){await supabase.from('customers').update({...custData,orders_count:(existCust.orders_count||0)+1,total_spent:(Number(existCust.total_spent)||0)+cartTotal}).eq('id',existCust.id)}
        else{await supabase.from('customers').insert({...custData,orders_count:1,total_spent:cartTotal})}
      }
      const{data:order,error}=await supabase.from('orders').insert({
        customer_name:form.nome+' '+form.sobrenome,
        customer_phone:form.whatsapp,
        type:'delivery',status:'pending',
        cash_requested:payMethodDelivery==='dinheiro'?(parseFloat(cashRequested)||0):0,
        change_amount:payMethodDelivery==='dinheiro'&&cashRequested?(Math.max(0,(parseFloat(cashRequested)||0)-cartTotal)):0,
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

  const FILTERS=[
    {k:'pending',l:'Pendentes',count:orders.filter(o=>o.status==='pending').length,color:'#ffaa00'},
    {k:'active',l:'Ativos',count:orders.filter(o=>['accepted','preparing','ready','delivering'].includes(o.status)).length,color:'var(--neon)'},
    {k:'done',l:'Finalizados',count:orders.filter(o=>['delivered','completed','cancelled'].includes(o.status)).length,color:'var(--muted)'},
    {k:'all',l:'Todos',count:orders.length,color:'var(--muted)'},
  ]

  const filteredOrders=orders.filter(o=>{
    if(statusFilter==='pending')return o.status==='pending'
    if(statusFilter==='active')return['accepted','preparing','ready','delivering'].includes(o.status)
    if(statusFilter==='done')return['delivered','completed','cancelled'].includes(o.status)
    return true
  }).filter(o=>!search||(o.customer_name||'').toLowerCase().includes(search.toLowerCase())||String(o.order_number).includes(search))

  const filtProd=products.filter(p=>!prodSearch||p.name.toLowerCase().includes(prodSearch.toLowerCase()))
  const catalogUrl=window.location.origin+'/menu'

  function closeNew(){setNewModal(false);setCart([]);setForm(EMPTY_FORM);setMatchedZone(null);setNewStep('products')}

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',flexShrink:0}}>
        <Truck size={18} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:24}}>DELIVERY</h1>
        {/* Alarm toggle */}
        <button onClick={()=>setSoundOn(v=>!v)} title={soundOn?'Desativar alarme':'Ativar alarme'} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:8,border:soundOn?'1px solid var(--neon)':'1px solid var(--border)',background:soundOn?'var(--neon-glow)':'transparent',color:soundOn?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>
          {soundOn?<Bell size={13}/>:<BellOff size={13}/>}{soundOn?'SOM ON':'SOM OFF'}
        </button>
        {/* Catalog link */}
        <a href={catalogUrl} target='_blank' rel='noopener noreferrer' style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:8,border:'1px solid var(--border)',color:'var(--muted)',textDecoration:'none',fontSize:11,fontFamily:'Bangers,cursive'}}>
          <ExternalLink size={12}/>CATALOGO
        </a>
        <button onClick={()=>{navigator.clipboard.writeText(catalogUrl);toast.success('Link copiado!')}} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 8px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:11}}>
          <Copy size={12}/>
        </button>
        {/* Search */}
        <div style={{position:'relative',flex:1,minWidth:140,maxWidth:220}}>
          <Search size={13} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar pedido...' style={{paddingLeft:28,fontSize:12}}/>
        </div>
        <button onClick={()=>setNewModal(true)} className='btn-neon-fill' style={{marginLeft:'auto',fontSize:12,padding:'7px 14px',display:'flex',alignItems:'center',gap:5}}>
          <Plus size={13}/>NOVO PEDIDO
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--border)',background:'var(--surface)',flexShrink:0}}>
        {FILTERS.map(f=>(
          <button key={f.k} onClick={()=>setStatusFilter(f.k as any)} style={{flex:1,padding:'10px 8px',border:'none',borderBottom:statusFilter===f.k?'2px solid '+(f.k==='pending'?'#ffaa00':'var(--neon)'):'2px solid transparent',background:'transparent',color:statusFilter===f.k?(f.k==='pending'?'#ffaa00':'var(--neon)'):'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',letterSpacing:0.5,transition:'all 0.15s',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
            {f.k==='pending'&&f.count>0&&<span style={{width:18,height:18,borderRadius:'50%',background:'#ffaa00',color:'#000',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',animation:'neon-pulse 1s ease-in-out infinite'}}>{f.count}</span>}
            {f.l}
            {f.k!=='pending'&&<span style={{fontSize:10,color:'var(--muted)',marginLeft:2}}>({f.count})</span>}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div style={{flex:1,overflowY:'auto',padding:'10px 14px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        filteredOrders.length===0?(
          <div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>
            <Truck size={36} style={{opacity:0.2,marginBottom:10}}/>
            <p style={{fontFamily:'Bangers,cursive',fontSize:16}}>
              {statusFilter==='pending'?'Nenhum pedido pendente':'Nenhum pedido'}
            </p>
            {statusFilter==='pending'&&<p style={{fontSize:12,marginTop:6,opacity:0.6}}>Novos pedidos aparecem aqui automaticamente</p>}
          </div>
        ):
        filteredOrders.map(o=>(
          <div key={o.id} className='card' style={{marginBottom:8,overflow:'hidden',borderLeft:'3px solid '+(STATUS_COLOR[o.status]||'var(--border)'),boxShadow:o.status==='pending'?'0 0 12px rgba(255,170,0,0.15)':'none'}}>
            <div onClick={()=>expandOrder(o.id)} style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',flexWrap:'wrap'}}>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'var(--neon)',minWidth:34}}>#{o.order_number}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{o.customer_name}</p>
                  {o.status==='pending'&&<span style={{fontSize:9,padding:'1px 5px',borderRadius:4,background:'rgba(255,170,0,0.15)',color:'#ffaa00',fontWeight:700}}>NOVO</span>}
                </div>
                <div style={{display:'flex',gap:8,marginTop:2,flexWrap:'wrap'}}>
                  {o.customer_phone&&<span style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:3}}><Phone size={9}/>{o.customer_phone}</span>}
                  <span style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:3}}><Clock size={9}/>{new Date(o.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              </div>
              <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,background:(STATUS_COLOR[o.status]||'#888')+'22',color:STATUS_COLOR[o.status]||'#888',whiteSpace:'nowrap'}}>{STATUS_LABEL[o.status]||o.status}</span>
              <span style={{fontSize:15,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(o.total)}</span>
              {expanded===o.id?<ChevronUp size={14} color='var(--muted)'/>:<ChevronDown size={14} color='var(--muted)'/>}
            </div>
            {expanded===o.id&&(
              <div style={{padding:'0 14px 12px',borderTop:'1px solid var(--border)'}}>
                {o.notes&&<div style={{padding:'7px 10px',background:'var(--surface)',borderRadius:7,marginBottom:8,fontSize:12,color:'var(--text)',display:'flex',gap:6}}><MapPin size={11} style={{flexShrink:0,marginTop:1,color:'var(--muted)'}}/><span>{o.notes}</span></div>}
                {/* Pagamento + Cupom */}
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                    {o.payment_method&&(
                      <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:6,background:'rgba(6,182,212,0.1)',border:'1px solid rgba(6,182,212,0.2)'}}>
                        <span style={{fontSize:13}}>{o.payment_method==='pix'?'💚':o.payment_method==='dinheiro'?'💵':o.payment_method==='debito'?'💳':o.payment_method==='credito'?'💳':'💳'}</span>
                        <span style={{fontSize:12,fontWeight:700,color:'#06b6d4',textTransform:'capitalize' as const}}>{o.payment_method==='pix'?'PIX':o.payment_method==='dinheiro'?'Dinheiro':o.payment_method==='debito'?'Débito':o.payment_method==='credito'?'Crédito':o.payment_method}</span>
                      </div>
                    )}
                    {o.coupon_code&&(
                      <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:6,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)'}}>
                        <span style={{fontSize:11}}>🏷️</span>
                        <span style={{fontSize:12,fontWeight:700,color:'#f59e0b'}}>Cupom: {o.coupon_code}</span>
                        {o.discount>0&&<span style={{fontSize:11,color:'#f59e0b',opacity:0.8}}>(-{fmt(o.discount)})</span>}
                      </div>
                    )}
                    {!o.coupon_code&&o.payment_method&&(
                      <div style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:6,background:'rgba(100,100,100,0.08)',border:'1px solid rgba(100,100,100,0.15)'}}>
                        <span style={{fontSize:10,color:'var(--muted)'}}>Sem cupom</span>
                      </div>
                    )}
                  </div>
                  {o.cash_requested>0&&<div style={{padding:'5px 10px',background:'rgba(16,185,129,0.08)',borderRadius:7,marginBottom:8,fontSize:12,color:'#10b981',display:'flex',justifyContent:'space-between'}}><span>Pagar em dinheiro</span><span style={{fontWeight:700}}>Trazer: {fmt(o.cash_requested)} | Troco: {fmt(Math.max(0,o.cash_requested-o.total))}</span></div>}
                <div style={{marginBottom:8}}>{(itemsCache[o.id]||[]).map(i=>(<div key={i.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'2px 0'}}><span style={{color:'var(--text)'}}>{i.quantity}x {i.product_name}</span><span style={{color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(i.total_price)}</span></div>))}</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {o.status==='pending'&&(
                    <>
                      <button onClick={()=>updateStatus(o.id,'accepted')} style={{flex:2,minWidth:100,padding:'8px 10px',borderRadius:8,border:'none',background:'var(--neon)',color:'#000',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive',letterSpacing:1}}>✓ ACEITAR</button>
                      <button onClick={e=>{e.stopPropagation();setCancelModal(o);setCancelReason('')}} style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.08)',color:'#ff3333',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive'}}>RECUSAR</button>
                    </>
                  )}
                  {NEXT[o.status]&&o.status!=='pending'&&<button onClick={()=>updateStatus(o.id,NEXT[o.status])} style={{flex:2,minWidth:100,padding:'8px 10px',borderRadius:8,border:'1px solid var(--neon)',background:'var(--neon-glow)',color:'var(--neon)',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive',letterSpacing:1}}>AVANCAR: {STATUS_LABEL[NEXT[o.status]]}</button>}
                  {!['cancelled','delivered','completed'].includes(o.status)&&o.status!=='pending'&&<button onClick={e=>{e.stopPropagation();setCancelModal(o);setCancelReason('')}} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.08)',color:'#ff3333',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive'}}>CANCELAR</button>}
                  {o.customer_phone&&<button onClick={e=>{e.stopPropagation();openChat(o)}} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #25D366',background:'rgba(37,211,102,0.08)',color:'#25D366',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive',display:'flex',alignItems:'center',gap:5}}><MessageCircle size={13}/>CHAT</button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CANCEL MODAL */}
      {cancelModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:420,padding:22,border:'2px solid #ff3333'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <AlertTriangle size={18} color='#ff3333'/>
              <h2 className='font-bangers' style={{fontSize:18,color:'#ff3333'}}>{cancelModal.status==='pending'?'RECUSAR':'CANCELAR'} PEDIDO #{cancelModal.order_number}</h2>
            </div>
            <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder='Motivo...' rows={3} autoFocus style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:8,padding:'10px 12px',fontSize:13,resize:'none' as const,outline:'none',boxSizing:'border-box' as const,marginBottom:10}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12}}>
              {['Cliente nao atendeu','Fora da area','Produto em falta','Pedido duplicado'].map(r=>(<button key={r} onClick={()=>setCancelReason(r)} style={{padding:'6px 8px',borderRadius:7,border:cancelReason===r?'1px solid #ff3333':'1px solid var(--border)',background:cancelReason===r?'rgba(255,51,51,0.1)':'transparent',color:cancelReason===r?'#ff3333':'var(--muted)',cursor:'pointer',fontSize:11,textAlign:'left' as const}}>{r}</button>))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setCancelModal(null);setCancelReason('')}} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>VOLTAR</button>
              <button onClick={confirmCancel} style={{flex:2,padding:10,borderRadius:8,border:'none',background:'#ff3333',color:'white',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT MODAL */}
      {chatOrder&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:440,display:'flex',flexDirection:'column',height:480,border:'1px solid #25D366'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
              <MessageCircle size={16} color='#25D366'/>
              <div style={{flex:1}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{chatOrder.customer_name}</p>
                <p style={{fontSize:11,color:'var(--muted)'}}>{chatOrder.customer_phone} | Pedido #{chatOrder.order_number}</p>
              </div>
              <button onClick={()=>setChatOrder(null)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={16}/></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:8}}>
              <div style={{padding:'8px 10px',background:'rgba(37,211,102,0.06)',borderRadius:8,border:'1px solid rgba(37,211,102,0.15)',fontSize:12,color:'var(--muted)',textAlign:'center'}}>
                As mensagens sao enviadas via WhatsApp para {chatOrder.customer_phone}
              </div>
              {/* Quick messages */}
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {[
                  'Seu pedido foi aceito!',
                  'Estamos preparando seu pedido.',
                  'Seu pedido saiu para entrega!',
                  'Pedido entregue. Obrigado!',
                  'Qual o seu endereço completo?',
                  'Aguarde, em breve retornamos.',
                ].map(t=>(<button key={t} onClick={()=>setChatInput(t)} style={{padding:'4px 8px',borderRadius:6,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--muted)',cursor:'pointer',fontSize:10}}>{t}</button>))}
              </div>
              {chatMsgs.slice(1).map(m=>(
                <div key={m.id} style={{alignSelf:m.role==='store'?'flex-end':'flex-start',maxWidth:'80%'}}>
                  <div style={{padding:'8px 12px',borderRadius:10,background:m.role==='store'?'#25D366':'var(--surface)',color:m.role==='store'?'#000':'var(--text)',fontSize:13}}>{m.text}</div>
                  <p style={{fontSize:10,color:'var(--muted)',marginTop:2,textAlign:m.role==='store'?'right':'left'}}>{new Date(m.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p>
                </div>
              ))}
            </div>
            <div style={{padding:12,borderTop:'1px solid var(--border)',display:'flex',gap:8}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder='Mensagem para o cliente...' style={{flex:1,fontSize:13}}/>
              <button onClick={sendChat} disabled={chatSending||!chatInput.trim()} style={{padding:'8px 14px',borderRadius:8,border:'none',background:'#25D366',color:'#000',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontFamily:'Bangers,cursive',fontSize:13,opacity:chatInput.trim()?1:0.4}}>
                {chatSending?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<Send size={14}/>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW ORDER MODAL */}
      {newModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'var(--bg)',zIndex:50,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <Truck size={16} color='var(--neon)'/>
            <h2 className='font-bangers neon-text-sm' style={{fontSize:20}}>NOVO PEDIDO DELIVERY</h2>
            <div style={{display:'flex',alignItems:'center',gap:5,marginLeft:12}}>
              {(['products','address'] as const).map((s,i)=>(
                <div key={s} style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:16,background:newStep===s?'var(--neon-glow)':'transparent',border:newStep===s?'1px solid var(--neon)':'1px solid var(--border)'}}>
                    <span style={{width:16,height:16,borderRadius:'50%',background:newStep===s?'var(--neon)':'var(--border)',color:newStep===s?'#000':'var(--muted)',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{i+1}</span>
                    <span style={{fontSize:11,color:newStep===s?'var(--neon)':'var(--muted)',fontFamily:'Bangers,cursive'}}>{s==='products'?'PRODUTOS':'ENTREGA'}</span>
                  </div>
                  {i===0&&<span style={{color:'var(--muted)',fontSize:12}}>›</span>}
                </div>
              ))}
            </div>
            <button onClick={closeNew} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={18}/></button>
          </div>

          {newStep==='products'&&(
            <div style={{flex:1,display:'flex',overflow:'hidden',minHeight:0}}>
              <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                <div style={{padding:'8px 12px',borderBottom:'1px solid var(--border)',background:'var(--surface)'}}>
                  <div style={{position:'relative'}}>
                    <Search size={12} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
                    <input value={prodSearch} onChange={e=>setProdSearch(e.target.value)} placeholder='Buscar produto...' style={{paddingLeft:26,fontSize:13}}/>
                  </div>
                </div>
                <div style={{flex:1,overflowY:'auto',padding:10,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8,alignContent:'start'}}>
                  {filtProd.map(p=>(<button key={p.id} onClick={()=>addToCart(p)} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:8,cursor:'pointer',textAlign:'left' as const,position:'relative' as const}} className='card-hover'>
                    {p.image_url&&p.image_url.startsWith('http')?<img src={p.image_url} style={{width:'100%',height:68,objectFit:'cover' as const,borderRadius:7,marginBottom:6}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>:<div style={{width:'100%',height:68,background:'var(--surface)',borderRadius:7,marginBottom:6,display:'flex',alignItems:'center',justifyContent:'center'}}><Package size={20} color='var(--muted)' style={{opacity:0.3}}/></div>}
                    <p style={{fontSize:11,fontWeight:600,color:'var(--white)',marginBottom:2,lineHeight:1.2}}>{p.name}</p>
                    <p style={{fontSize:13,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.price)}</p>
                    {cart.find(i=>i.id===p.id)&&<div style={{position:'absolute' as const,top:6,right:6,background:'var(--neon)',color:'#000',borderRadius:'50%',width:20,height:20,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{cart.find(i=>i.id===p.id)?.qty}</div>}
                  </button>))}
                </div>
              </div>
              <div style={{width:290,display:'flex',flexDirection:'column',borderLeft:'1px solid var(--border)',background:'var(--surface)',flexShrink:0,overflow:'hidden'}}>
                <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span className='font-bangers' style={{fontSize:15,color:'var(--neon)'}}>CARRINHO {itemCount>0?'('+itemCount+')':''}</span>
                  {cart.length>0&&<button onClick={()=>setCart([])} style={{fontSize:11,color:'#ff3333',background:'none',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive'}}>LIMPAR</button>}
                </div>
                <div style={{flex:1,overflowY:'auto',padding:'4px 12px'}}>
                  {cart.length===0?<div style={{textAlign:'center',padding:32,color:'var(--muted)'}}><ShoppingCart size={24} style={{opacity:0.3,marginBottom:6}}/><p style={{fontSize:12}}>Selecione produtos</p></div>:
                  cart.map(item=>(<div key={item.id} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 0',borderBottom:'1px solid rgba(26,46,26,0.4)'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:12,fontWeight:600,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{item.name}</p>
                      <p style={{fontSize:11,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price)}</p>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:3}}>
                      <button onClick={()=>updQty(item.id,-1)} style={{width:22,height:22,borderRadius:5,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={10}/></button>
                      <span style={{fontSize:13,fontWeight:700,color:'var(--white)',width:20,textAlign:'center' as const}}>{item.qty}</span>
                      <button onClick={()=>updQty(item.id,1)} style={{width:22,height:22,borderRadius:5,border:'1px solid var(--neon)',background:'var(--neon-glow)',color:'var(--neon)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={10}/></button>
                      <button onClick={()=>setCart(c=>c.filter(i=>i.id!==item.id))} style={{width:22,height:22,borderRadius:5,border:'none',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:2}}><X size={10}/></button>
                    </div>
                  </div>))}
                </div>
                <div style={{padding:'10px 12px',borderTop:'1px solid var(--border)',flexShrink:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',marginBottom:8}}><span>SUBTOTAL</span><span>{fmt(subtotal)}</span></div>
                  <button onClick={()=>{if(cart.length===0){toast.error('Adicione produtos');return}setNewStep('address')}} className='btn-neon-fill' style={{width:'100%',fontSize:13,padding:10}} disabled={cart.length===0}>CONTINUAR ›</button>
                </div>
              </div>
            </div>
          )}

          {newStep==='address'&&(
            <div style={{flex:1,overflow:'hidden',display:'flex',minHeight:0}}>
              <div style={{flex:1,overflowY:'auto',padding:'16px 20px',maxWidth:560}}>
                <h3 style={{fontFamily:'Bangers,cursive',fontSize:18,color:'var(--white)',letterSpacing:1,marginBottom:14}}>DADOS DE ENTREGA</h3>
                {/* Customer search */}
                <div style={{marginBottom:14,padding:'10px 12px',background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)'}}>
                  <label style={LBL}>BUSCAR CLIENTE POR WHATSAPP</label>
                  <div style={{display:'flex',gap:7,alignItems:'center'}}>
                    <input value={form.whatsapp} onChange={e=>{sf('whatsapp',fmtWA(e.target.value));if(e.target.value.replace(/\D/g,'').length>=10)searchCustomerByPhone(e.target.value)}} placeholder='(27) 99999-9999' style={INP} type='tel' maxLength={15}/>
                    {searchingCustomer&&<Loader2 size={15} color='var(--neon)' style={{animation:'spin 1s linear infinite',flexShrink:0}}/>}
                    {customerFound&&<CheckCircle size={15} color='#25D366' style={{flexShrink:0}}/>}
                  </div>
                  {customerFound&&(
                    <div style={{marginTop:8,padding:'8px 10px',background:'rgba(37,211,102,0.06)',borderRadius:7,border:'1px solid rgba(37,211,102,0.2)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                        <User size={12} color='#25D366'/>
                        <span style={{fontSize:12,fontWeight:600,color:'#25D366'}}>{customerFound.name}</span>
                        <span style={{fontSize:11,color:'var(--muted)'}}>| {customerFound.orders_count} pedidos</span>
                        <span style={{fontSize:11,color:'var(--muted)'}}>| Total: {fmt(Number(customerFound.total_spent))}</span>
                      </div>
                      {customerFound.neighborhood&&<p style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:4}}><MapPin size={10}/>Bairro: {customerFound.neighborhood}</p>}
                    </div>
                  )}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                  <div><label style={LBL}>NOME *</label><input value={form.nome} onChange={e=>sf('nome',e.target.value)} placeholder='Nome' style={INP}/></div>
                  <div><label style={LBL}>SOBRENOME *</label><input value={form.sobrenome} onChange={e=>sf('sobrenome',e.target.value)} placeholder='Sobrenome' style={INP}/></div>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={LBL}>CEP *</label>
                  <div style={{position:'relative'}}>
                    <input value={fmtCEP(form.cep)} onChange={e=>handleCEP(e.target.value)} placeholder='00000-000' style={INP} type='tel' maxLength={9}/>
                    {cepLoading&&<Loader2 size={14} color='var(--neon)' style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',animation:'spin 1s linear infinite'}}/>}
                    {!cepLoading&&form.endereco&&<CheckCircle size={14} color='var(--neon)' style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)'}}/>}
                  </div>
                </div>
                {matchedZone&&<div style={{padding:'8px 12px',background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',borderRadius:8,marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><p style={{fontSize:12,color:'var(--white)',fontWeight:600}}>{matchedZone.name}</p><p style={{fontSize:10,color:'var(--muted)'}}>{matchedZone.min_time}-{matchedZone.max_time} min</p></div><p style={{fontSize:16,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{matchedZone.fee===0?'Gratis':fmt(matchedZone.fee)}</p></div>}
                {form.endereco&&(<>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 90px',gap:10,marginBottom:10}}>
                    <div><label style={LBL}>ENDERECO</label><input value={form.endereco} onChange={e=>sf('endereco',e.target.value)} style={INP}/></div>
                    <div><label style={LBL}>NUMERO *</label><input value={form.numero} onChange={e=>sf('numero',e.target.value)} placeholder='123' style={INP} autoFocus/></div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                    <div><label style={LBL}>BAIRRO</label><input value={form.bairro} onChange={e=>sf('bairro',e.target.value)} style={INP}/></div>
                    <div><label style={LBL}>CIDADE/ESTADO</label><input value={form.cidade+(form.estado?' / '+form.estado:'')} readOnly style={{...INP,color:'var(--muted)',cursor:'default' as const}}/></div>
                  </div>
                  <div style={{marginBottom:10}}><label style={LBL}>COMPLEMENTO</label><input value={form.complemento} onChange={e=>sf('complemento',e.target.value)} placeholder='Apto, Bloco...' style={INP}/></div>
                  <div><label style={LBL}>REFERENCIA</label><input value={form.referencia} onChange={e=>sf('referencia',e.target.value)} placeholder='Proximo a...' style={INP}/></div>
                </>)}
              </div>
              <div style={{width:280,borderLeft:'1px solid var(--border)',background:'var(--surface)',display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
                <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)'}}><p className='font-bangers' style={{fontSize:14,color:'var(--neon)',letterSpacing:1}}>RESUMO</p></div>
                <div style={{flex:1,overflowY:'auto',padding:'6px 14px'}}>
                  {cart.map(item=>(<div key={item.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'5px 0',borderBottom:'1px solid rgba(26,46,26,0.3)'}}><span style={{color:'var(--text)'}}>{item.qty}x {item.name}</span><span style={{color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price*item.qty)}</span></div>))}
                </div>
                <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)',flexShrink:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)',marginBottom:3}}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                  {delivFee>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}><span style={{color:'var(--muted)'}}>Frete</span><span style={{color:'#f59e0b',fontFamily:'JetBrains Mono,monospace'}}>{fmt(delivFee)}</span></div>}
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',padding:'7px 0',borderTop:'1px solid var(--border)',marginBottom:10}}><span>TOTAL</span><span>{fmt(cartTotal)}</span></div>
                  <div style={{marginBottom:10}}>
                    <label style={{...LBL,marginBottom:5}}>PAGAMENTO</label>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                      {[{k:'pix',l:'PIX'},{k:'dinheiro',l:'Dinheiro'},{k:'debito',l:'Debito'},{k:'credito',l:'Credito'}].map(m=>(<button key={m.k} onClick={()=>setPayMethodDelivery(m.k)} style={{padding:'4px 9px',borderRadius:7,border:payMethodDelivery===m.k?'1px solid var(--neon)':'1px solid var(--border)',background:payMethodDelivery===m.k?'var(--neon-glow)':'transparent',color:payMethodDelivery===m.k?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>{m.l}</button>))}
                    </div>
                    {payMethodDelivery==='dinheiro'&&(<div style={{marginTop:7}}>
                      <label style={{...LBL,marginBottom:3}}>CLIENTE PAGA COM R$</label>
                      <input type='number' min={cartTotal} step='0.01' value={cashRequested} onChange={e=>setCashRequested(e.target.value)} placeholder={cartTotal.toFixed(2)} style={{width:'100%',background:'var(--card)',border:'1px solid var(--border)',borderRadius:7,padding:'7px 10px',color:'var(--text)',fontSize:13,outline:'none'}}/>
                      {cashRequested&&parseFloat(cashRequested)>cartTotal&&<p style={{fontSize:12,color:'#10b981',marginTop:3,fontWeight:600}}>Troco: {fmt(parseFloat(cashRequested)-cartTotal)}</p>}
                    </div>)}
                  </div>
                  <div style={{display:'flex',gap:7}}>
                    <button onClick={()=>setNewStep('products')} style={{flex:1,padding:9,borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:12}}>VOLTAR</button>
                    <button onClick={saveOrder} disabled={saving} className='btn-neon-fill' style={{flex:2,fontSize:13,padding:9,opacity:saving?0.7:1}}>
                      <Check size={12} style={{display:'inline',marginRight:4}}/>{saving?'CRIANDO...':'CRIAR PEDIDO'}
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