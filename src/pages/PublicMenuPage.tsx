import{useState,useEffect}from 'react'
import{useParams,useNavigate}from 'react-router-dom'
import{supabase}from '@/lib/supabase'
import{ShoppingCart,Plus,Minus,X,Search,ArrowRight,MapPin,Phone,Clock,ChevronDown}from 'lucide-react'
import toast from 'react-hot-toast'

type Product={id:string;name:string;price:number;description?:string;image_url?:string;category_id:string|null;stock:number}
type Category={id:string;name:string;icon:string;color:string}
type CartItem=Product&{qty:number}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function PublicMenuPage(){
  const[products,setProducts]=useState<Product[]>([])
  const[categories,setCategories]=useState<Category[]>([])
  const[cart,setCart]=useState<CartItem[]>([])
  const[search,setSearch]=useState('')
  const[activeCat,setActiveCat]=useState<string|null>(null)
  const[loading,setLoading]=useState(true)
  const[cartOpen,setCartOpen]=useState(false)
  const[checkoutStep,setCheckoutStep]=useState<'cart'|'form'|'success'>('cart')
  const[form,setForm]=useState({name:'',phone:'',address:'',notes:''})
  const[submitting,setSubmitting]=useState(false)
  const navigate=useNavigate()

  useEffect(()=>{loadData()},[])

  async function loadData(){
    setLoading(true)
    const[p,c]=await Promise.all([
      supabase.from('products').select('*').eq('active',true).gt('stock',0).order('name'),
      supabase.from('categories').select('*').order('name')
    ])
    setProducts(p.data||[])
    setCategories(c.data||[])
    setLoading(false)
  }

  const filtered=products.filter(p=>{
    if(activeCat&&p.category_id!==activeCat)return false
    if(search)return p.name.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const addToCart=(p:Product)=>{
    setCart(c=>{
      const ex=c.find(i=>i.id===p.id)
      if(ex)return c.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i)
      return[...c,{...p,qty:1}]
    })
    toast.success(p.name+' adicionado!',{duration:1200,style:{background:'#161625',color:'#00ff41',border:'1px solid rgba(0,255,65,0.3)'}})
  }

  const updateQty=(id:string,delta:number)=>setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+delta)}:i).filter(i=>i.qty>0))

  const total=cart.reduce((s,i)=>s+i.price*i.qty,0)
  const itemCount=cart.reduce((s,i)=>s+i.qty,0)

  async function submitOrder(){
    if(!form.name.trim()||!form.phone.trim()||!form.address.trim()){toast.error('Preencha todos os campos');return}
    setSubmitting(true)
    try{
      const{data:order,error}=await supabase.from('orders').insert({
        customer_name:form.name,customer_phone:form.phone,
        type:'delivery',status:'pending',
        subtotal:total,discount:0,total,
        notes:form.address+(form.notes?' - '+form.notes:'')
      }).select().single()
      if(error)throw error
      await supabase.from('order_items').insert(cart.map(i=>({order_id:order.id,product_id:i.id,product_name:i.name,quantity:i.qty,unit_price:i.price,total_price:i.price*i.qty})))
      setCheckoutStep('success')
      setCart([])
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setSubmitting(false)}
  }

  return(
    <div style={{minHeight:'100vh',background:'#0a0f0a',fontFamily:'system-ui,sans-serif'}}>
      {/* Header */}
      <div style={{background:'#111811',borderBottom:'1px solid rgba(0,255,65,0.2)',position:'sticky',top:0,zIndex:30}}>
        <div style={{maxWidth:720,margin:'0 auto',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontSize:28}}>⚡</div>
          <div style={{flex:1}}>
            <p style={{fontFamily:'Bangers,cursive',fontSize:22,color:'#00ff41',letterSpacing:2,lineHeight:1}}>KURMO VAPE</p>
            <p style={{fontSize:11,color:'#64748b'}}>Cardapio Digital</p>
          </div>
          <button onClick={()=>{setCartOpen(true);setCheckoutStep('cart')}} style={{position:'relative',background:'rgba(0,255,65,0.1)',border:'1px solid rgba(0,255,65,0.3)',borderRadius:12,padding:'8px 14px',color:'#00ff41',cursor:'pointer',display:'flex',alignItems:'center',gap:8,fontSize:14}}>
            <ShoppingCart size={18}/>
            <span style={{fontWeight:700}}>{fmt(total)}</span>
            {itemCount>0&&<span style={{position:'absolute',top:-6,right:-6,background:'#00ff41',color:'#000',borderRadius:'50%',width:20,height:20,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{itemCount}</span>}
          </button>
        </div>
        {/* Search */}
        <div style={{maxWidth:720,margin:'0 auto',padding:'0 16px 10px'}}>
          <div style={{position:'relative'}}>
            <Search size={15} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#64748b'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar produto..." style={{width:'100%',paddingLeft:36,background:'#161625',border:'1px solid #1e2a1e',borderRadius:10,padding:'9px 12px 9px 36px',color:'#e2e8f0',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
          </div>
        </div>
      </div>

      {/* Category pills */}
      <div style={{maxWidth:720,margin:'0 auto'}}>
        <div style={{overflowX:'auto',display:'flex',gap:8,padding:'12px 16px',scrollbarWidth:'none'}}>
          <button onClick={()=>setActiveCat(null)} style={{flexShrink:0,padding:'6px 14px',borderRadius:20,border:!activeCat?'1px solid #00ff41':'1px solid #1e2a1e',background:!activeCat?'rgba(0,255,65,0.1)':'transparent',color:!activeCat?'#00ff41':'#64748b',cursor:'pointer',fontSize:13,whiteSpace:'nowrap'}}>Todos</button>
          {categories.map(c=><button key={c.id} onClick={()=>setActiveCat(c.id===activeCat?null:c.id)} style={{flexShrink:0,padding:'6px 14px',borderRadius:20,border:activeCat===c.id?'1px solid #00ff41':'1px solid #1e2a1e',background:activeCat===c.id?'rgba(0,255,65,0.1)':'transparent',color:activeCat===c.id?'#00ff41':'#64748b',cursor:'pointer',fontSize:13,whiteSpace:'nowrap'}}>{c.name}</button>)}
        </div>
      </div>

      {/* Products grid */}
      <div style={{maxWidth:720,margin:'0 auto',padding:'0 16px 100px'}}>
        {loading?(
          <div style={{textAlign:'center',padding:64,color:'#64748b'}}>
            <div style={{fontSize:40,marginBottom:8}}>⚡</div>
            <p>Carregando cardapio...</p>
          </div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}}>
            {filtered.map(p=>(
              <div key={p.id} style={{background:'#111811',border:'1px solid #1e2a1e',borderRadius:14,overflow:'hidden',transition:'transform 0.15s,border-color 0.15s'}} onClick={()=>addToCart(p)}>
                <div style={{position:'relative'}}>
                  {p.image_url?<img src={p.image_url} alt={p.name} style={{width:'100%',height:130,objectFit:'cover'}}/>:<div style={{width:'100%',height:130,background:'#161625',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40}}>📦</div>}
                  {cart.find(i=>i.id===p.id)&&(
                    <div style={{position:'absolute',top:8,right:8,background:'#00ff41',color:'#000',borderRadius:'50%',width:24,height:24,fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{cart.find(i=>i.id===p.id)?.qty}</div>
                  )}
                </div>
                <div style={{padding:'10px 12px'}}>
                  <p style={{fontSize:13,fontWeight:600,color:'#e2e8f0',marginBottom:3,lineHeight:1.3}}>{p.name}</p>
                  {p.description&&<p style={{fontSize:11,color:'#64748b',marginBottom:6,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.description}</p>}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <p style={{fontSize:15,fontWeight:700,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.price)}</p>
                    <div style={{width:28,height:28,borderRadius:8,background:'rgba(0,255,65,0.15)',border:'1px solid rgba(0,255,65,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Plus size={15} color="#00ff41"/>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:64,color:'#64748b'}}>Nenhum produto encontrado</div>}
          </div>
        )}
      </div>

      {/* Cart bottom sheet */}
      {cartOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:50}}>
          <div onClick={()=>setCartOpen(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}}/>
          <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#111811',borderRadius:'20px 20px 0 0',border:'1px solid rgba(0,255,65,0.2)',maxHeight:'85vh',overflow:'hidden',display:'flex',flexDirection:'column',maxWidth:720,margin:'0 auto'}}>
            {checkoutStep==='success'?(
              <div style={{padding:40,textAlign:'center'}}>
                <div style={{fontSize:56,marginBottom:12}}>✅</div>
                <p style={{fontFamily:'Bangers,cursive',fontSize:28,color:'#00ff41',letterSpacing:2,marginBottom:8}}>PEDIDO ENVIADO!</p>
                <p style={{color:'#64748b',fontSize:14,marginBottom:24}}>Seu pedido foi recebido e sera preparado em breve.</p>
                <button onClick={()=>{setCartOpen(false);setCheckoutStep('cart')}} style={{background:'rgba(0,255,65,0.1)',border:'1px solid rgba(0,255,65,0.3)',borderRadius:12,padding:'12px 24px',color:'#00ff41',cursor:'pointer',fontSize:15,fontFamily:'Bangers,cursive',letterSpacing:1}}>CONTINUAR COMPRANDO</button>
              </div>
            ):checkoutStep==='form'?(
              <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
                <div style={{padding:'16px 20px',borderBottom:'1px solid #1e2a1e',display:'flex',alignItems:'center',gap:12}}>
                  <button onClick={()=>setCheckoutStep('cart')} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:20,lineHeight:1}}>←</button>
                  <p style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#e2e8f0',letterSpacing:1}}>DADOS DA ENTREGA</p>
                </div>
                <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{padding:'12px 14px',background:'#0a0f0a',borderRadius:12,display:'flex',justifyContent:'space-between'}}>
                    <span style={{color:'#64748b',fontSize:13}}>Total do pedido</span>
                    <span style={{color:'#00ff41',fontWeight:700,fontFamily:'JetBrains Mono,monospace'}}>{fmt(total)}</span>
                  </div>
                  {[{key:'name',label:'Seu Nome',placeholder:'Como quer ser chamado?'},{key:'phone',label:'WhatsApp',placeholder:'(27) 99999-9999'},{key:'address',label:'Endereco de Entrega',placeholder:'Rua, numero, bairro...'}].map(f=>(
                    <div key={f.key}>
                      <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:5,letterSpacing:1}}>{f.label}</label>
                      <input value={(form as any)[f.key]} onChange={e=>setForm(v=>({...v,[f.key]:e.target.value}))} placeholder={f.placeholder} style={{width:'100%',background:'#161625',border:'1px solid #1e2a1e',borderRadius:10,padding:'11px 14px',color:'#e2e8f0',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
                    </div>
                  ))}
                  <div>
                    <label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:5,letterSpacing:1}}>OBSERVACOES (opcional)</label>
                    <textarea value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))} placeholder="Ex: sem molho, apartamento 302..." rows={3} style={{width:'100%',background:'#161625',border:'1px solid #1e2a1e',borderRadius:10,padding:'11px 14px',color:'#e2e8f0',fontSize:14,outline:'none',resize:'none',boxSizing:'border-box'}}/>
                  </div>
                </div>
                <div style={{padding:16,borderTop:'1px solid #1e2a1e'}}>
                  <button onClick={submitOrder} disabled={submitting} style={{width:'100%',padding:14,borderRadius:12,border:'none',background:'#00ff41',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:18,letterSpacing:1,opacity:submitting?0.7:1}}>
                    {submitting?'ENVIANDO...':'CONFIRMAR PEDIDO ✓'}
                  </button>
                </div>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
                <div style={{padding:'16px 20px',borderBottom:'1px solid #1e2a1e',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <p style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#e2e8f0',letterSpacing:1}}>CARRINHO ({itemCount})</p>
                  <button onClick={()=>setCartOpen(false)} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer'}}><X size={20}/></button>
                </div>
                <div style={{flex:1,overflowY:'auto',padding:'8px 16px'}}>
                  {cart.length===0?(
                    <div style={{textAlign:'center',padding:48,color:'#64748b'}}><ShoppingCart size={36} style={{marginBottom:8,opacity:0.4}}/><p>Carrinho vazio</p></div>
                  ):cart.map(item=>(
                    <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #1e2a1e'}}>
                      {item.image_url?<img src={item.image_url} style={{width:48,height:48,borderRadius:8,objectFit:'cover',flexShrink:0}}/>:<div style={{width:48,height:48,borderRadius:8,background:'#161625',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>📦</div>}
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:600,color:'#e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</p>
                        <p style={{fontSize:12,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price)}</p>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <button onClick={()=>updateQty(item.id,-1)} style={{width:26,height:26,borderRadius:7,border:'1px solid #1e2a1e',background:'transparent',color:'#64748b',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={12}/></button>
                        <span style={{fontSize:14,fontWeight:700,color:'#e2e8f0',minWidth:20,textAlign:'center'}}>{item.qty}</span>
                        <button onClick={()=>updateQty(item.id,1)} style={{width:26,height:26,borderRadius:7,border:'1px solid rgba(0,255,65,0.3)',background:'rgba(0,255,65,0.1)',color:'#00ff41',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={12}/></button>
                      </div>
                      <p style={{fontSize:13,fontWeight:700,color:'#e2e8f0',fontFamily:'JetBrains Mono,monospace',minWidth:65,textAlign:'right'}}>{fmt(item.price*item.qty)}</p>
                    </div>
                  ))}
                </div>
                {cart.length>0&&(
                  <div style={{padding:16,borderTop:'1px solid #1e2a1e'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
                      <span style={{fontSize:15,color:'#64748b'}}>Total</span>
                      <span style={{fontSize:20,fontWeight:700,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(total)}</span>
                    </div>
                    <button onClick={()=>setCheckoutStep('form')} style={{width:'100%',padding:14,borderRadius:12,border:'none',background:'#00ff41',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:18,letterSpacing:1,display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                      FAZER PEDIDO <ArrowRight size={20}/>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}