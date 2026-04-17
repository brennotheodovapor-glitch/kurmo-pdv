import{useState,useEffect,useRef}from 'react'
import{ShoppingCart,Plus,Minus,X,MapPin,ChevronDown,Loader2,Tag,Zap,Phone,Store}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const fmtWA=(v:string)=>{const n=v.replace(/\D/g,'').substring(0,11);if(n.length<=2)return n;if(n.length<=7)return'('+n.slice(0,2)+') '+n.slice(2);return'('+n.slice(0,2)+') '+n.slice(2,7)+'-'+n.slice(7)}
const fmtCEP=(v:string)=>v.replace(/\D/g,'').replace(/(\d{5})(\d{3})/,'$1-$2')

type Product={id:string;name:string;price:number;promo_price?:number;is_promo?:boolean;stock:number;image_url?:string;description?:string;category_id:string|null;sort_order?:number;has_sizes?:boolean}
type Variant={id:string;size:string;stock:number;active:boolean}
type Category={id:string;name:string;color:string}
type Zone={id:string;name:string;fee:number;min_time:number;max_time:number}
type CartItem=Product&{qty:number}
type Settings={store_name:string;store_logo_url?:string;store_banner_url?:string;store_description?:string;whatsapp?:string;min_order?:number;promo_title?:string;promo_description?:string}

export default function PublicMenuPage(){
  const[products,setProducts]=useState<Product[]>([])
  const[categories,setCategories]=useState<Category[]>([])
  const[zones,setZones]=useState<Zone[]>([])
  const[settings,setSettings]=useState<Settings>({store_name:'UZT 027',store_description:'Vapes & Roupas'})
  const[loading,setLoading]=useState(true)
  const[variants,setVariants]=useState<Record<string,Variant[]>>({})
  const[selectedSizes,setSelectedSizes]=useState<Record<string,string>>({})
  const[selCat,setSelCat]=useState<string|null>(null)
  const[cart,setCart]=useState<CartItem[]>([])
  const[cartOpen,setCartOpen]=useState(false)
  const[checkoutOpen,setCheckoutOpen]=useState(false)
  const[name,setName]=useState('')
  const[phone,setPhone]=useState('')
  const[cep,setCep]=useState('')
  const[numero,setNumero]=useState('')
  const[complemento,setComplemento]=useState('')
  const[addr,setAddr]=useState('')
  const[bairro,setBairro]=useState('')
  const[cidade,setCidade]=useState('')
  const[matchedZone,setMatchedZone]=useState<Zone|null>(null)
  const[cepLoading,setCepLoading]=useState(false)
  const[sending,setSending]=useState(false)
  const[orderType,setOrderType]=useState<'delivery'|'retirada'>('delivery')
  const promoRef=useRef<HTMLDivElement>(null)

  useEffect(()=>{load()},[])

  async function load(){
    setLoading(true)
    const[p,c,z,s,v]=await Promise.all([
      supabase.from('products').select('*').eq('active',true).gt('stock',0).order('sort_order').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('delivery_zones').select('*').eq('active',true).order('name'),
      supabase.from('store_settings').select('*').eq('id',1).maybeSingle(),
      supabase.from('product_variants').select('*').eq('active',true),
    ])
    setProducts(p.data||[])
    setCategories(c.data||[])
    setZones(z.data||[])
    if(s.data)setSettings(s.data)
    // Group variants by product
    const varMap:Record<string,Variant[]>={}
    ;(v.data||[]).forEach((vr:any)=>{if(!varMap[vr.product_id])varMap[vr.product_id]=[];varMap[vr.product_id].push(vr)})
    setVariants(varMap)
    setLoading(false)
  }

  async function handleCEP(raw:string){
    const clean=raw.replace(/\D/g,'')
    setCep(clean)
    if(clean.length!==8)return
    setCepLoading(true)
    try{
      const r=await fetch('https://viacep.com.br/ws/'+clean+'/json/')
      const d=await r.json()
      if(d.erro){toast.error('CEP não encontrado');return}
      setAddr(d.logradouro||'')
      setBairro(d.bairro||'')
      setCidade(d.localidade||'')
      const bairroVia=(d.bairro||'').toLowerCase().trim()
      // 1. Exact match
      let z=zones.find(z=>z.name.toLowerCase()===bairroVia)
      // 2. Zone name fully contained in bairro string
      if(!z)z=zones.find(z=>bairroVia===z.name.toLowerCase())
      // 3. bairro contains zone name (full words)
      if(!z)z=zones.find(z=>bairroVia.includes(z.name.toLowerCase()))
      // 4. Zone name contains bairro (full words)
      if(!z)z=zones.find(z=>z.name.toLowerCase().includes(bairroVia))
      // 5. First significant word match (skip "de","da","do","dos","das")
      if(!z){const skip=new Set(['de','da','do','dos','das','e','a','o']);const words=bairroVia.split(' ').filter(w=>w.length>2&&!skip.has(w));z=zones.find(z=>words.some(w=>z.name.toLowerCase().includes(w)&&w.length>=4))}
      setMatchedZone(z||null)
      if(z)toast.success('Entregamos em '+z.name+'! Frete: '+fmt(z.fee))
      else toast.error('Fora da área de entrega. Verifique com a loja.')
    }catch{toast.error('Erro ao buscar CEP')}
    finally{setCepLoading(false)}
  }

  function addToCart(p:Product,size?:string){
    if(p.has_sizes&&!size){toast.error('Selecione um tamanho');return}
    const cartKey=p.id+(size?'_'+size:'')
    setCart(c=>{const ex=c.find(i=>i.id===cartKey);if(ex)return c.map(i=>i.id===cartKey?{...i,qty:i.qty+1}:i);return[...c,{...p,id:cartKey,name:p.name+(size?' - '+size:''),qty:1}]})
  }
  const updQty=(id:string,d:number)=>setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+d)}:i).filter(i=>i.qty>0))
  const subtotal=cart.reduce((s,i)=>s+(i.is_promo&&i.promo_price?i.promo_price:i.price)*i.qty,0)
  const fee=orderType==='delivery'?(matchedZone?.fee||0):0
  const total=subtotal+fee
  const itemCount=cart.reduce((s,i)=>s+i.qty,0)
  const promoProducts=products.filter(p=>p.is_promo)
  const filtered=products.filter(p=>!selCat||p.category_id===selCat)

  async function sendOrder(){
    if(!name.trim()){toast.error('Informe seu nome');return}
    if(!phone||phone.replace(/\D/g,'').length<10){toast.error('WhatsApp inválido');return}
    if(orderType==='delivery'&&(!cep||cep.length<8)){toast.error('CEP inválido');return}
    if(orderType==='delivery'&&!numero.trim()){toast.error('Informe o número');return}
    if(cart.length===0){toast.error('Carrinho vazio');return}
    const minOrder=settings.min_order||0
    if(minOrder>0&&subtotal<minOrder){toast.error('Pedido mínimo: '+fmt(minOrder));return}
    setSending(true)
    try{
      const fullAddr=orderType==='delivery'?(addr+', '+numero+(complemento?' '+complemento:'')+' - '+bairro+' - '+cidade+' CEP:'+cep):'Retirada na loja'
      const{data:order,error}=await supabase.from('orders').insert({
        customer_name:name,customer_phone:phone.replace(/\D/g,''),
        type:'delivery',status:'pending',
        subtotal,discount:0,delivery_fee:fee,total,
        delivery_zone_id:matchedZone?.id||null,
        notes:fullAddr,
      }).select().single()
      if(error)throw error
      await supabase.from('order_items').insert(cart.map(i=>({
        order_id:order.id,product_id:i.id,product_name:i.name,
        quantity:i.qty,
        unit_price:i.is_promo&&i.promo_price?i.promo_price:i.price,
        total_price:(i.is_promo&&i.promo_price?i.promo_price:i.price)*i.qty
      })))
      // Save customer
      const phoneClean=phone.replace(/\D/g,'')
      const{data:existCust}=await supabase.from('customers').select('id,orders_count,total_spent').eq('phone',phoneClean).maybeSingle()
      const custData={name,phone:phoneClean,address:addr+', '+numero,neighborhood:bairro,zip_code:cep,updated_at:new Date().toISOString()}
      if(existCust)await supabase.from('customers').update({...custData,orders_count:(existCust.orders_count||0)+1,total_spent:(Number(existCust.total_spent)||0)+total}).eq('id',existCust.id)
      else await supabase.from('customers').insert({...custData,orders_count:1,total_spent:total})
      toast.success('Pedido #'+order.order_number+' enviado! Aguarde confirmação.')
      setCart([]);setCheckoutOpen(false);setCartOpen(false)
      setName('');setPhone('');setCep('');setNumero('');setComplemento('');setAddr('');setBairro('');setCidade('');setMatchedZone(null)
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setSending(false)}
  }

  const INP={width:'100%',background:'#1a1a1a',border:'1px solid #333',borderRadius:8,padding:'10px 14px',color:'#fff',fontSize:14,outline:'none',boxSizing:'border-box' as const}
  const LBL={fontSize:11,color:'#888',display:'block' as const,marginBottom:4,letterSpacing:0.5}

  if(loading) return(
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
      <Loader2 size={32} color='#00ff41' style={{animation:'spin 1s linear infinite'}}/>
      <p style={{color:'#00ff41',fontFamily:'Bangers,cursive',fontSize:18,letterSpacing:2}}>{settings.store_name}</p>
    </div>
  )

  return(
    <div style={{minHeight:'100vh',background:'#0a0a0a',color:'#fff',fontFamily:'Inter,sans-serif',maxWidth:480,margin:'0 auto',position:'relative'}}>

      {/* Banner */}
      {settings.store_banner_url?(
        <div style={{width:'100%',height:180,overflow:'hidden',position:'relative'}}>
          <img src={settings.store_banner_url} alt='Banner' style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 40%,#0a0a0a)'}}/>
        </div>
      ):(
        <div style={{width:'100%',height:120,background:'linear-gradient(135deg,#0d1f0d,#1a3a1a)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
          <div style={{position:'absolute',inset:0,background:'repeating-linear-gradient(45deg,transparent,transparent 20px,rgba(0,255,65,0.03) 20px,rgba(0,255,65,0.03) 40px)'}}/>
          <Zap size={32} color='#00ff41' style={{opacity:0.3}}/>
        </div>
      )}

      {/* Store header */}
      <div style={{padding:'0 16px 16px',marginTop:-32,position:'relative',zIndex:2}}>
        <div style={{display:'flex',alignItems:'flex-end',gap:12,marginBottom:10}}>
          <div style={{width:64,height:64,borderRadius:16,overflow:'hidden',background:'#111',border:'2px solid #00ff41',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {settings.store_logo_url?<img src={settings.store_logo_url} alt='Logo' style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<Store size={28} color='#00ff41'/>}
          </div>
          <div>
            <h1 style={{fontFamily:'Bangers,cursive',fontSize:26,color:'#00ff41',letterSpacing:2,lineHeight:1}}>{settings.store_name}</h1>
            {settings.store_description&&<p style={{fontSize:12,color:'#666',marginTop:2}}>{settings.store_description}</p>}
          </div>
        </div>

        {/* Promo banner */}
        {settings.promo_title&&(
          <div ref={promoRef} style={{background:'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))',border:'1px solid rgba(245,158,11,0.3)',borderRadius:12,padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
            <Tag size={16} color='#f59e0b'/>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:'#f59e0b'}}>{settings.promo_title}</p>
              {settings.promo_description&&<p style={{fontSize:11,color:'#999',marginTop:2}}>{settings.promo_description}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Promo products section */}
      {promoProducts.length>0&&(
        <div style={{padding:'0 16px 16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
            <Tag size={14} color='#f59e0b'/>
            <p style={{fontSize:14,fontWeight:700,color:'#f59e0b',letterSpacing:0.5}}>PROMOÇÕES</p>
          </div>
          <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:4}}>
            {promoProducts.map(p=>(
              <div key={p.id} style={{minWidth:140,background:'#111',border:'1px solid rgba(245,158,11,0.3)',borderRadius:12,overflow:'hidden',flexShrink:0}}>
                {p.image_url&&<img src={p.image_url} style={{width:'100%',height:90,objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                <div style={{padding:'8px 10px'}}>
                  <div style={{display:'inline-block',fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:'rgba(245,158,11,0.2)',color:'#f59e0b',marginBottom:4}}>OFERTA</div>
                  <p style={{fontSize:12,fontWeight:600,color:'#fff',marginBottom:4,lineHeight:1.3}}>{p.name}</p>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    {p.promo_price&&<span style={{fontSize:14,fontWeight:700,color:'#f59e0b'}}>{fmt(p.promo_price)}</span>}
                    <span style={{fontSize:11,color:'#555',textDecoration:p.promo_price?'line-through':'none'}}>{fmt(p.price)}</span>
                  </div>
                  <button onClick={()=>addToCart(p)} style={{marginTop:7,width:'100%',padding:'6px',borderRadius:7,border:'none',background:'#f59e0b',color:'#000',cursor:'pointer',fontSize:12,fontWeight:700}}>+ Adicionar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      {categories.length>0&&(
        <div style={{padding:'0 16px 12px',display:'flex',gap:7,overflowX:'auto',paddingBottom:12}}>
          <button onClick={()=>setSelCat(null)} style={{padding:'6px 14px',borderRadius:20,border:'none',background:!selCat?'#00ff41':'#1a1a1a',color:!selCat?'#000':'#888',cursor:'pointer',fontSize:12,fontWeight:600,whiteSpace:'nowrap',flexShrink:0}}>Todos</button>
          {categories.map(c=>(<button key={c.id} onClick={()=>setSelCat(c.id===selCat?null:c.id)} style={{padding:'6px 14px',borderRadius:20,border:'none',background:selCat===c.id?'#00ff41':'#1a1a1a',color:selCat===c.id?'#000':'#888',cursor:'pointer',fontSize:12,fontWeight:600,whiteSpace:'nowrap',flexShrink:0}}>{c.name}</button>))}
        </div>
      )}

      {/* Products grid */}
      <div style={{padding:'0 16px',paddingBottom:100}}>
        {filtered.length===0?(
          <div style={{textAlign:'center',padding:48,color:'#444'}}><p style={{fontSize:16}}>Nenhum produto disponível</p></div>
        ):filtered.map(p=>{
          const price=p.is_promo&&p.promo_price?p.promo_price:p.price
          const inCart=cart.find(i=>i.id===p.id)
          return(
            <div key={p.id} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:'1px solid #111',alignItems:'center'}}>
              <div style={{flex:1}}>
                {p.is_promo&&<span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:'rgba(245,158,11,0.2)',color:'#f59e0b',display:'inline-block',marginBottom:4}}>OFERTA</span>}
                <p style={{fontSize:14,fontWeight:600,color:'#fff',marginBottom:3,lineHeight:1.3}}>{p.name}</p>
                {p.description&&<p style={{fontSize:12,color:'#666',marginBottom:5,lineHeight:1.4}}>{p.description}</p>}
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:16,fontWeight:700,color:p.is_promo?'#f59e0b':'#00ff41'}}>{fmt(price)}</span>
                  {p.is_promo&&p.promo_price&&<span style={{fontSize:12,color:'#444',textDecoration:'line-through'}}>{fmt(p.price)}</span>}
                </div>
              </div>
              {p.image_url&&<div style={{width:80,height:80,borderRadius:10,overflow:'hidden',flexShrink:0}}><img src={p.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/></div>}
              <div style={{flexShrink:0}}>
                {inCart?(
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <button onClick={()=>updQty(p.id,1)} style={{width:32,height:32,borderRadius:'50%',border:'none',background:'#00ff41',color:'#000',cursor:'pointer',fontSize:18,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={14}/></button>
                    <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>{inCart.qty}</span>
                    <button onClick={()=>updQty(p.id,-1)} style={{width:32,height:32,borderRadius:'50%',border:'1px solid #333',background:'transparent',color:'#fff',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={14}/></button>
                  </div>
                ):(
                  <button onClick={()=>addToCart(p)} style={{width:32,height:32,borderRadius:'50%',border:'none',background:'#00ff41',color:'#000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={14}/></button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Cart FAB */}
      {itemCount>0&&!checkoutOpen&&(
        <div style={{position:'fixed',bottom:16,left:'50%',transform:'translateX(-50%)',width:'calc(min(480px,100vw) - 32px)',zIndex:40}}>
          <button onClick={()=>setCheckoutOpen(true)} style={{width:'100%',padding:'14px 20px',borderRadius:16,border:'none',background:'#00ff41',color:'#000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:14,fontWeight:700,boxShadow:'0 4px 24px rgba(0,255,65,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{background:'#000',color:'#00ff41',borderRadius:'50%',width:24,height:24,fontSize:12,fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>{itemCount}</span>
              <span>Ver carrinho</span>
            </div>
            <span>{fmt(subtotal)}</span>
          </button>
        </div>
      )}

      {/* Checkout drawer */}
      {checkoutOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',flexDirection:'column',justifyContent:'flex-end',background:'rgba(0,0,0,0.7)'}}>
          <div style={{background:'#111',borderRadius:'20px 20px 0 0',maxHeight:'90vh',overflowY:'auto',padding:20}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h2 style={{fontFamily:'Bangers,cursive',fontSize:22,color:'#00ff41',letterSpacing:1}}>SEU PEDIDO</h2>
              <button onClick={()=>setCheckoutOpen(false)} style={{background:'#222',border:'none',color:'#888',cursor:'pointer',borderRadius:8,padding:8}}><X size={16}/></button>
            </div>
            {/* Cart items */}
            <div style={{marginBottom:16}}>
              {cart.map(item=>{
                const p=item.is_promo&&item.promo_price?item.promo_price:item.price
                return(
                  <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #1a1a1a'}}>
                    <div style={{flex:1}}>
                      <p style={{fontSize:13,fontWeight:600,color:'#fff'}}>{item.name}</p>
                      <p style={{fontSize:12,color:'#00ff41'}}>{fmt(p)}</p>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <button onClick={()=>updQty(item.id,-1)} style={{width:28,height:28,borderRadius:'50%',border:'1px solid #333',background:'transparent',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={12}/></button>
                      <span style={{fontSize:14,fontWeight:700,color:'#fff',width:20,textAlign:'center'}}>{item.qty}</span>
                      <button onClick={()=>updQty(item.id,1)} style={{width:28,height:28,borderRadius:'50%',border:'none',background:'#00ff41',color:'#000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={12}/></button>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:'#fff',minWidth:60,textAlign:'right'}}>{fmt(p*item.qty)}</span>
                  </div>
                )
              })}
            </div>
            {/* Type toggle */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
              <button onClick={()=>setOrderType('delivery')} style={{padding:'10px',borderRadius:10,border:orderType==='delivery'?'2px solid #00ff41':'1px solid #333',background:orderType==='delivery'?'rgba(0,255,65,0.1)':'#1a1a1a',color:orderType==='delivery'?'#00ff41':'#666',cursor:'pointer',fontWeight:600,fontSize:13}}>🛵 Delivery</button>
              <button onClick={()=>setOrderType('retirada')} style={{padding:'10px',borderRadius:10,border:orderType==='retirada'?'2px solid #00ff41':'1px solid #333',background:orderType==='retirada'?'rgba(0,255,65,0.1)':'#1a1a1a',color:orderType==='retirada'?'#00ff41':'#666',cursor:'pointer',fontWeight:600,fontSize:13}}>🏪 Retirar</button>
            </div>
            {/* Form */}
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
              <div><label style={LBL}>SEU NOME *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder='João Silva' style={INP}/></div>
              <div><label style={LBL}>WHATSAPP *</label><input value={phone} onChange={e=>setPhone(fmtWA(e.target.value))} placeholder='(27) 99999-9999' style={INP} type='tel'/></div>
              {orderType==='delivery'&&(<>
                <div>
                  <label style={LBL}>CEP *</label>
                  <div style={{position:'relative'}}>
                    <input value={fmtCEP(cep)} onChange={e=>handleCEP(e.target.value)} placeholder='00000-000' style={INP} type='tel' maxLength={9}/>
                    {cepLoading&&<Loader2 size={14} color='#00ff41' style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',animation:'spin 1s linear infinite'}}/>}
                  </div>
                </div>
                {addr&&(<>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 80px',gap:8}}>
                    <div><label style={LBL}>ENDEREÇO</label><input value={addr} onChange={e=>setAddr(e.target.value)} style={INP}/></div>
                    <div><label style={LBL}>NÚMERO *</label><input value={numero} onChange={e=>setNumero(e.target.value)} placeholder='123' style={INP}/></div>
                  </div>
                  <div><label style={LBL}>COMPLEMENTO</label><input value={complemento} onChange={e=>setComplemento(e.target.value)} placeholder='Apto, Bloco...' style={INP}/></div>
                  {matchedZone?(
                    <div style={{padding:'10px 14px',background:'rgba(0,255,65,0.08)',borderRadius:8,border:'1px solid rgba(0,255,65,0.2)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div><p style={{fontSize:13,color:'#fff',fontWeight:600}}>{matchedZone.name}</p><p style={{fontSize:11,color:'#666'}}>{matchedZone.min_time}-{matchedZone.max_time} min</p></div>
                      <p style={{fontSize:16,fontWeight:700,color:'#00ff41'}}>{matchedZone.fee===0?'Grátis':fmt(matchedZone.fee)}</p>
                    </div>
                  ):(
                    <div style={{padding:'8px 12px',background:'rgba(255,51,51,0.08)',borderRadius:8,border:'1px solid rgba(255,51,51,0.2)',fontSize:12,color:'#ff5555'}}>
                      Bairro fora da área de entrega. Entre em contato com a loja.
                    </div>
                  )}
                </>)}
              </>)}
            </div>
            {/* Totals */}
            <div style={{padding:'12px 14px',background:'#1a1a1a',borderRadius:10,marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#888',marginBottom:5}}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              {orderType==='delivery'&&fee>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#888',marginBottom:5}}><span>Entrega</span><span style={{color:'#f59e0b'}}>{fmt(fee)}</span></div>}
              {orderType==='delivery'&&!matchedZone&&cep.length>=8&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#ff5555',marginBottom:5}}><span>Entrega</span><span>Consultar</span></div>}
              <div style={{display:'flex',justifyContent:'space-between',fontSize:18,fontWeight:700,color:'#00ff41',borderTop:'1px solid #333',paddingTop:8,marginTop:4}}><span>TOTAL</span><span>{fmt(total)}</span></div>
            </div>
            <button onClick={sendOrder} disabled={sending} style={{width:'100%',padding:16,borderRadius:12,border:'none',background:sending?'#555':'#00ff41',color:'#000',cursor:sending?'not-allowed':'pointer',fontSize:16,fontWeight:700,letterSpacing:0.5}}>
              {sending?'ENVIANDO...':'FAZER PEDIDO'}
            </button>
            <p style={{fontSize:11,color:'#555',textAlign:'center',marginTop:8}}>Após confirmar, aguarde o contato da loja pelo WhatsApp</p>
          </div>
        </div>
      )}
    </div>
  )
}