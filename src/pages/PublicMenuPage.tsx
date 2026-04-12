import{useState,useEffect,useRef}from 'react'
import{supabase}from '@/lib/supabase'
import{ShoppingCart,Plus,Minus,X,MapPin,CheckCircle,Loader2,ChevronDown,Tag,Star,Edit3,Save,Upload,Image,ToggleLeft,ToggleRight}from 'lucide-react'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const fmtCEP=(v:string)=>v.replace(/\D/g,'').replace(/(\d{5})(\d{3})/,'$1-$2')
const fmtWA=(v:string)=>{const n=v.replace(/\D/g,'').substring(0,11);if(n.length<=2)return n;if(n.length<=7)return '('+n.slice(0,2)+') '+n.slice(2);return '('+n.slice(0,2)+') '+n.slice(2,7)+'-'+n.slice(7)}

type Product={id:string;name:string;price:number;stock:number;image_url?:string;description?:string;category_id:string|null}
type Category={id:string;name:string;color:string}
type Zone={id:string;name:string;fee:number;min_time:number;max_time:number}
type CartItem=Product&{qty:number}
type Settings={store_name:string;store_logo_url?:string;store_banner_url?:string;store_description?:string;promo_active:boolean;promo_title?:string;promo_banner_url?:string;product_order?:string[]}

export default function PublicMenuPage(){
  const[products,setProducts]=useState<Product[]>([])
  const[categories,setCategories]=useState<Category[]>([])
  const[zones,setZones]=useState<Zone[]>([])
  const[settings,setSettings]=useState<Settings>({store_name:'UZT 027',promo_active:false})
  const[cart,setCart]=useState<CartItem[]>([])
  const[selCat,setSelCat]=useState<string|null>(null)
  const[cartOpen,setCartOpen]=useState(false)
  const[loading,setLoading]=useState(true)
  // Checkout
  const[checkout,setCheckout]=useState(false)
  const[nome,setNome]=useState('')
  const[whatsapp,setWhatsapp]=useState('')
  const[cep,setCep]=useState('')
  const[numero,setNumero]=useState('')
  const[complemento,setComplemento]=useState('')
  const[referencia,setReferencia]=useState('')
  const[endereco,setEndereco]=useState('')
  const[bairro,setBairro]=useState('')
  const[cidade,setCidade]=useState('')
  const[estado,setEstado]=useState('')
  const[cepLoading,setCepLoading]=useState(false)
  const[matchedZone,setMatchedZone]=useState<Zone|null>(null)
  const[placing,setPlacing]=useState(false)
  const[done,setDone]=useState(false)
  // Admin edit mode
  const[isAdmin,setIsAdmin]=useState(false)
  const[editMode,setEditMode]=useState(false)
  const[editSettings,setEditSettings]=useState<Settings>({store_name:'UZT 027',promo_active:false})
  const[savingSettings,setSavingSettings]=useState(false)
  const[uploadingLogo,setUploadingLogo]=useState(false)
  const[uploadingBanner,setUploadingBanner]=useState(false)
  const[uploadingPromo,setUploadingPromo]=useState(false)
  const logoRef=useRef<HTMLInputElement>(null)
  const bannerRef=useRef<HTMLInputElement>(null)
  const promoRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{
    load()
    // Check if admin is logged in
    supabase.auth.getSession().then(({data})=>{if(data.session)setIsAdmin(true)})
  },[])

  async function load(){
    const[p,c,z,s]=await Promise.all([
      supabase.from('products').select('*').eq('active',true).gt('stock',0).order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('delivery_zones').select('*').eq('active',true).order('name'),
      supabase.from('store_settings').select('*').limit(1).maybeSingle()
    ])
    const prods=p.data||[]
    const sett=s.data as Settings||{store_name:'UZT 027',promo_active:false}
    // Apply custom order if set
    if(sett.product_order?.length){
      prods.sort((a,b)=>{
        const ai=sett.product_order!.indexOf(a.id)
        const bi=sett.product_order!.indexOf(b.id)
        if(ai<0&&bi<0)return 0;if(ai<0)return 1;if(bi<0)return -1;return ai-bi
      })
    }
    setProducts(prods);setCategories(c.data||[]);setZones(z.data||[]);setSettings(sett);setEditSettings(sett)
    setLoading(false)
  }

  async function uploadImg(file:File,path:string,onDone:(url:string)=>void,setLoading:(v:boolean)=>void){
    setLoading(true)
    const ext=file.name.split('.').pop()||'jpg'
    const fn=path+Date.now()+'.'+ext
    const{error}=await supabase.storage.from('product-images').upload(fn,file,{upsert:true,contentType:file.type})
    if(error){alert('Erro upload: '+error.message);setLoading(false);return}
    const{data:{publicUrl}}=supabase.storage.from('product-images').getPublicUrl(fn)
    onDone(publicUrl);setLoading(false)
  }

  async function saveSettings(){
    setSavingSettings(true)
    const{data:existing}=await supabase.from('store_settings').select('id').limit(1).maybeSingle()
    if(existing){await supabase.from('store_settings').update({...editSettings,updated_at:new Date().toISOString()}).eq('id',existing.id)}
    else{await supabase.from('store_settings').insert(editSettings)}
    setSettings(editSettings);setEditMode(false);setSavingSettings(false)
    load()
  }

  async function handleCEP(raw:string){
    const clean=raw.replace(/\D/g,'')
    setCep(clean)
    if(clean.length!==8)return
    setCepLoading(true)
    try{
      const r=await fetch('https://viacep.com.br/ws/'+clean+'/json/')
      const d=await r.json()
      if(d.erro)return
      setEndereco(d.logradouro||'');setBairro(d.bairro||'');setCidade(d.localidade||'');setEstado(d.uf||'')
      const z=zones.find(z=>d.bairro?.toLowerCase().includes(z.name.toLowerCase())||z.name.toLowerCase().includes(d.bairro?.toLowerCase().split(' ')[0]))
      setMatchedZone(z||null)
    }catch{}
    setCepLoading(false)
  }

  const addToCart=(p:Product)=>setCart(c=>{const ex=c.find(i=>i.id===p.id);if(ex)return c.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i);return[...c,{...p,qty:1}]})
  const updQty=(id:string,d:number)=>setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+d)}:i).filter(i=>i.qty>0))
  const subtotal=cart.reduce((s,i)=>s+i.price*i.qty,0)
  const delivFee=matchedZone?.fee||0
  const total=subtotal+delivFee
  const itemCount=cart.reduce((s,i)=>s+i.qty,0)

  const filteredProds=products.filter(p=>!selCat||p.category_id===selCat)

  async function placeOrder(){
    if(!nome.trim()||!whatsapp.replace(/\D/g,'').match(/^\d{10,11}$/)){ alert('Informe nome e WhatsApp válido');return}
    if(!cep.replace(/\D/g,'').match(/^\d{8}$/)){alert('CEP inválido');return}
    if(!numero.trim()){alert('Informe o número');return}
    setPlacing(true)
    const fullAddr=endereco+', '+numero+(complemento?' '+complemento:'')+' - '+bairro+' - '+cidade+'/'+estado+' CEP:'+cep+(referencia?' | Ref: '+referencia:'')
    const{data:order,error}=await supabase.from('orders').insert({
      customer_name:nome,customer_phone:whatsapp.replace(/\D/g,''),
      type:'delivery',status:'pending',
      subtotal,discount:0,delivery_fee:delivFee,total,
      delivery_zone_id:matchedZone?.id||null,notes:fullAddr
    }).select().single()
    if(error||!order){setPlacing(false);alert('Erro ao realizar pedido. Tente novamente.');return}
    await supabase.from('order_items').insert(cart.map(i=>({order_id:order.id,product_id:i.id,product_name:i.name,quantity:i.qty,unit_price:i.price,total_price:i.price*i.qty})))
    // Save customer
    const phone=whatsapp.replace(/\D/g,'')
    const{data:ec}=await supabase.from('customers').select('id,orders_count,total_spent').eq('phone',phone).maybeSingle()
    if(ec){await supabase.from('customers').update({name:nome,address:fullAddr,neighborhood:bairro,zip_code:cep,orders_count:(ec.orders_count||0)+1,total_spent:(Number(ec.total_spent)||0)+total,updated_at:new Date().toISOString()}).eq('id',ec.id)}
    else{await supabase.from('customers').insert({name:nome,phone,address:fullAddr,neighborhood:bairro,zip_code:cep,orders_count:1,total_spent:total})}
    setDone(true);setCart([]);setPlacing(false)
  }

  if(loading)return(<div style={{minHeight:'100vh',background:'#050f05',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}><div style={{width:56,height:56,borderRadius:16,background:'rgba(0,255,65,0.1)',border:'1px solid rgba(0,255,65,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>⚡</div><p style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#00ff41',letterSpacing:2}}>CARREGANDO...</p></div>)

  if(done)return(<div style={{minHeight:'100vh',background:'#050f05',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,padding:24}}><div style={{width:72,height:72,borderRadius:20,background:'rgba(0,255,65,0.1)',border:'2px solid #00ff41',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36}}>✅</div><h1 style={{fontFamily:'Bangers,cursive',fontSize:28,color:'#00ff41',textAlign:'center',letterSpacing:2}}>PEDIDO REALIZADO!</h1><p style={{color:'#4a7c59',textAlign:'center',maxWidth:300}}>Recebemos seu pedido! Logo entraremos em contato pelo WhatsApp para confirmar.</p><button onClick={()=>{setDone(false);setCheckout(false);setNome('');setWhatsapp('');setCep('');setNumero('');setComplemento('');setReferencia('');setEndereco('');setBairro('');setCidade('');setEstado('');setMatchedZone(null)}} style={{padding:'12px 28px',borderRadius:12,border:'2px solid #00ff41',background:'rgba(0,255,65,0.1)',color:'#00ff41',fontFamily:'Bangers,cursive',fontSize:16,cursor:'pointer',letterSpacing:1}}>FAZER OUTRO PEDIDO</button></div>)

  const S=settings

  return(
    <div style={{minHeight:'100vh',background:'#050f05',fontFamily:'system-ui,sans-serif',maxWidth:480,margin:'0 auto',position:'relative'}}>
      
      {/* Admin edit bar */}
      {isAdmin&&(
        <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(0,0,0,0.95)',borderBottom:'1px solid rgba(0,255,65,0.2)',padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
          <Edit3 size={13} color='var(--neon)'/>
          <span style={{fontSize:11,color:'var(--neon)',fontFamily:'Bangers,cursive',letterSpacing:0.5}}>MODO ADMIN</span>
          <button onClick={()=>setEditMode(!editMode)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid var(--neon)',background:editMode?'var(--neon)':'transparent',color:editMode?'#000':'var(--neon)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>
            {editMode?'EDITANDO':'EDITAR LOJA'}
          </button>
          {editMode&&<button onClick={saveSettings} disabled={savingSettings} style={{padding:'4px 10px',borderRadius:6,border:'none',background:'#10b981',color:'#fff',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive',display:'flex',alignItems:'center',gap:4}}><Save size={11}/>{savingSettings?'...':'SALVAR'}</button>}
        </div>
      )}

      {/* Banner */}
      <div style={{position:'relative',width:'100%',height:editMode&&!S.store_banner_url?120:S.store_banner_url?200:80,background:S.store_banner_url?'transparent':'linear-gradient(135deg,#0a1a0a 0%,#0d2a0d 100%)',overflow:'hidden'}}>
        {S.store_banner_url&&<img src={editMode?editSettings.store_banner_url||S.store_banner_url:S.store_banner_url} alt='banner' style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
        {!S.store_banner_url&&!editMode&&<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{fontFamily:'Bangers,cursive',fontSize:14,color:'rgba(0,255,65,0.3)',letterSpacing:2}}>UZT 027</p></div>}
        {editMode&&(<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',gap:10}}>
          <button onClick={()=>bannerRef.current?.click()} style={{padding:'8px 14px',borderRadius:8,border:'1px solid var(--neon)',background:'rgba(0,255,65,0.1)',color:'var(--neon)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',display:'flex',alignItems:'center',gap:5}}>{uploadingBanner?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Upload size={13}/>}BANNER</button>
          {editSettings.store_banner_url&&<button onClick={()=>setEditSettings(s=>({...s,store_banner_url:''}))} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',fontSize:11}}>REMOVER</button>}
          <input ref={bannerRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImg(f,'banners/',url=>setEditSettings(s=>({...s,store_banner_url:url})),setUploadingBanner)}}/>
        </div>)}
        {/* Logo overlay */}
        <div style={{position:'absolute',bottom:S.store_banner_url?-24:-12,left:16}}>
          <div onClick={editMode?()=>logoRef.current?.click():undefined} style={{width:56,height:56,borderRadius:14,border:'2px solid #00ff41',overflow:'hidden',background:'#050f05',cursor:editMode?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
            {(editMode?editSettings.store_logo_url:S.store_logo_url)?<img src={editMode?editSettings.store_logo_url:S.store_logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:22}}>⚡</span>}
            {editMode&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center'}}>{uploadingLogo?<Loader2 size={14} style={{animation:'spin 1s linear infinite',color:'var(--neon)'}}/>:<Upload size={14} color='var(--neon)'/>}</div>}
          </div>
          <input ref={logoRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImg(f,'logos/',url=>setEditSettings(s=>({...s,store_logo_url:url})),setUploadingLogo)}}/>
        </div>
      </div>

      {/* Store info */}
      <div style={{padding:'28px 16px 8px',background:'#050f05'}}>
        {editMode?(
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:8}}>
            <input value={editSettings.store_name} onChange={e=>setEditSettings(s=>({...s,store_name:e.target.value}))} style={{fontFamily:'Bangers,cursive',fontSize:22,letterSpacing:2,background:'rgba(0,255,65,0.05)',border:'1px solid rgba(0,255,65,0.3)',color:'#00ff41',borderRadius:8,padding:'6px 10px'}}/>
            <input value={editSettings.store_description||''} onChange={e=>setEditSettings(s=>({...s,store_description:e.target.value}))} placeholder='Descrição da loja' style={{fontSize:13,background:'rgba(0,255,65,0.03)',border:'1px solid rgba(0,255,65,0.15)',color:'#4a7c59',borderRadius:8,padding:'6px 10px'}}/>
          </div>
        ):(
          <div style={{marginBottom:8}}>
            <h1 style={{fontFamily:'Bangers,cursive',fontSize:26,color:'#00ff41',letterSpacing:2,margin:0}}>{S.store_name}</h1>
            {S.store_description&&<p style={{fontSize:13,color:'#4a7c59',marginTop:2}}>{S.store_description}</p>}
          </div>
        )}
      </div>

      {/* Promo banner */}
      {editMode&&(
        <div style={{margin:'0 16px 12px',padding:'12px 14px',background:'rgba(245,158,11,0.06)',borderRadius:12,border:'1px solid rgba(245,158,11,0.2)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <Star size={13} color='#f59e0b'/>
            <span style={{fontFamily:'Bangers,cursive',fontSize:13,color:'#f59e0b',letterSpacing:0.5}}>BANNER DE PROMOÇÃO</span>
            <button onClick={()=>setEditSettings(s=>({...s,promo_active:!s.promo_active}))} style={{background:'none',border:'none',cursor:'pointer',marginLeft:'auto'}}>
              {editSettings.promo_active?<ToggleRight size={22} color='#f59e0b'/>:<ToggleLeft size={22} color='var(--muted)'/>}
            </button>
          </div>
          <input value={editSettings.promo_title||''} onChange={e=>setEditSettings(s=>({...s,promo_title:e.target.value}))} placeholder='Título da promoção (ex: LEVE 2 PAGUE 1)' style={{width:'100%',marginBottom:8,fontSize:12}}/>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>promoRef.current?.click()} style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #f59e0b',background:'rgba(245,158,11,0.08)',color:'#f59e0b',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>{uploadingPromo?<Loader2 size={12} style={{animation:'spin 1s linear infinite'}}/>:<Image size={12}/>}IMAGEM PROMO</button>
            {editSettings.promo_banner_url&&<button onClick={()=>setEditSettings(s=>({...s,promo_banner_url:''}))} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #ff3333',background:'transparent',color:'#ff3333',cursor:'pointer',fontSize:11}}>REMOVER</button>}
          </div>
          <input ref={promoRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImg(f,'promos/',url=>setEditSettings(s=>({...s,promo_banner_url:url})),setUploadingPromo)}}/>
        </div>
      )}
      {!editMode&&S.promo_active&&(S.promo_title||S.promo_banner_url)&&(
        <div style={{margin:'0 16px 12px',borderRadius:14,overflow:'hidden',border:'1px solid rgba(245,158,11,0.3)'}}>
          {S.promo_banner_url&&<img src={S.promo_banner_url} alt='promo' style={{width:'100%',maxHeight:120,objectFit:'cover'}}/>}
          {S.promo_title&&<div style={{padding:'8px 12px',background:'rgba(245,158,11,0.08)',display:'flex',alignItems:'center',gap:6}}><Star size={13} color='#f59e0b'/><span style={{fontFamily:'Bangers,cursive',fontSize:14,color:'#f59e0b',letterSpacing:0.5}}>{S.promo_title}</span></div>}
        </div>
      )}

      {/* Categories */}
      <div style={{display:'flex',gap:8,overflowX:'auto',padding:'8px 16px',scrollbarWidth:'none'}}>
        <button onClick={()=>setSelCat(null)} style={{padding:'6px 14px',borderRadius:20,border:!selCat?'1px solid #00ff41':'1px solid rgba(0,255,65,0.15)',background:!selCat?'rgba(0,255,65,0.1)':'transparent',color:!selCat?'#00ff41':'#4a7c59',cursor:'pointer',fontSize:12,whiteSpace:'nowrap',fontWeight:600}}>Todos</button>
        {categories.map(c=>(<button key={c.id} onClick={()=>setSelCat(c.id===selCat?null:c.id)} style={{padding:'6px 14px',borderRadius:20,border:selCat===c.id?'1px solid #00ff41':'1px solid rgba(0,255,65,0.15)',background:selCat===c.id?'rgba(0,255,65,0.1)':'transparent',color:selCat===c.id?'#00ff41':'#4a7c59',cursor:'pointer',fontSize:12,whiteSpace:'nowrap',fontWeight:600}}>{c.name}</button>))}
      </div>

      {/* Products */}
      <div style={{padding:'4px 12px 100px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {filteredProds.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:40,color:'#4a7c59'}}>Nenhum produto disponível</div>}
        {filteredProds.map(p=>(<div key={p.id} style={{background:'rgba(0,255,65,0.03)',borderRadius:14,border:'1px solid rgba(0,255,65,0.1)',overflow:'hidden'}}>
          {p.image_url&&p.image_url.startsWith('http')?<img src={p.image_url} alt={p.name} style={{width:'100%',height:130,objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>:<div style={{height:100,background:'rgba(0,255,65,0.04)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>📦</div>}
          <div style={{padding:'10px 10px 12px'}}>
            <p style={{fontSize:13,fontWeight:600,color:'#e0f0e0',marginBottom:3,lineHeight:1.3}}>{p.name}</p>
            {p.description&&<p style={{fontSize:11,color:'#4a7c59',marginBottom:6,lineHeight:1.4}}>{p.description}</p>}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:16,fontWeight:700,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.price)}</span>
              {cart.find(i=>i.id===p.id)?(
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <button onClick={()=>updQty(p.id,-1)} style={{width:26,height:26,borderRadius:8,border:'1px solid rgba(0,255,65,0.3)',background:'transparent',color:'#00ff41',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={11}/></button>
                  <span style={{fontSize:13,fontWeight:700,color:'#00ff41',minWidth:20,textAlign:'center'}}>{cart.find(i=>i.id===p.id)?.qty}</span>
                  <button onClick={()=>addToCart(p)} style={{width:26,height:26,borderRadius:8,border:'none',background:'#00ff41',color:'#000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={11}/></button>
                </div>
              ):(
                <button onClick={()=>addToCart(p)} style={{width:32,height:32,borderRadius:10,border:'none',background:'#00ff41',color:'#000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={16}/></button>
              )}
            </div>
          </div>
        </div>))}
      </div>

      {/* Cart button */}
      {itemCount>0&&!cartOpen&&(
        <button onClick={()=>setCartOpen(true)} style={{position:'fixed',bottom:20,left:'50%',transform:'translateX(-50%)',background:'#00ff41',color:'#000',border:'none',borderRadius:14,padding:'14px 24px',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1,cursor:'pointer',display:'flex',alignItems:'center',gap:10,boxShadow:'0 4px 20px rgba(0,255,65,0.4)',zIndex:40,maxWidth:320,width:'calc(100% - 40px)',justifyContent:'space-between'}}>
          <span style={{background:'rgba(0,0,0,0.2)',borderRadius:20,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{itemCount}</span>
          <span>VER CARRINHO</span>
          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:14}}>{fmt(subtotal)}</span>
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',flexDirection:'column'}}>
          <div onClick={()=>setCartOpen(false)} style={{flex:'0 0 30%',background:'rgba(0,0,0,0.7)'}}/>
          <div style={{flex:1,background:'#080f08',borderRadius:'20px 20px 0 0',border:'1px solid rgba(0,255,65,0.15)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(0,255,65,0.1)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontFamily:'Bangers,cursive',fontSize:18,color:'#00ff41',letterSpacing:1}}>CARRINHO ({itemCount})</span>
              <button onClick={()=>setCartOpen(false)} style={{background:'none',border:'none',color:'#4a7c59',cursor:'pointer'}}><X size={18}/></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'8px 16px'}}>
              {cart.map(item=>(<div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid rgba(0,255,65,0.06)'}}>
                <div style={{flex:1}}><p style={{fontSize:13,fontWeight:600,color:'#e0f0e0'}}>{item.name}</p><p style={{fontSize:12,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price)}</p></div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <button onClick={()=>updQty(item.id,-1)} style={{width:28,height:28,borderRadius:8,border:'1px solid rgba(0,255,65,0.2)',background:'transparent',color:'#00ff41',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={12}/></button>
                  <span style={{fontSize:14,fontWeight:700,color:'#00ff41',minWidth:24,textAlign:'center'}}>{item.qty}</span>
                  <button onClick={()=>addToCart(item)} style={{width:28,height:28,borderRadius:8,border:'none',background:'#00ff41',color:'#000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={12}/></button>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:'#e0f0e0',fontFamily:'JetBrains Mono,monospace',minWidth:60,textAlign:'right'}}>{fmt(item.price*item.qty)}</span>
              </div>))}
            </div>
            <div style={{padding:'12px 16px',borderTop:'1px solid rgba(0,255,65,0.1)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                <span style={{color:'#4a7c59',fontSize:14}}>Subtotal</span>
                <span style={{color:'#00ff41',fontWeight:700,fontFamily:'JetBrains Mono,monospace',fontSize:16}}>{fmt(subtotal)}</span>
              </div>
              <button onClick={()=>{setCartOpen(false);setCheckout(true)}} style={{width:'100%',padding:'14px',borderRadius:12,border:'none',background:'#00ff41',color:'#000',fontFamily:'Bangers,cursive',fontSize:17,letterSpacing:1,cursor:'pointer'}}>FINALIZAR PEDIDO →</button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout */}
      {checkout&&(
        <div style={{position:'fixed',inset:0,background:'#050f05',zIndex:60,overflowY:'auto',padding:'16px 16px 40px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
            <button onClick={()=>setCheckout(false)} style={{background:'none',border:'none',color:'#4a7c59',cursor:'pointer',fontSize:20}}>←</button>
            <h2 style={{fontFamily:'Bangers,cursive',fontSize:22,color:'#00ff41',letterSpacing:1,margin:0}}>FINALIZAR PEDIDO</h2>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
            <div><label style={{fontSize:11,color:'#4a7c59',display:'block',marginBottom:5,letterSpacing:0.5,fontWeight:600}}>SEU NOME *</label><input value={nome} onChange={e=>setNome(e.target.value)} placeholder='Nome completo' style={{width:'100%',padding:'12px 14px',background:'rgba(0,255,65,0.04)',border:'1px solid rgba(0,255,65,0.15)',borderRadius:10,color:'#e0f0e0',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/></div>
            <div><label style={{fontSize:11,color:'#4a7c59',display:'block',marginBottom:5,letterSpacing:0.5,fontWeight:600}}>WHATSAPP *</label><input value={whatsapp} onChange={e=>setWhatsapp(fmtWA(e.target.value))} placeholder='(27) 99999-9999' type='tel' maxLength={15} style={{width:'100%',padding:'12px 14px',background:'rgba(0,255,65,0.04)',border:'1px solid rgba(0,255,65,0.15)',borderRadius:10,color:'#e0f0e0',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/></div>
            <div>
              <label style={{fontSize:11,color:'#4a7c59',display:'block',marginBottom:5,letterSpacing:0.5,fontWeight:600}}>CEP *</label>
              <div style={{position:'relative'}}>
                <input value={fmtCEP(cep)} onChange={e=>handleCEP(e.target.value)} placeholder='00000-000' type='tel' maxLength={9} style={{width:'100%',padding:'12px 14px',background:'rgba(0,255,65,0.04)',border:'1px solid rgba(0,255,65,0.15)',borderRadius:10,color:'#e0f0e0',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/>
                {cepLoading&&<Loader2 size={16} color='#00ff41' style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',animation:'spin 1s linear infinite'}}/>}
                {!cepLoading&&endereco&&<CheckCircle size={16} color='#00ff41' style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)'}}/>}
              </div>
            </div>
            {matchedZone&&<div style={{padding:'10px 14px',background:'rgba(0,255,65,0.06)',border:'1px solid rgba(0,255,65,0.2)',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><p style={{fontSize:13,color:'#e0f0e0',fontWeight:600}}>{matchedZone.name}</p><p style={{fontSize:11,color:'#4a7c59'}}>{matchedZone.min_time}-{matchedZone.max_time} min</p></div><p style={{fontSize:18,fontWeight:700,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{matchedZone.fee===0?'Grátis':fmt(matchedZone.fee)}</p></div>}
            {endereco&&(<>
              <div style={{display:'grid',gridTemplateColumns:'1fr 90px',gap:10}}>
                <div><label style={{fontSize:11,color:'#4a7c59',display:'block',marginBottom:5,fontWeight:600}}>ENDEREÇO</label><input value={endereco} onChange={e=>setEndereco(e.target.value)} style={{width:'100%',padding:'12px 14px',background:'rgba(0,255,65,0.04)',border:'1px solid rgba(0,255,65,0.15)',borderRadius:10,color:'#e0f0e0',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/></div>
                <div><label style={{fontSize:11,color:'#4a7c59',display:'block',marginBottom:5,fontWeight:600}}>NÚMERO *</label><input value={numero} onChange={e=>setNumero(e.target.value)} placeholder='123' autoFocus style={{width:'100%',padding:'12px 14px',background:'rgba(0,255,65,0.04)',border:'1px solid rgba(0,255,65,0.15)',borderRadius:10,color:'#e0f0e0',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/></div>
              </div>
              <input value={complemento} onChange={e=>setComplemento(e.target.value)} placeholder='Complemento (opcional)' style={{width:'100%',padding:'12px 14px',background:'rgba(0,255,65,0.04)',border:'1px solid rgba(0,255,65,0.15)',borderRadius:10,color:'#e0f0e0',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/>
              <input value={referencia} onChange={e=>setReferencia(e.target.value)} placeholder='Ponto de referência' style={{width:'100%',padding:'12px 14px',background:'rgba(0,255,65,0.04)',border:'1px solid rgba(0,255,65,0.15)',borderRadius:10,color:'#e0f0e0',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/>
            </>)}
          </div>
          {/* Order summary */}
          <div style={{background:'rgba(0,255,65,0.04)',border:'1px solid rgba(0,255,65,0.1)',borderRadius:14,padding:'14px 16px',marginBottom:16}}>
            <p style={{fontFamily:'Bangers,cursive',fontSize:14,color:'#00ff41',marginBottom:8,letterSpacing:0.5}}>RESUMO DO PEDIDO</p>
            {cart.map(i=>(<div key={i.id} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'3px 0',color:'#4a7c59'}}><span>{i.qty}x {i.name}</span><span style={{color:'#e0f0e0',fontFamily:'JetBrains Mono,monospace'}}>{fmt(i.price*i.qty)}</span></div>))}
            <div style={{borderTop:'1px solid rgba(0,255,65,0.1)',marginTop:8,paddingTop:8}}>
              {delivFee>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#4a7c59',marginBottom:4}}><span>Frete</span><span>{fmt(delivFee)}</span></div>}
              <div style={{display:'flex',justifyContent:'space-between',fontSize:17,fontWeight:700,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}><span>TOTAL</span><span>{fmt(total)}</span></div>
            </div>
          </div>
          <button onClick={placeOrder} disabled={placing||!nome||!endereco||!numero} style={{width:'100%',padding:'16px',borderRadius:14,border:'none',background:placing||!nome||!endereco||!numero?'rgba(0,255,65,0.3)':'#00ff41',color:'#000',fontFamily:'Bangers,cursive',fontSize:18,letterSpacing:1,cursor:placing?'wait':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {placing?<><Loader2 size={18} style={{animation:'spin 1s linear infinite'}}/>ENVIANDO...</>:'✓ CONFIRMAR PEDIDO'}
          </button>
        </div>
      )}
    </div>
  )
}