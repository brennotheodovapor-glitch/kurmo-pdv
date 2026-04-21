import{useState,useEffect}from 'react'
import{ShoppingCart,Search,ChevronLeft,X,Plus,Minus,Layers,MapPin,Phone,MessageCircle,Check,AlertCircle}from 'lucide-react'
import{supabase}from '@/lib/supabase'
type Category={id:string;name:string;color:string;sort_order:number}
type Variant={id:string;name:string;stock:number;price_modifier:number}
type Product={id:string;name:string;description:string;price:number;promo_price:number|null;is_promo:boolean;stock:number;image_url:string;category_id:string;has_sizes:boolean;active:boolean}
type CartItem={product_id:string;variant_id?:string;name:string;variant_name?:string;price:number;qty:number;stock:number}
type Settings={store_name:string;store_description:string;promo_title:string;promo_description:string;store_logo_url:string;store_banner_url:string;whatsapp:string;min_order:number}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
export default function PublicMenuPage(){
  const[cats,setCats]=useState<Category[]>([])
  const[products,setProducts]=useState<Product[]>([])
  const[variantsMap,setVariantsMap]=useState<Record<string,Variant[]>>({})
  const[settings,setSettings]=useState<Settings>({store_name:'KURMO PDV',store_description:'',promo_title:'',promo_description:'',store_logo_url:'',store_banner_url:'',whatsapp:'',min_order:0})
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[selectedCat,setSelectedCat]=useState<string|null>(null)
  const[cart,setCart]=useState<CartItem[]>([])
  const[cartOpen,setCartOpen]=useState(false)
  const[variantModal,setVariantModal]=useState<Product|null>(null)
  const[selectedVariant,setSelectedVariant]=useState<string|null>(null)
  const[qty,setQty]=useState(1)
  const[checkoutOpen,setCheckoutOpen]=useState(false)
  const[customer,setCustomer]=useState({name:'',phone:'',address:'',neighborhood:'',complement:'',notes:''})
  const[payMethod,setPayMethod]=useState('pix')
  const[needChange,setNeedChange]=useState('')
  const[submitting,setSubmitting]=useState(false)
  const[orderDone,setOrderDone]=useState<any>(null)
  const[storeOpen,setStoreOpen]=useState(true)
  const[storeHours,setStoreHours]=useState('')
  useEffect(()=>{load()},[])
  async function load(){
    setLoading(true)
    const[p,c,s,sched,v]=await Promise.all([
      supabase.from('products').select('*').eq('active',true),
      supabase.from('categories').select('*').order('sort_order',{ascending:true}).order('name'),
      supabase.from('store_settings').select('*').limit(1).maybeSingle(),
      supabase.from('store_schedule').select('*').order('day_of_week'),
      supabase.from('product_variants').select('*').eq('active',true).order('sort_order')
    ])
    setProducts(p.data||[])
    setCats(c.data||[])
    if(s.data)setSettings(s.data as any)
    // Group variants by product
    const vm:Record<string,Variant[]>={}
    ;(v.data||[]).forEach((vr:any)=>{
      if(!vm[vr.product_id])vm[vr.product_id]=[]
      vm[vr.product_id].push(vr)
    })
    setVariantsMap(vm)
    // Check store schedule
    const now=new Date()
    const todaySched=(sched.data||[]).find((d:any)=>d.day_of_week===now.getDay())
    if(todaySched){
      const t=now.toTimeString().substring(0,5)
      const open=todaySched.is_open&&t>=todaySched.open_time&&t<=todaySched.close_time
      setStoreOpen(open)
      if(todaySched.is_open)setStoreHours(todaySched.open_time.substring(0,5)+' às '+todaySched.close_time.substring(0,5))
    }
    setLoading(false)
  }
  const cartTotal=cart.reduce((s,i)=>s+i.price*i.qty,0)
  const cartCount=cart.reduce((s,i)=>s+i.qty,0)
  function openProduct(p:Product){
    const variants=variantsMap[p.id]||[]
    if(p.has_sizes&&variants.length>0){
      setVariantModal(p);setSelectedVariant(null);setQty(1)
    }else{
      addToCart({product_id:p.id,name:p.name,price:p.is_promo&&p.promo_price?p.promo_price:p.price,qty:1,stock:p.stock})
    }
  }
  function addToCart(item:CartItem){
    setCart(c=>{
      const key=item.product_id+(item.variant_id||'')
      const existing=c.find(x=>x.product_id===item.product_id&&x.variant_id===item.variant_id)
      if(existing)return c.map(x=>x.product_id===item.product_id&&x.variant_id===item.variant_id?{...x,qty:x.qty+item.qty}:x)
      return[...c,item]
    })
    setVariantModal(null)
  }
  function addVariantToCart(){
    if(!variantModal||!selectedVariant)return
    const v=variantsMap[variantModal.id]?.find(x=>x.id===selectedVariant)
    if(!v)return
    const price=(variantModal.is_promo&&variantModal.promo_price?variantModal.promo_price:variantModal.price)+(v.price_modifier||0)
    addToCart({product_id:variantModal.id,variant_id:v.id,name:variantModal.name,variant_name:v.name,price,qty,stock:v.stock})
  }
  function removeFromCart(product_id:string,variant_id?:string){
    setCart(c=>c.filter(x=>!(x.product_id===product_id&&x.variant_id===variant_id)))
  }
  function updateCartQty(product_id:string,variant_id:string|undefined,delta:number){
    setCart(c=>c.map(x=>x.product_id===product_id&&x.variant_id===variant_id?{...x,qty:Math.max(1,Math.min(x.qty+delta,x.stock))}:x))
  }
  async function submitOrder(){
    if(!customer.name.trim()||!customer.phone.trim()){alert('Informe nome e telefone');return}
    if(settings.min_order>0&&cartTotal<settings.min_order){alert('Pedido mínimo: '+fmt(settings.min_order));return}
    setSubmitting(true)
    try{
      // Get or create customer
      const phone=customer.phone.replace(/\D/g,'')
      let customerId:string|null=null
      const{data:existingCust}=await supabase.from('customers').select('id').eq('phone',phone).maybeSingle()
      if(existingCust){customerId=existingCust.id}
      else{
        const{data:newCust}=await supabase.from('customers').insert({name:customer.name,phone,address:customer.address,neighborhood:customer.neighborhood,complement:customer.complement}).select().single()
        if(newCust)customerId=newCust.id
      }
      // Create order
      const{data:order,error:oErr}=await supabase.from('orders').insert({
        customer_name:customer.name,customer_phone:phone,
        type:'delivery',status:'pending',
        total:cartTotal,subtotal:cartTotal,
        payment_method:payMethod,
        cash_requested:payMethod==='dinheiro'&&needChange?parseFloat(needChange):null,
        notes:customer.address+(customer.neighborhood?' — '+customer.neighborhood:'')+(customer.complement?' ('+customer.complement+')':'')+(customer.notes?' | '+customer.notes:''),
        customer_id:customerId
      }).select().single()
      if(oErr||!order)throw oErr||new Error('Erro ao criar pedido')
      // Create order items
      const items=cart.map(i=>({
        order_id:order.id,product_id:i.product_id,
        product_name:i.name+(i.variant_name?' — '+i.variant_name:''),
        quantity:i.qty,unit_price:i.price,total_price:i.price*i.qty,
        variant_id:i.variant_id||null
      }))
      await supabase.from('order_items').insert(items)
      // Payment
      await supabase.from('order_payments').insert({order_id:order.id,method:payMethod,amount:cartTotal})
      // Decrement stock
      for(const item of cart){
        if(item.variant_id){
          const{data:v}=await supabase.from('product_variants').select('stock').eq('id',item.variant_id).single()
          if(v)await supabase.from('product_variants').update({stock:Math.max(0,v.stock-item.qty)}).eq('id',item.variant_id)
        }else{
          const{data:pr}=await supabase.from('products').select('stock').eq('id',item.product_id).single()
          if(pr)await supabase.from('products').update({stock:Math.max(0,pr.stock-item.qty)}).eq('id',item.product_id)
        }
      }
      setOrderDone(order);setCart([]);setCheckoutOpen(false)
    }catch(e:any){alert('Erro: '+e.message)}
    finally{setSubmitting(false)}
  }
  const filteredProds=(cat:string)=>products.filter(p=>{
    if(p.category_id!==cat)return false
    if(search&&!p.name.toLowerCase().includes(search.toLowerCase()))return false
    return true
  })
  const catsWithProds=cats.filter(c=>filteredProds(c.id).length>0||(search===''&&products.some(p=>p.category_id===c.id)))
  if(orderDone)return(
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{textAlign:'center',maxWidth:360}}>
        <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(0,255,65,0.1)',border:'2px solid var(--neon)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
          <Check size={36} color='var(--neon)'/>
        </div>
        <h2 style={{fontFamily:'Bangers,cursive',fontSize:28,color:'var(--neon)',letterSpacing:2,marginBottom:8}}>PEDIDO ENVIADO!</h2>
        <p style={{fontSize:14,color:'#ccc',marginBottom:4}}>Pedido #{orderDone.order_number}</p>
        <p style={{fontSize:12,color:'#888',marginBottom:20}}>Acompanhe o status pelo WhatsApp</p>
        <button onClick={()=>setOrderDone(null)} style={{padding:'12px 28px',borderRadius:10,background:'var(--neon)',color:'#000',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1}}>FAZER NOVO PEDIDO</button>
      </div>
    </div>
  )
  return(
    <div style={{minHeight:'100vh',background:'#0a0a0a',fontFamily:'Inter,sans-serif'}}>
      {/* Header */}
      <div style={{background:'#111',borderBottom:'1px solid #222',padding:'14px 16px',position:'sticky',top:0,zIndex:30}}>
        <div style={{maxWidth:600,margin:'0 auto',display:'flex',alignItems:'center',gap:12}}>
          {settings.store_logo_url&&<img src={settings.store_logo_url} alt='' style={{width:36,height:36,borderRadius:8,objectFit:'cover'}}/>}
          <div style={{flex:1}}>
            <h1 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#00ff41',letterSpacing:2,lineHeight:1}}>{settings.store_name||'DELIVERY'}</h1>
            {!storeOpen&&<p style={{fontSize:10,color:'#ff5555',marginTop:1}}>🔒 Fechado · {storeHours}</p>}
          </div>
          {cartCount>0&&(
            <button onClick={()=>setCartOpen(true)} style={{position:'relative',background:'#00ff41',border:'none',borderRadius:10,padding:'8px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontFamily:'Bangers,cursive',fontSize:14,color:'#000'}}>
              <ShoppingCart size={16}/>{cartCount} · {fmt(cartTotal)}
            </button>
          )}
        </div>
      </div>
      {/* Closed banner */}
      {!storeOpen&&(
        <div style={{background:'rgba(255,51,51,0.08)',borderBottom:'1px solid rgba(255,51,51,0.2)',padding:'10px 16px',textAlign:'center'}}>
          <p style={{fontSize:13,color:'#ff6666'}}>🔒 Estamos fechados no momento. Horário: {storeHours||'Consulte-nos'}</p>
        </div>
      )}
      <div style={{maxWidth:600,margin:'0 auto',padding:'0 16px 80px'}}>
        {/* Banner */}
        {settings.store_banner_url&&<img src={settings.store_banner_url} alt='' style={{width:'100%',borderRadius:12,marginTop:12,objectFit:'cover',maxHeight:160}}/>}
        {/* Promo */}
        {settings.promo_title&&(
          <div style={{marginTop:12,padding:'10px 14px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:10}}>
            <p style={{fontSize:13,fontWeight:700,color:'#f59e0b',marginBottom:2}}>{settings.promo_title}</p>
            {settings.promo_description&&<p style={{fontSize:12,color:'#999'}}>{settings.promo_description}</p>}
          </div>
        )}
        {/* Search */}
        <div style={{position:'relative',marginTop:12,marginBottom:8}}>
          <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#555'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar produto...' style={{width:'100%',background:'#1a1a1a',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'10px 12px 10px 36px',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
        </div>
        {/* Category tabs */}
        <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4,marginBottom:8}}>
          <button onClick={()=>setSelectedCat(null)} style={{padding:'5px 14px',borderRadius:16,border:selectedCat===null?'1px solid #00ff41':'1px solid #2a2a2a',background:selectedCat===null?'rgba(0,255,65,0.1)':'transparent',color:selectedCat===null?'#00ff41':'#666',cursor:'pointer',fontSize:12,fontWeight:600,whiteSpace:'nowrap',transition:'all 0.15s'}}>Todos</button>
          {catsWithProds.map(c=>(
            <button key={c.id} onClick={()=>setSelectedCat(selectedCat===c.id?null:c.id)} style={{padding:'5px 14px',borderRadius:16,border:selectedCat===c.id?'1px solid '+(c.color||'#00ff41'):'1px solid #2a2a2a',background:selectedCat===c.id?(c.color||'#00ff41')+'18':'transparent',color:selectedCat===c.id?(c.color||'#00ff41'):'#666',cursor:'pointer',fontSize:12,fontWeight:600,whiteSpace:'nowrap',flexShrink:0,transition:'all 0.15s'}}>{c.name}</button>
          ))}
        </div>
        {/* Products by category */}
        {loading?<div style={{textAlign:'center',padding:48,color:'#555'}}>Carregando cardápio...</div>:
        catsWithProds.filter(c=>!selectedCat||c.id===selectedCat).map(cat=>{
          const prods=filteredProds(cat.id)
          if(prods.length===0)return null
          return(
            <div key={cat.id} style={{marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,paddingTop:4}}>
                <div style={{width:4,height:18,borderRadius:2,background:cat.color||'#00ff41',flexShrink:0}}/>
                <h2 style={{fontFamily:'Bangers,cursive',fontSize:18,color:'#fff',letterSpacing:1}}>{cat.name}</h2>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
                {prods.map(p=>{
                  const variants=variantsMap[p.id]||[]
                  const price=p.is_promo&&p.promo_price?p.promo_price:p.price
                  const inStock=p.has_sizes?(variants.some(v=>v.stock>0)):(p.stock>0)
                  const cartItem=cart.find(i=>i.product_id===p.id&&!i.variant_id)
                  return(
                    <div key={p.id} onClick={()=>{if(!storeOpen)return;if(!inStock)return;openProduct(p)}} style={{background:'#161616',borderRadius:12,overflow:'hidden',cursor:inStock&&storeOpen?'pointer':'default',opacity:inStock?1:0.5,border:'1px solid #1e1e1e',transition:'transform 0.15s,border-color 0.15s'}}
                      onMouseEnter={e=>{if(inStock&&storeOpen)(e.currentTarget as HTMLElement).style.border='1px solid '+(cat.color||'#333')}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.border='1px solid #1e1e1e'}}>
                      {p.image_url?<img src={p.image_url} alt={p.name} style={{width:'100%',height:110,objectFit:'cover',display:'block'}}/>
                        :<div style={{height:110,background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:32}}>📦</span></div>}
                      <div style={{padding:'8px 10px'}}>
                        <p style={{fontSize:12,fontWeight:600,color:'#e5e5e5',marginBottom:2,lineHeight:1.3}}>{p.name}</p>
                        {p.has_sizes&&variants.length>0&&<p style={{fontSize:10,color:'#666',marginBottom:4,display:'flex',alignItems:'center',gap:3}}><Layers size={9}/>{variants.filter(v=>v.stock>0).length} sabores</p>}
                        {p.description&&<p style={{fontSize:10,color:'#666',marginBottom:4,lineHeight:1.3,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{p.description}</p>}
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4}}>
                          <div>
                            {p.is_promo&&<p style={{fontSize:10,color:'#666',textDecoration:'line-through'}}>{fmt(p.price)}</p>}
                            <p style={{fontSize:14,fontWeight:700,color:p.is_promo?'#f59e0b':'#00ff41'}}>{fmt(price)}</p>
                          </div>
                          {!inStock?<span style={{fontSize:9,color:'#ff5555',fontWeight:600}}>ESGOTADO</span>:
                          !storeOpen?<span style={{fontSize:9,color:'#ff5555'}}>FECHADO</span>:
                          <div style={{width:28,height:28,borderRadius:8,background:cat.color||'#00ff41',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <Plus size={14} color='#000'/>
                          </div>}
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
      {/* VARIANT MODAL — choose flavor */}
      {variantModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:50}}>
          <div style={{width:'100%',maxWidth:500,background:'#151515',borderRadius:'20px 20px 0 0',padding:20,paddingBottom:32}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              {variantModal.image_url&&<img src={variantModal.image_url} alt='' style={{width:48,height:48,borderRadius:8,objectFit:'cover'}}/>}
              <div style={{flex:1}}>
                <p style={{fontSize:16,fontWeight:700,color:'#fff'}}>{variantModal.name}</p>
                <p style={{fontSize:13,color:'#00ff41',fontWeight:600}}>{fmt(variantModal.is_promo&&variantModal.promo_price?variantModal.promo_price:variantModal.price)}</p>
              </div>
              <button onClick={()=>setVariantModal(null)} style={{background:'#222',border:'none',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#888'}}><X size={16}/></button>
            </div>
            <p style={{fontSize:11,color:'#666',marginBottom:10,fontWeight:600,letterSpacing:0.5}}>ESCOLHA O SABOR</p>
            <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:240,overflowY:'auto',marginBottom:14}}>
              {(variantsMap[variantModal.id]||[]).filter(v=>v.stock>0).map(v=>(
                <button key={v.id} onClick={()=>setSelectedVariant(v.id)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,border:selectedVariant===v.id?'2px solid #00ff41':'1px solid #2a2a2a',background:selectedVariant===v.id?'rgba(0,255,65,0.08)':'#1a1a1a',cursor:'pointer',textAlign:'left',transition:'all 0.15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:16,height:16,borderRadius:'50%',border:'2px solid '+(selectedVariant===v.id?'#00ff41':'#444'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {selectedVariant===v.id&&<div style={{width:8,height:8,borderRadius:'50%',background:'#00ff41'}}/>}
                    </div>
                    <span style={{fontSize:13,color:selectedVariant===v.id?'#fff':'#ccc',fontWeight:selectedVariant===v.id?600:400}}>{v.name}</span>
                  </div>
                  <div style={{textAlign:'right'}}>
                    {v.price_modifier!==0&&<p style={{fontSize:11,color:'#888'}}>{v.price_modifier>0?'+':''}{fmt(v.price_modifier)}</p>}
                    <p style={{fontSize:10,color:'#555'}}>estoque: {v.stock}</p>
                  </div>
                </button>
              ))}
              {(variantsMap[variantModal.id]||[]).filter(v=>v.stock===0).map(v=>(
                <div key={v.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,border:'1px solid #1a1a1a',background:'#111',opacity:0.5}}>
                  <span style={{fontSize:13,color:'#555'}}>{v.name}</span>
                  <span style={{fontSize:10,color:'#ff5555'}}>ESGOTADO</span>
                </div>
              ))}
            </div>
            {/* Qty */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <span style={{fontSize:12,color:'#888'}}>Quantidade</span>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:32,height:32,borderRadius:8,border:'1px solid #333',background:'#222',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={14}/></button>
                <span style={{fontSize:16,fontWeight:700,color:'#fff',minWidth:20,textAlign:'center'}}>{qty}</span>
                <button onClick={()=>setQty(q=>q+1)} style={{width:32,height:32,borderRadius:8,border:'1px solid #333',background:'#222',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={14}/></button>
              </div>
            </div>
            <button onClick={addVariantToCart} disabled={!selectedVariant} style={{width:'100%',padding:'14px',borderRadius:12,background:selectedVariant?'#00ff41':'#2a2a2a',color:selectedVariant?'#000':'#555',border:'none',cursor:selectedVariant?'pointer':'not-allowed',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1,transition:'background 0.2s'}}>
              {selectedVariant?'ADICIONAR AO CARRINHO':'SELECIONE UM SABOR'}
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
                    <button onClick={()=>updateCartQty(item.product_id,item.variant_id,-1)} style={{width:24,height:24,borderRadius:6,border:'1px solid #333',background:'#222',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={11}/></button>
                    <span style={{fontSize:13,color:'#fff',minWidth:16,textAlign:'center'}}>{item.qty}</span>
                    <button onClick={()=>updateCartQty(item.product_id,item.variant_id,1)} style={{width:24,height:24,borderRadius:6,border:'1px solid #333',background:'#222',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={11}/></button>
                    <button onClick={()=>removeFromCart(item.product_id,item.variant_id)} style={{width:24,height:24,borderRadius:6,border:'none',background:'rgba(255,51,51,0.1)',color:'#ff5555',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={11}/></button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{borderTop:'1px solid #2a2a2a',paddingTop:10,marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:14,color:'#888'}}>Total</span>
                <span style={{fontSize:20,fontWeight:700,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(cartTotal)}</span>
              </div>
              {settings.min_order>0&&cartTotal<settings.min_order&&<p style={{fontSize:11,color:'#ff9955',marginTop:4}}>⚠️ Pedido mínimo: {fmt(settings.min_order)}</p>}
            </div>
            <button onClick={()=>{setCartOpen(false);setCheckoutOpen(true)}} style={{width:'100%',padding:'14px',borderRadius:12,background:'#00ff41',color:'#000',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1}}>
              FINALIZAR PEDIDO
            </button>
          </div>
        </div>
      )}
      {/* CHECKOUT */}
      {checkoutOpen&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',zIndex:60,overflowY:'auto',padding:16}}>
          <div style={{maxWidth:500,margin:'0 auto',paddingBottom:32}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,paddingTop:8}}>
              <button onClick={()=>{setCheckoutOpen(false);setCartOpen(true)}} style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:8,padding:'6px 10px',color:'#888',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><ChevronLeft size={14}/>Voltar</button>
              <h2 style={{fontFamily:'Bangers,cursive',fontSize:22,color:'#00ff41',letterSpacing:1}}>FINALIZAR PEDIDO</h2>
            </div>
            {[{label:'NOME *',field:'name',placeholder:'Seu nome completo'},{label:'WHATSAPP *',field:'phone',placeholder:'(27) 99999-9999'},{label:'ENDEREÇO',field:'address',placeholder:'Rua, número'},{label:'BAIRRO',field:'neighborhood',placeholder:'Bairro'},{label:'COMPLEMENTO',field:'complement',placeholder:'Apto, bloco...'},{label:'OBSERVAÇÕES',field:'notes',placeholder:'Alguma obs do pedido?'}].map(f=>(
              <div key={f.field} style={{marginBottom:10}}>
                <label style={{fontSize:10,color:'#666',display:'block',marginBottom:4,fontWeight:600,letterSpacing:0.5}}>{f.label}</label>
                <input value={(customer as any)[f.field]} onChange={e=>setCustomer(c=>({...c,[f.field]:e.target.value}))} placeholder={f.placeholder} style={{width:'100%',background:'#1a1a1a',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
              </div>
            ))}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,color:'#666',display:'block',marginBottom:8,fontWeight:600,letterSpacing:0.5}}>FORMA DE PAGAMENTO</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[{k:'pix',l:'💚 PIX'},{k:'dinheiro',l:'💵 Dinheiro'},{k:'debito',l:'💳 Débito'},{k:'credito',l:'💳 Crédito'}].map(m=>(
                  <button key={m.k} onClick={()=>setPayMethod(m.k)} style={{padding:'10px',borderRadius:10,border:payMethod===m.k?'2px solid #00ff41':'1px solid #2a2a2a',background:payMethod===m.k?'rgba(0,255,65,0.08)':'#1a1a1a',color:payMethod===m.k?'#00ff41':'#888',cursor:'pointer',fontSize:13,fontWeight:600}}>{m.l}</button>
                ))}
              </div>
              {payMethod==='dinheiro'&&(
                <div style={{marginTop:8}}>
                  <label style={{fontSize:10,color:'#666',display:'block',marginBottom:4}}>TROCO PARA QUANTO?</label>
                  <input type='number' value={needChange} onChange={e=>setNeedChange(e.target.value)} placeholder='Ex: 100,00 (deixe vazio se não precisar)' style={{width:'100%',background:'#1a1a1a',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'10px 12px',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
                </div>
              )}
            </div>
            {/* Order summary */}
            <div style={{background:'#1a1a1a',borderRadius:12,padding:'12px 14px',marginBottom:16}}>
              {cart.map((item,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'2px 0'}}>
                  <span style={{color:'#ccc'}}>{item.qty}x {item.name}{item.variant_name?' ('+item.variant_name+')':''}</span>
                  <span style={{color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price*item.qty)}</span>
                </div>
              ))}
              <div style={{borderTop:'1px solid #2a2a2a',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:14,color:'#888'}}>Total</span>
                <span style={{fontSize:16,fontWeight:700,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(cartTotal)}</span>
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