import{useState,useEffect,useCallback}from 'react'
import{ShoppingCart,Search,X,Plus,Minus,MapPin,Phone,Layers,Check,ChevronLeft,AlertCircle}from 'lucide-react'
import{supabase}from '@/lib/supabase'
type Category={id:string;name:string;color:string;sort_order:number}
type Variant={id:string;name:string;stock:number;price_modifier:number}
type Product={id:string;name:string;description:string;price:number;promo_price:number|null;is_promo:boolean;stock:number;image_url:string;category_id:string;has_sizes:boolean;active:boolean}
type CartItem={product_id:string;variant_id?:string;name:string;variant_name?:string;price:number;qty:number;maxStock:number}
type Zone={id:string;name:string;fee:number}
type Settings={store_name:string;store_description:string;promo_title:string;promo_description:string;store_logo_url:string;store_banner_url:string;whatsapp:string;min_order:number}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
export default function PublicMenuPage(){
  const[cats,setCats]=useState<Category[]>([])
  const[products,setProducts]=useState<Product[]>([])
  const[variantsMap,setVariantsMap]=useState<Record<string,Variant[]>>({})
  const[zones,setZones]=useState<Zone[]>([])
  const[settings,setSettings]=useState<Settings>({store_name:'KURMO PDV',store_description:'',promo_title:'',promo_description:'',store_logo_url:'',store_banner_url:'',whatsapp:'',min_order:0})
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[selectedCat,setSelectedCat]=useState<string|null>(null)
  const[cart,setCart]=useState<CartItem[]>([])
  const[cartOpen,setCartOpen]=useState(false)
  const[variantModal,setVariantModal]=useState<Product|null>(null)
  const[selVariant,setSelVariant]=useState('')
  const[variantQty,setVariantQty]=useState(1)
  const[checkoutOpen,setCheckoutOpen]=useState(false)
  // Customer form
  const[name,setName]=useState('')
  const[phone,setPhone]=useState('')
  const[cep,setCep]=useState('')
  const[cepLoading,setCepLoading]=useState(false)
  const[street,setStreet]=useState('')
  const[num,setNum]=useState('')
  const[complement,setComplement]=useState('')
  const[neighborhood,setNeighborhood]=useState('')
  const[selectedZone,setSelectedZone]=useState<Zone|null>(null)
  const[notes,setNotes]=useState('')
  const[payMethod,setPayMethod]=useState('pix')
  const[needChange,setNeedChange]=useState('')
  const[submitting,setSubmitting]=useState(false)
  const[orderDone,setOrderDone]=useState<any>(null)
  const[storeOpen,setStoreOpen]=useState(true)
  const[storeHours,setStoreHours]=useState('')
  useEffect(()=>{load()},[])
  async function load(){
    setLoading(true)
    const[p,c,s,sched,v,z]=await Promise.all([
      supabase.from('products').select('*').eq('active',true),
      supabase.from('categories').select('*').eq('active',true).order('sort_order',{ascending:true}).order('name'),
      supabase.from('store_settings').select('*').limit(1).maybeSingle(),
      supabase.from('store_schedule').select('*').order('day_of_week'),
      supabase.from('product_variants').select('*').eq('active',true).order('sort_order'),
      supabase.from('delivery_zones').select('*').eq('active',true).order('name')
    ])
    setProducts(p.data||[])
    setCats(c.data||[])
    if(s.data)setSettings(s.data as any)
    setZones(z.data||[])
    const vm:Record<string,Variant[]>={}
    ;(v.data||[]).forEach((vr:any)=>{if(!vm[vr.product_id])vm[vr.product_id]=[];vm[vr.product_id].push(vr)})
    setVariantsMap(vm)
    const now=new Date()
    const ts=(sched.data||[]).find((d:any)=>d.day_of_week===now.getDay())
    if(ts){const t=now.toTimeString().substring(0,5);setStoreOpen(ts.is_open&&t>=ts.open_time&&t<=ts.close_time);if(ts.is_open)setStoreHours(ts.open_time.substring(0,5)+' às '+ts.close_time.substring(0,5))}
    setLoading(false)
  }
  // CEP lookup
  async function lookupCep(v:string){
    const clean=v.replace(/\D/g,'')
    setCep(v)
    if(clean.length!==8)return
    setCepLoading(true)
    try{
      const r=await fetch('https://viacep.com.br/ws/'+clean+'/json/')
      const d=await r.json()
      if(!d.erro){
        setStreet(d.logradouro||'')
        setNeighborhood(d.bairro||'')
        // Try to match zone by bairro name
        const match=zones.find(z=>d.bairro?.toLowerCase().includes(z.name.toLowerCase())||z.name.toLowerCase().includes((d.bairro||'').toLowerCase()))
        if(match)setSelectedZone(match)
      }
    }catch{}
    setCepLoading(false)
  }
  const deliveryFee=selectedZone?.fee||0
  const cartTotal=cart.reduce((s,i)=>s+i.price*i.qty,0)
  const cartCount=cart.reduce((s,i)=>s+i.qty,0)
  const orderTotal=cartTotal+deliveryFee
  function getCartQty(product_id:string,variant_id?:string){
    return cart.find(i=>i.product_id===product_id&&i.variant_id===variant_id)?.qty||0
  }
  function addToCart(item:CartItem){
    setCart(c=>{
      const ex=c.find(x=>x.product_id===item.product_id&&x.variant_id===item.variant_id)
      if(ex){
        const newQty=ex.qty+item.qty
        if(newQty>ex.maxStock)return c
        return c.map(x=>x.product_id===item.product_id&&x.variant_id===item.variant_id?{...x,qty:newQty}:x)
      }
      return[...c,item]
    })
  }
  function updateQty(product_id:string,variant_id:string|undefined,delta:number){
    setCart(c=>c.map(x=>{
      if(x.product_id!==product_id||x.variant_id!==variant_id)return x
      const nq=x.qty+delta
      if(nq<=0)return null as any
      if(nq>x.maxStock)return x
      return{...x,qty:nq}
    }).filter(Boolean))
  }
  function openProduct(p:Product){
    const variants=variantsMap[p.id]||[]
    if(p.has_sizes&&variants.length>0){
      setVariantModal(p);setSelVariant('');setVariantQty(1)
    }else{
      const price=p.is_promo&&p.promo_price?p.promo_price:p.price
      addToCart({product_id:p.id,name:p.name,price,qty:1,maxStock:p.stock})
    }
  }
  function addVariantToCart(){
    if(!variantModal||!selVariant)return
    const v=(variantsMap[variantModal.id]||[]).find(x=>x.id===selVariant)
    if(!v)return
    const price=(variantModal.is_promo&&variantModal.promo_price?variantModal.promo_price:variantModal.price)+(v.price_modifier||0)
    addToCart({product_id:variantModal.id,variant_id:v.id,name:variantModal.name,variant_name:v.name,price,qty:variantQty,maxStock:v.stock})
    setVariantModal(null)
  }
  async function submitOrder(){
    if(!name.trim()||!phone.trim()){alert('Informe nome e telefone');return}
    if(settings.min_order>0&&cartTotal<settings.min_order){alert('Pedido mínimo: '+fmt(settings.min_order));return}
    setSubmitting(true)
    try{
      const ph=phone.replace(/\D/g,'')
      let cid:string|null=null
      const{data:ec}=await supabase.from('customers').select('id').eq('phone',ph).maybeSingle()
      if(ec){cid=ec.id}else{
        const addr=street+(num?' '+num:'')+(complement?' '+complement:'')
        const{data:nc}=await supabase.from('customers').insert({name,phone:ph,address:addr,neighborhood}).select().single()
        if(nc)cid=nc.id
      }
      const fullAddr=street+(num?' nº'+num:'')+(complement?' '+complement:'')+(neighborhood?' — '+neighborhood:'')
      const{data:order,error:oErr}=await supabase.from('orders').insert({
        customer_name:name,customer_phone:ph,type:'delivery',status:'pending',
        subtotal:cartTotal,delivery_fee:deliveryFee,total:orderTotal,
        payment_method:payMethod,
        cash_requested:payMethod==='dinheiro'&&needChange?parseFloat(needChange):null,
        notes:fullAddr+(notes?' | '+notes:''),
        delivery_zone_id:selectedZone?.id||null,
        customer_id:cid
      }).select().single()
      if(oErr||!order)throw oErr||new Error('Erro ao criar pedido')
      await supabase.from('order_items').insert(cart.map(i=>({
        order_id:order.id,product_id:i.product_id,
        product_name:i.name+(i.variant_name?' — '+i.variant_name:''),
        quantity:i.qty,unit_price:i.price,total_price:i.price*i.qty,
        variant_id:i.variant_id||null
      })))
      await supabase.from('order_payments').insert({order_id:order.id,method:payMethod,amount:orderTotal})
      for(const item of cart){
        if(item.variant_id){
          const{data:vr}=await supabase.from('product_variants').select('stock').eq('id',item.variant_id).single()
          if(vr)await supabase.from('product_variants').update({stock:Math.max(0,vr.stock-item.qty)}).eq('id',item.variant_id)
        }else{
          const{data:pr}=await supabase.from('products').select('stock').eq('id',item.product_id).single()
          if(pr)await supabase.from('products').update({stock:Math.max(0,pr.stock-item.qty)}).eq('id',item.product_id)
        }
      }
      setOrderDone(order);setCart([]);setCheckoutOpen(false)
    }catch(e:any){alert('Erro: '+e.message)}
    finally{setSubmitting(false)}
  }
  const filteredProds=(catId:string)=>products.filter(p=>{
    if(p.category_id!==catId)return false
    if(search&&!p.name.toLowerCase().includes(search.toLowerCase()))return false
    return true
  })
  const catsWithProds=cats.filter(c=>products.some(p=>p.category_id===c.id&&(!search||p.name.toLowerCase().includes(search.toLowerCase()))))
  if(orderDone)return(
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{textAlign:'center',maxWidth:360}}>
        <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(0,255,65,0.1)',border:'2px solid #00ff41',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
          <Check size={36} color='#00ff41'/>
        </div>
        <h2 style={{fontFamily:'Bangers,cursive',fontSize:28,color:'#00ff41',letterSpacing:2,marginBottom:8}}>PEDIDO ENVIADO!</h2>
        <p style={{fontSize:14,color:'#ccc',marginBottom:4}}>Pedido #{orderDone.order_number}</p>
        <p style={{fontSize:12,color:'#888',marginBottom:20}}>Aguarde a confirmação pelo WhatsApp</p>
        <button onClick={()=>setOrderDone(null)} style={{padding:'12px 28px',borderRadius:10,background:'#00ff41',color:'#000',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:16}}>FAZER NOVO PEDIDO</button>
      </div>
    </div>
  )
  return(
    <div style={{minHeight:'100vh',background:'#0a0a0a',fontFamily:'Inter,sans-serif',paddingBottom:80}}>
      {/* HEADER */}
      <div style={{background:'#111',borderBottom:'1px solid #1e1e1e',padding:'12px 16px',position:'sticky',top:0,zIndex:30}}>
        <div style={{maxWidth:640,margin:'0 auto',display:'flex',alignItems:'center',gap:10}}>
          {settings.store_logo_url&&<img src={settings.store_logo_url} alt='' style={{width:36,height:36,borderRadius:8,objectFit:'cover'}}/>}
          <div style={{flex:1,minWidth:0}}>
            <h1 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#00ff41',letterSpacing:2,lineHeight:1}}>{settings.store_name}</h1>
            {!storeOpen&&<p style={{fontSize:10,color:'#ff5555'}}>🔒 Fechado{storeHours?' · '+storeHours:''}</p>}
          </div>
          {cartCount>0&&(
            <button onClick={()=>setCartOpen(true)} style={{background:'#00ff41',border:'none',borderRadius:10,padding:'8px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontFamily:'Bangers,cursive',fontSize:14,color:'#000',flexShrink:0}}>
              <ShoppingCart size={15}/>{cartCount} · {fmt(orderTotal)}
            </button>
          )}
        </div>
      </div>
      {!storeOpen&&<div style={{background:'rgba(255,51,51,0.08)',borderBottom:'1px solid rgba(255,51,51,0.2)',padding:'8px 16px',textAlign:'center'}}><p style={{fontSize:12,color:'#ff6666'}}>🔒 Fechado agora. Horário: {storeHours||'Consulte-nos'}</p></div>}
      <div style={{maxWidth:640,margin:'0 auto',padding:'0 14px'}}>
        {settings.store_banner_url&&<img src={settings.store_banner_url} alt='' style={{width:'100%',borderRadius:12,marginTop:12,objectFit:'cover',maxHeight:160}}/>}
        {settings.promo_title&&<div style={{marginTop:10,padding:'10px 14px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:10}}><p style={{fontSize:13,fontWeight:700,color:'#f59e0b'}}>{settings.promo_title}</p>{settings.promo_description&&<p style={{fontSize:12,color:'#888',marginTop:2}}>{settings.promo_description}</p>}</div>}
        {/* SEARCH */}
        <div style={{position:'relative',marginTop:12,marginBottom:8}}>
          <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#555'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar produto...' style={{width:'100%',background:'#1a1a1a',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'10px 12px 10px 36px',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/>
        </div>
        {/* CATEGORY TABS */}
        <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4,marginBottom:10}}>
          <button onClick={()=>setSelectedCat(null)} style={{padding:'5px 14px',borderRadius:16,border:!selectedCat?'1px solid #00ff41':'1px solid #2a2a2a',background:!selectedCat?'rgba(0,255,65,0.1)':'transparent',color:!selectedCat?'#00ff41':'#666',cursor:'pointer',fontSize:12,fontWeight:600,whiteSpace:'nowrap'}}>Todos</button>
          {catsWithProds.map(c=>(
            <button key={c.id} onClick={()=>setSelectedCat(selectedCat===c.id?null:c.id)} style={{padding:'5px 14px',borderRadius:16,border:selectedCat===c.id?'1px solid '+(c.color||'#00ff41'):'1px solid #2a2a2a',background:selectedCat===c.id?(c.color||'#00ff41')+'20':'transparent',color:selectedCat===c.id?(c.color||'#00ff41'):'#666',cursor:'pointer',fontSize:12,fontWeight:600,whiteSpace:'nowrap',flexShrink:0}}>{c.name}</button>
          ))}
        </div>
        {/* PRODUCTS */}
        {loading?<div style={{textAlign:'center',padding:48,color:'#555'}}>Carregando cardápio...</div>:
        catsWithProds.filter(c=>!selectedCat||c.id===selectedCat).map(cat=>{
          const prods=filteredProds(cat.id)
          if(!prods.length)return null
          return(
            <div key={cat.id} style={{marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{width:4,height:18,borderRadius:2,background:cat.color||'#00ff41'}}/>
                <h2 style={{fontFamily:'Bangers,cursive',fontSize:18,color:'#fff',letterSpacing:1}}>{cat.name}</h2>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',gap:10}}>
                {prods.map(p=>{
                  const variants=variantsMap[p.id]||[]
                  const price=p.is_promo&&p.promo_price?p.promo_price:p.price
                  const totalStock=p.has_sizes?variants.reduce((s,v)=>s+(v.stock||0),0):p.stock
                  const inStock=totalStock>0
                  const cartQty=p.has_sizes?cart.filter(i=>i.product_id===p.id).reduce((s,i)=>s+i.qty,0):getCartQty(p.id,undefined)
                  return(
                    <div key={p.id} style={{background:'#161616',borderRadius:12,overflow:'hidden',opacity:inStock?1:0.5,border:'1px solid #1e1e1e'}}>
                      <div onClick={()=>{if(!storeOpen||!inStock)return;openProduct(p)}} style={{cursor:inStock&&storeOpen?'pointer':'default'}}>
                        {p.image_url?<img src={p.image_url} alt={p.name} style={{width:'100%',height:100,objectFit:'cover',display:'block'}}/>
                          :<div style={{height:100,background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:28}}>📦</span></div>}
                      </div>
                      <div style={{padding:'8px 10px'}}>
                        <p style={{fontSize:12,fontWeight:600,color:'#e5e5e5',marginBottom:2,lineHeight:1.3}}>{p.name}</p>
                        {p.has_sizes&&variants.length>0&&<p style={{fontSize:10,color:'#666',marginBottom:3,display:'flex',alignItems:'center',gap:3}}><Layers size={9}/>{variants.filter(v=>v.stock>0).length} sabores disponíveis</p>}
                        {p.description&&<p style={{fontSize:10,color:'#555',marginBottom:4,display:'-webkit-box' as any,WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any,overflow:'hidden'}}>{p.description}</p>}
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4}}>
                          <div>
                            {p.is_promo&&<p style={{fontSize:9,color:'#666',textDecoration:'line-through'}}>{fmt(p.price)}</p>}
                            <p style={{fontSize:14,fontWeight:700,color:p.is_promo?'#f59e0b':'#00ff41'}}>{fmt(price)}</p>
                          </div>
                          {!inStock?<span style={{fontSize:9,color:'#ff5555',fontWeight:600}}>ESGOTADO</span>:
                          !storeOpen?<span style={{fontSize:9,color:'#888'}}>FECHADO</span>:
                          p.has_sizes?(
                            <button onClick={()=>openProduct(p)} style={{padding:'5px 10px',borderRadius:8,background:cat.color||'#00ff41',color:'#000',border:'none',cursor:'pointer',fontSize:11,fontWeight:700}}>VER</button>
                          ):(
                            cartQty>0?(
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <button onClick={e=>{e.stopPropagation();updateQty(p.id,undefined,-1)}} style={{width:24,height:24,borderRadius:6,border:'1px solid #333',background:'#222',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={10}/></button>
                                <span style={{fontSize:13,fontWeight:700,color:'#00ff41',minWidth:16,textAlign:'center' as const}}>{cartQty}</span>
                                <button onClick={e=>{e.stopPropagation();if(cartQty<totalStock)openProduct(p)}} style={{width:24,height:24,borderRadius:6,border:'1px solid #333',background:cartQty>=totalStock?'#111':'#222',color:cartQty>=totalStock?'#333':'#fff',cursor:cartQty>=totalStock?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={10}/></button>
                              </div>
                            ):(
                              <button onClick={e=>{e.stopPropagation();openProduct(p)}} style={{width:28,height:28,borderRadius:8,background:cat.color||'#00ff41',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer',flexShrink:0}}>
                                <Plus size={14} color='#000'/>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {/* VARIANT MODAL */}
      {variantModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:50}}>
          <div style={{width:'100%',maxWidth:500,background:'#151515',borderRadius:'20px 20px 0 0',padding:20,paddingBottom:32}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
              {variantModal.image_url&&<img src={variantModal.image_url} alt='' style={{width:48,height:48,borderRadius:8,objectFit:'cover'}}/>}
              <div style={{flex:1}}><p style={{fontSize:16,fontWeight:700,color:'#fff'}}>{variantModal.name}</p><p style={{fontSize:13,color:'#00ff41',fontWeight:600}}>{fmt(variantModal.is_promo&&variantModal.promo_price?variantModal.promo_price:variantModal.price)}</p></div>
              <button onClick={()=>setVariantModal(null)} style={{background:'#222',border:'none',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#888'}}><X size={16}/></button>
            </div>
            <p style={{fontSize:11,color:'#666',marginBottom:8,fontWeight:600,letterSpacing:0.5}}>ESCOLHA O SABOR</p>
            <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:240,overflowY:'auto',marginBottom:14}}>
              {(variantsMap[variantModal.id]||[]).filter(v=>v.stock>0).map(v=>(
                <button key={v.id} onClick={()=>setSelVariant(v.id)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,border:selVariant===v.id?'2px solid #00ff41':'1px solid #2a2a2a',background:selVariant===v.id?'rgba(0,255,65,0.08)':'#1a1a1a',cursor:'pointer',textAlign:'left' as const}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:16,height:16,borderRadius:'50%',border:'2px solid '+(selVariant===v.id?'#00ff41':'#444'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {selVariant===v.id&&<div style={{width:8,height:8,borderRadius:'50%',background:'#00ff41'}}/>}
                    </div>
                    <span style={{fontSize:13,color:selVariant===v.id?'#fff':'#ccc',fontWeight:selVariant===v.id?600:400}}>{v.name}</span>
                  </div>
                  <div style={{textAlign:'right' as const}}>
                    {v.price_modifier!==0&&<p style={{fontSize:10,color:'#888'}}>{v.price_modifier>0?'+':''}{fmt(v.price_modifier)}</p>}
                    <p style={{fontSize:10,color:'#555'}}>estoque: {v.stock}</p>
                  </div>
                </button>
              ))}
              {(variantsMap[variantModal.id]||[]).filter(v=>v.stock===0).map(v=>(
                <div key={v.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,border:'1px solid #1a1a1a',opacity:0.4}}>
                  <span style={{fontSize:13,color:'#555'}}>{v.name}</span>
                  <span style={{fontSize:10,color:'#ff5555'}}>ESGOTADO</span>
                </div>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <span style={{fontSize:12,color:'#888'}}>Quantidade</span>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <button onClick={()=>setVariantQty(q=>Math.max(1,q-1))} style={{width:32,height:32,borderRadius:8,border:'1px solid #333',background:'#222',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={14}/></button>
                <span style={{fontSize:16,fontWeight:700,color:'#fff',minWidth:20,textAlign:'center' as const}}>{variantQty}</span>
                <button onClick={()=>{const v=(variantsMap[variantModal.id]||[]).find(x=>x.id===selVariant);if(!selVariant||variantQty<(v?.stock||0))setVariantQty(q=>q+1)}} style={{width:32,height:32,borderRadius:8,border:'1px solid #333',background:'#222',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={14}/></button>
              </div>
            </div>
            <button onClick={addVariantToCart} disabled={!selVariant} style={{width:'100%',padding:'14px',borderRadius:12,background:selVariant?'#00ff41':'#2a2a2a',color:selVariant?'#000':'#555',border:'none',cursor:selVariant?'pointer':'not-allowed',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1}}>
              {selVariant?'ADICIONAR AO CARRINHO':'SELECIONE UM SABOR'}
            </button>
          </div>
        </div>
      )}
      {/* CART DRAWER */}
      {cartOpen&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:50}}>
          <div style={{width:'100%',maxWidth:500,background:'#151515',borderRadius:'20px 20px 0 0',padding:20,paddingBottom:32,maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <h3 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#00ff41',letterSpacing:1}}>SEU PEDIDO</h3>
              <button onClick={()=>setCartOpen(false)} style={{background:'#222',border:'none',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#888'}}><X size={16}/></button>
            </div>
            <div style={{flex:1,overflowY:'auto',marginBottom:12}}>
              {cart.map((item,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #1e1e1e'}}>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,color:'#e5e5e5',fontWeight:500}}>{item.name}</p>
                    {item.variant_name&&<p style={{fontSize:11,color:'#888'}}>Sabor: {item.variant_name}</p>}
                    <p style={{fontSize:12,color:'#00ff41',fontWeight:700,marginTop:2}}>{fmt(item.price)}</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button onClick={()=>updateQty(item.product_id,item.variant_id,-1)} style={{width:24,height:24,borderRadius:6,border:'1px solid #333',background:'#222',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={11}/></button>
                    <span style={{fontSize:13,color:'#fff',minWidth:16,textAlign:'center' as const}}>{item.qty}</span>
                    <button onClick={()=>updateQty(item.product_id,item.variant_id,1)} disabled={item.qty>=item.maxStock} style={{width:24,height:24,borderRadius:6,border:'1px solid #333',background:item.qty>=item.maxStock?'#111':'#222',color:item.qty>=item.maxStock?'#333':'#fff',cursor:item.qty>=item.maxStock?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={11}/></button>
                    <button onClick={()=>setCart(c=>c.filter((_,j)=>j!==i))} style={{width:24,height:24,borderRadius:6,border:'none',background:'rgba(255,51,51,0.1)',color:'#ff5555',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={11}/></button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{borderTop:'1px solid #2a2a2a',paddingTop:10,marginBottom:12}}>
              {deliveryFee>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#888',marginBottom:4}}><span>Taxa de entrega ({selectedZone?.name})</span><span>{fmt(deliveryFee)}</span></div>}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:14,color:'#888'}}>Total</span>
                <span style={{fontSize:20,fontWeight:700,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(orderTotal)}</span>
              </div>
              {settings.min_order>0&&cartTotal<settings.min_order&&<p style={{fontSize:11,color:'#ff9955',marginTop:4}}>⚠️ Mínimo: {fmt(settings.min_order)}</p>}
            </div>
            <button onClick={()=>{setCartOpen(false);setCheckoutOpen(true)}} style={{width:'100%',padding:'14px',borderRadius:12,background:'#00ff41',color:'#000',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1}}>FINALIZAR PEDIDO</button>
          </div>
        </div>
      )}
      {/* CHECKOUT */}
      {checkoutOpen&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.97)',zIndex:60,overflowY:'auto',padding:'16px 16px 40px'}}>
          <div style={{maxWidth:500,margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,paddingTop:8}}>
              <button onClick={()=>{setCheckoutOpen(false);setCartOpen(true)}} style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:8,padding:'6px 10px',color:'#888',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><ChevronLeft size={14}/>Voltar</button>
              <h2 style={{fontFamily:'Bangers,cursive',fontSize:22,color:'#00ff41',letterSpacing:1}}>FINALIZAR PEDIDO</h2>
            </div>
            {/* Name + Phone */}
            {[{label:'NOME *',val:name,set:setName,ph:'Seu nome completo'},{label:'WHATSAPP *',val:phone,set:setPhone,ph:'(27) 99999-9999'}].map(f=>(
              <div key={f.label} style={{marginBottom:10}}>
                <label style={{fontSize:10,color:'#666',display:'block',marginBottom:4,fontWeight:600,letterSpacing:0.5}}>{f.label}</label>
                <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={{width:'100%',background:'#1a1a1a',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/>
              </div>
            ))}
            {/* CEP with auto-fill */}
            <div style={{marginBottom:10}}>
              <label style={{fontSize:10,color:'#666',display:'block',marginBottom:4,fontWeight:600,letterSpacing:0.5}}>CEP (preenchimento automático)</label>
              <div style={{position:'relative'}}>
                <input value={cep} onChange={e=>lookupCep(e.target.value)} placeholder='00000-000' maxLength={9} style={{width:'100%',background:'#1a1a1a',border:'1px solid '+(cepLoading?'#f59e0b':'#2a2a2a'),color:'#fff',borderRadius:10,padding:'10px 40px 10px 12px',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/>
                {cepLoading&&<div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',width:16,height:16,border:'2px solid #f59e0b',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>}
              </div>
            </div>
            {/* Address fields */}
            {[{label:'RUA/AVENIDA',val:street,set:setStreet,ph:'Rua...'},{label:'NÚMERO',val:num,set:setNum,ph:'Nº'},{label:'COMPLEMENTO',val:complement,set:setComplement,ph:'Apto, bloco...'}].map(f=>(
              <div key={f.label} style={{marginBottom:10}}>
                <label style={{fontSize:10,color:'#666',display:'block',marginBottom:4,fontWeight:600,letterSpacing:0.5}}>{f.label}</label>
                <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={{width:'100%',background:'#1a1a1a',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/>
              </div>
            ))}
            {/* Zona/Bairro */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,color:'#666',display:'block',marginBottom:6,fontWeight:600,letterSpacing:0.5}}>BAIRRO / ZONA DE ENTREGA</label>
              {zones.length>0?(
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {zones.map(z=>(
                    <button key={z.id} onClick={()=>setSelectedZone(selectedZone?.id===z.id?null:z)} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,border:selectedZone?.id===z.id?'2px solid #00ff41':'1px solid #2a2a2a',background:selectedZone?.id===z.id?'rgba(0,255,65,0.06)':'#1a1a1a',cursor:'pointer',textAlign:'left' as const}}>
                      <span style={{fontSize:13,color:selectedZone?.id===z.id?'#00ff41':'#ccc',fontWeight:selectedZone?.id===z.id?600:400}}>{z.name}</span>
                      <span style={{fontSize:13,color:'#888',fontFamily:'JetBrains Mono,monospace'}}>{z.fee>0?fmt(z.fee):'Grátis'}</span>
                    </button>
                  ))}
                </div>
              ):(
                <input value={neighborhood} onChange={e=>setNeighborhood(e.target.value)} placeholder='Seu bairro' style={{width:'100%',background:'#1a1a1a',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/>
              )}
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,color:'#666',display:'block',marginBottom:4,fontWeight:600,letterSpacing:0.5}}>OBSERVAÇÕES</label>
              <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder='Ex: portão verde, campainha 2' style={{width:'100%',background:'#1a1a1a',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/>
            </div>
            {/* PAGAMENTO */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,color:'#666',display:'block',marginBottom:8,fontWeight:600,letterSpacing:0.5}}>FORMA DE PAGAMENTO</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[{k:'pix',l:'💚 PIX'},{k:'dinheiro',l:'💵 Dinheiro'},{k:'debito',l:'💳 Débito'},{k:'credito',l:'💳 Crédito'}].map(m=>(
                  <button key={m.k} onClick={()=>setPayMethod(m.k)} style={{padding:'10px',borderRadius:10,border:payMethod===m.k?'2px solid #00ff41':'1px solid #2a2a2a',background:payMethod===m.k?'rgba(0,255,65,0.08)':'#1a1a1a',color:payMethod===m.k?'#00ff41':'#888',cursor:'pointer',fontSize:13,fontWeight:600}}>{m.l}</button>
                ))}
              </div>
              {payMethod==='dinheiro'&&(
                <div style={{marginTop:8}}>
                  <label style={{fontSize:10,color:'#666',display:'block',marginBottom:4}}>TROCO PARA QUANTO? (opcional)</label>
                  <input type='number' value={needChange} onChange={e=>setNeedChange(e.target.value)} placeholder='Ex: 100' style={{width:'100%',background:'#1a1a1a',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/>
                </div>
              )}
            </div>
            {/* ORDER SUMMARY */}
            <div style={{background:'#1a1a1a',borderRadius:12,padding:'12px 14px',marginBottom:16}}>
              {cart.map((item,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'2px 0'}}>
                  <span style={{color:'#ccc'}}>{item.qty}x {item.name}{item.variant_name?' ('+item.variant_name+')':''}</span>
                  <span style={{color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price*item.qty)}</span>
                </div>
              ))}
              {deliveryFee>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'2px 0',borderTop:'1px solid #2a2a2a',marginTop:4}}><span style={{color:'#888'}}>Entrega ({selectedZone?.name})</span><span style={{color:'#888',fontFamily:'JetBrains Mono,monospace'}}>{fmt(deliveryFee)}</span></div>}
              <div style={{borderTop:'1px solid #2a2a2a',marginTop:6,paddingTop:6,display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:14,color:'#888'}}>Total</span>
                <span style={{fontSize:16,fontWeight:700,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(orderTotal)}</span>
              </div>
            </div>
            <button onClick={submitOrder} disabled={submitting} style={{width:'100%',padding:'16px',borderRadius:12,background:submitting?'#2a2a2a':'#00ff41',color:submitting?'#555':'#000',border:'none',cursor:submitting?'not-allowed':'pointer',fontFamily:'Bangers,cursive',fontSize:18,letterSpacing:1}}>
              {submitting?'ENVIANDO...':'CONFIRMAR PEDIDO'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}