import{useState,useEffect}from 'react'
import{supabase}from '@/lib/supabase'
import{ShoppingCart,Plus,Minus,X,Search,ArrowRight,Loader2,MapPin,CheckCircle}from 'lucide-react'
import toast from 'react-hot-toast'

type Product={id:string;name:string;price:number;description?:string;image_url?:string;category_id:string|null;stock:number}
type Category={id:string;name:string;color:string}
type CartItem=Product&{qty:number}
type DeliveryZone={id:string;name:string;fee:number;min_time:number;max_time:number}
type DeliveryForm={nome:string;sobrenome:string;whatsapp:string;cep:string;numero:string;endereco:string;complemento:string;bairro:string;cidade:string;estado:string;referencia:string}
const EMPTY_FORM:DeliveryForm={nome:'',sobrenome:'',whatsapp:'',cep:'',numero:'',endereco:'',complemento:'',bairro:'',cidade:'',estado:'',referencia:''}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

const INPUT_STYLE={width:'100%',background:'#161625',border:'1px solid #1e2a1e',borderRadius:10,padding:'12px 14px',color:'#e2e8f0',fontSize:15,outline:'none',boxSizing:'border-box' as const,transition:'border-color 0.2s'}
const LABEL_STYLE={fontSize:12,color:'#64748b',display:'block' as const,marginBottom:5,fontWeight:600,letterSpacing:'0.05em'}

export default function PublicMenuPage(){
  const[products,setProducts]=useState<Product[]>([])
  const[categories,setCategories]=useState<Category[]>([])
  const[cart,setCart]=useState<CartItem[]>([])
  const[search,setSearch]=useState('')
  const[activeCat,setActiveCat]=useState<string|null>(null)
  const[loading,setLoading]=useState(true)
  const[cartOpen,setCartOpen]=useState(false)
  const[step,setStep]=useState<'cart'|'form'|'success'>('cart')
  const[form,setForm]=useState<DeliveryForm>(EMPTY_FORM)
  const[cepLoading,setCepLoading]=useState(false)
  const[submitting,setSubmitting]=useState(false)
  const[zones,setZones]=useState<DeliveryZone[]>([])
  const[matchedZone,setMatchedZone]=useState<DeliveryZone|null>(null)

  useEffect(()=>{loadData()},[]) 

  async function loadData(){
    setLoading(true)
    // Load delivery zones
    supabase.from('delivery_zones').select('*').eq('active',true).then(({data})=>setZones(data||[]))
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
    toast.success(p.name+' adicionado!',{duration:1000,style:{background:'#161625',color:'#00ff41',border:'1px solid rgba(0,255,65,0.3)'}})
  }

  const updateQty=(id:string,delta:number)=>setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+delta)}:i).filter(i=>i.qty>0))
  const total=cart.reduce((s,i)=>s+i.price*i.qty,0)
  const itemCount=cart.reduce((s,i)=>s+i.qty,0)
  const sf=(k:keyof DeliveryForm,v:string)=>setForm(f=>({...f,[k]:v}))

  async function handleCEP(cep:string){
    const clean=cep.replace(/\D/g,'')
    sf('cep',clean)
    if(clean.length!==8)return
    setCepLoading(true)
    try{
      const r=await fetch('https://viacep.com.br/ws/'+clean+'/json/')
      const d=await r.json()
      if(d.erro){toast.error('CEP nao encontrado');setCepLoading(false);return}
      const bairro=d.bairro||''
      setForm(f=>({...f,cep:clean,endereco:d.logradouro||'',bairro,cidade:d.localidade||'',estado:d.uf||''}))
      // Try to match zone by bairro name (case insensitive partial match)
      const matched=zones.find(z=>bairro.toLowerCase().includes(z.name.toLowerCase())||z.name.toLowerCase().includes(bairro.toLowerCase().split(' ')[0]))
      setMatchedZone(matched||null)
      if(matched) toast.success('Frete para '+matched.name+': '+fmt(matched.fee===0?0:matched.fee))
      else toast.success('Endereco encontrado!')
    }catch{toast.error('Erro ao buscar CEP')}
    finally{setCepLoading(false)}
  }

  async function submitOrder(){
    if(!form.nome.trim()||!form.sobrenome.trim()){toast.error('Informe seu nome completo');return}
    const wNum=form.whatsapp.replace(/\D/g,'')
    if(wNum.length<10){toast.error('WhatsApp invalido');return}
    if(!form.cep||form.cep.replace(/\D/g,'').length!==8){toast.error('CEP invalido');return}
    if(!form.numero.trim()){toast.error('Informe o numero');return}
    if(!form.endereco.trim()){toast.error('Informe o endereco');return}
    setSubmitting(true)
    try{
      const fullAddress=form.endereco+', '+form.numero+(form.complemento?' '+form.complemento:'')+' - '+form.bairro+' - '+form.cidade+'/'+form.estado+' - CEP: '+form.cep+(form.referencia?' | Ref: '+form.referencia:'')
      const{data:order,error}=await supabase.from('orders').insert({
        customer_name:form.nome+' '+form.sobrenome,
        customer_phone:form.whatsapp,
        type:'delivery',status:'pending',
        subtotal:total,discount:0,delivery_fee:matchedZone?.fee||0,total:total+(matchedZone?.fee||0),delivery_zone_id:matchedZone?.id||null,
        notes:fullAddress
      }).select().single()
      if(error)throw error
      await supabase.from('order_items').insert(cart.map(i=>({order_id:order.id,product_id:i.id,product_name:i.name,quantity:i.qty,unit_price:i.price,total_price:i.price*i.qty})))
      setStep('success')
      setCart([])
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setSubmitting(false)}
  }

  const fmtCEP=(v:string)=>v.replace(/\D/g,'').replace(/(\d{5})(\d{3})/,'$1-$2')
  const fmtWA=(v:string)=>{
    const n=v.replace(/\D/g,'').substring(0,11)
    if(n.length<=2)return n
    if(n.length<=7)return '('+n.slice(0,2)+') '+n.slice(2)
    return '('+n.slice(0,2)+') '+n.slice(2,7)+'-'+n.slice(7)
  }

  return(
    <div style={{minHeight:'100vh',background:'#0a0f0a',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#111811',borderBottom:'1px solid rgba(0,255,65,0.15)',position:'sticky',top:0,zIndex:30,boxShadow:'0 2px 20px rgba(0,0,0,0.5)'}}>
        <div style={{maxWidth:720,margin:'0 auto',padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:'rgba(0,255,65,0.1)',border:'1px solid rgba(0,255,65,0.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{fontSize:20,fontFamily:'Bangers,cursive',color:'#00ff41'}}>K</span>
          </div>
          <div style={{flex:1}}>
            <p style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#00ff41',letterSpacing:2,lineHeight:1}}>KURMO VAPE</p>
            <p style={{fontSize:11,color:'#64748b'}}>Cardapio Digital</p>
          </div>
          <button onClick={()=>{setCartOpen(true);setStep('cart')}} style={{position:'relative',background:'rgba(0,255,65,0.1)',border:'1px solid rgba(0,255,65,0.3)',borderRadius:12,padding:'9px 16px',color:'#00ff41',cursor:'pointer',display:'flex',alignItems:'center',gap:8,fontSize:14,fontWeight:600}}>
            <ShoppingCart size={17}/>
            <span>{fmt(total)}</span>
            {itemCount>0&&<span style={{position:'absolute',top:-7,right:-7,background:'#00ff41',color:'#000',borderRadius:'50%',width:20,height:20,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{itemCount}</span>}
          </button>
        </div>
        <div style={{maxWidth:720,margin:'0 auto',padding:'0 16px 12px'}}>
          <div style={{position:'relative'}}>
            <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#64748b'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar produto...' style={{...INPUT_STYLE,paddingLeft:38,fontSize:14}}/>
          </div>
        </div>
      </div>

      <div style={{maxWidth:720,margin:'0 auto'}}>
        <div style={{overflowX:'auto',display:'flex',gap:8,padding:'12px 16px',scrollbarWidth:'none' as const}}>
          <button onClick={()=>setActiveCat(null)} style={{flexShrink:0,padding:'7px 16px',borderRadius:20,border:!activeCat?'1px solid #00ff41':'1px solid #1e2a1e',background:!activeCat?'rgba(0,255,65,0.1)':'transparent',color:!activeCat?'#00ff41':'#64748b',cursor:'pointer',fontSize:13,whiteSpace:'nowrap' as const}}>Todos</button>
          {categories.map(c=>(
            <button key={c.id} onClick={()=>setActiveCat(c.id===activeCat?null:c.id)} style={{flexShrink:0,padding:'7px 16px',borderRadius:20,border:activeCat===c.id?'1px solid #00ff41':'1px solid #1e2a1e',background:activeCat===c.id?'rgba(0,255,65,0.1)':'transparent',color:activeCat===c.id?'#00ff41':'#64748b',cursor:'pointer',fontSize:13,whiteSpace:'nowrap' as const}}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:720,margin:'0 auto',padding:'0 16px 120px'}}>
        {loading?(
          <div style={{textAlign:'center',padding:64,color:'#64748b'}}>
            <Loader2 size={32} style={{marginBottom:8,opacity:0.5,animation:'spin 1s linear infinite'}}/>
            <p>Carregando...</p>
          </div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:12}}>
            {filtered.map(p=>(
              <div key={p.id} style={{background:'#111811',border:'1px solid #1e2a1e',borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'transform 0.15s,border-color 0.2s',position:'relative'}} onClick={()=>addToCart(p)}>
                <div style={{height:130,background:'#161625',overflow:'hidden',position:'relative'}}>
                  {p.image_url&&p.image_url.startsWith('http')
                    ?<img src={p.image_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                    :<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#64748b',opacity:0.5}}>Sem foto</div>
                  }
                  {cart.find(i=>i.id===p.id)&&(
                    <div style={{position:'absolute',top:8,right:8,background:'#00ff41',color:'#000',borderRadius:'50%',width:24,height:24,fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {cart.find(i=>i.id===p.id)?.qty}
                    </div>
                  )}
                </div>
                <div style={{padding:'10px 12px'}}>
                  <p style={{fontSize:13,fontWeight:600,color:'#e2e8f0',marginBottom:3,lineHeight:1.3}}>{p.name}</p>
                  {p.description&&<p style={{fontSize:11,color:'#64748b',marginBottom:5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as const}}>{p.description}</p>}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4}}>
                    <p style={{fontSize:15,fontWeight:700,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.price)}</p>
                    <div style={{width:26,height:26,borderRadius:8,background:'rgba(0,255,65,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Plus size={14} color='#00ff41'/>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:64,color:'#64748b'}}>Nenhum produto</div>}
          </div>
        )}
      </div>

      {cartOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:50}}>
          <div onClick={()=>setCartOpen(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(4px)'}}/>
          <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#111811',borderRadius:'20px 20px 0 0',border:'1px solid rgba(0,255,65,0.15)',maxHeight:'90vh',display:'flex',flexDirection:'column',maxWidth:720,margin:'0 auto',overflow:'hidden'}}>

            {step==='success'?(
              <div style={{padding:40,textAlign:'center',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
                <CheckCircle size={64} color='#00ff41'/>
                <p style={{fontFamily:'Bangers,cursive',fontSize:28,color:'#00ff41',letterSpacing:2}}>PEDIDO ENVIADO!</p>
                <p style={{color:'#64748b',fontSize:14,maxWidth:280,textAlign:'center'}}>Entraremos em contato pelo WhatsApp para confirmar a entrega.</p>
                <button onClick={()=>{setCartOpen(false);setStep('cart')}} style={{background:'rgba(0,255,65,0.1)',border:'1px solid rgba(0,255,65,0.3)',borderRadius:12,padding:'12px 28px',color:'#00ff41',cursor:'pointer',fontSize:15,fontFamily:'Bangers,cursive',letterSpacing:1,marginTop:8}}>
                  CONTINUAR COMPRANDO
                </button>
              </div>

            ):step==='form'?(
              <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
                <div style={{padding:'16px 20px',borderBottom:'1px solid #1e2a1e',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                  <button onClick={()=>setStep('cart')} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:22,lineHeight:1,padding:4}}>
                    <ArrowRight size={20} style={{transform:'rotate(180deg)'}}/>
                  </button>
                  <div>
                    <p style={{fontFamily:'Bangers,cursive',fontSize:18,color:'#e2e8f0',letterSpacing:1}}>DADOS DE ENTREGA</p>
                    <p style={{fontSize:12,color:'#64748b'}}>Total: <strong style={{color:'#00ff41'}}>{fmt(total)}</strong></p>
                  </div>
                </div>
                <div style={{flex:1,overflowY:'auto',padding:'20px 20px',display:'flex',flexDirection:'column',gap:14}}>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <label style={LABEL_STYLE}>NOME *</label>
                      <input value={form.nome} onChange={e=>sf('nome',e.target.value)} placeholder='Seu nome' style={INPUT_STYLE}/>
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>SOBRENOME *</label>
                      <input value={form.sobrenome} onChange={e=>sf('sobrenome',e.target.value)} placeholder='Sobrenome' style={INPUT_STYLE}/>
                    </div>
                  </div>

                  <div>
                    <label style={LABEL_STYLE}>WHATSAPP *</label>
                    <input value={form.whatsapp} onChange={e=>sf('whatsapp',fmtWA(e.target.value))} placeholder='(27) 99999-9999' style={INPUT_STYLE} type='tel' maxLength={15}/>
                  </div>

                  <div style={{borderTop:'1px solid #1e2a1e',paddingTop:14}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                      <MapPin size={14} color='#00ff41'/>
                      <p style={{fontSize:12,color:'#00ff41',fontWeight:600,letterSpacing:'0.05em'}}>ENDERECO DE ENTREGA</p>
                    </div>
                  </div>

                  <div>
                    <label style={LABEL_STYLE}>CEP *</label>
                    <div style={{position:'relative'}}>
                      <input value={fmtCEP(form.cep)} onChange={e=>handleCEP(e.target.value)} placeholder='00000-000' style={{...INPUT_STYLE,paddingRight:42}} type='tel' maxLength={9}/>
                      {cepLoading&&(
                        <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)'}}>
                          <Loader2 size={16} color='#00ff41' style={{animation:'spin 1s linear infinite'}}/>
                        </div>
                      )}
                      {!cepLoading&&form.endereco&&(
                        <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)'}}>
                          <CheckCircle size={16} color='#00ff41'/>
                        </div>
                      )}
                    </div>
                    <p style={{fontSize:11,color:'#64748b',marginTop:4}}>Digite o CEP para preencher o endereco automaticamente</p>
                    {matchedZone&&(<div style={{marginTop:8,padding:'10px 14px',background:'rgba(0,255,65,0.06)',border:'1px solid rgba(0,255,65,0.2)',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><p style={{fontSize:13,color:'#e2e8f0',fontWeight:600}}>{matchedZone.name}</p><p style={{fontSize:11,color:'#64748b'}}>{matchedZone.min_time}–{matchedZone.max_time} min</p></div><p style={{fontSize:18,fontWeight:700,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{matchedZone.fee===0?'Gratis':fmt(matchedZone.fee)}</p></div>)}
                    {form.bairro&&!matchedZone&&form.endereco&&(<div style={{marginTop:8,padding:'9px 14px',background:'rgba(255,170,0,0.06)',border:'1px solid rgba(255,170,0,0.2)',borderRadius:10}}><p style={{fontSize:12,color:'#ffaa00'}}>Bairro nao configurado. Entre em contato para confirmar o frete.</p></div>)}
                  </div>

                  {form.endereco&&(
                    <>
                      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12}}>
                        <div>
                          <label style={LABEL_STYLE}>ENDERECO</label>
                          <input value={form.endereco} onChange={e=>sf('endereco',e.target.value)} style={INPUT_STYLE}/>
                        </div>
                        <div style={{width:100}}>
                          <label style={LABEL_STYLE}>NUMERO *</label>
                          <input value={form.numero} onChange={e=>sf('numero',e.target.value)} placeholder='Ex: 123' style={INPUT_STYLE} autoFocus/>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                        <div>
                          <label style={LABEL_STYLE}>BAIRRO</label>
                          <input value={form.bairro} onChange={e=>sf('bairro',e.target.value)} style={INPUT_STYLE}/>
                        </div>
                        <div>
                          <label style={LABEL_STYLE}>CIDADE / ESTADO</label>
                          <input value={form.cidade+(form.estado?' / '+form.estado:'')} readOnly style={{...INPUT_STYLE,color:'#64748b',cursor:'default'}}/>
                        </div>
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>COMPLEMENTO (opcional)</label>
                        <input value={form.complemento} onChange={e=>sf('complemento',e.target.value)} placeholder='Apto 302, Bloco B...' style={INPUT_STYLE}/>
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>PONTO DE REFERENCIA</label>
                        <input value={form.referencia} onChange={e=>sf('referencia',e.target.value)} placeholder='Ex: Proximo ao mercado...' style={INPUT_STYLE}/>
                      </div>
                    </>
                  )}

                  {!form.endereco&&form.cep.length===8&&!cepLoading&&(
                    <>
                      <div>
                        <label style={LABEL_STYLE}>ENDERECO *</label>
                        <input value={form.endereco} onChange={e=>sf('endereco',e.target.value)} placeholder='Rua, Avenida...' style={INPUT_STYLE}/>
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>NUMERO *</label>
                        <input value={form.numero} onChange={e=>sf('numero',e.target.value)} placeholder='Ex: 123' style={INPUT_STYLE}/>
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>PONTO DE REFERENCIA</label>
                        <input value={form.referencia} onChange={e=>sf('referencia',e.target.value)} placeholder='Proximo a...' style={INPUT_STYLE}/>
                      </div>
                    </>
                  )}

                </div>
                <div style={{padding:'16px 20px',borderTop:'1px solid #1e2a1e',flexShrink:0}}>
                  <button onClick={submitOrder} disabled={submitting} style={{width:'100%',padding:15,borderRadius:12,border:'none',background:submitting?'#2a3a2a':'#00ff41',color:'#000',cursor:submitting?'wait':'pointer',fontFamily:'Bangers,cursive',fontSize:19,letterSpacing:1,transition:'background 0.2s'}}>
                    {submitting?'ENVIANDO...':'CONFIRMAR PEDIDO'}
                  </button>
                </div>
              </div>

            ):(
              <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
                <div style={{padding:'16px 20px',borderBottom:'1px solid #1e2a1e',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
                  <p style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#e2e8f0',letterSpacing:1}}>CARRINHO {itemCount>0?'('+itemCount+')':''}</p>
                  <button onClick={()=>setCartOpen(false)} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',padding:4}}><X size={20}/></button>
                </div>
                <div style={{flex:1,overflowY:'auto',padding:'8px 16px'}}>
                  {cart.length===0?(
                    <div style={{textAlign:'center',padding:48,color:'#64748b'}}>
                      <ShoppingCart size={36} style={{marginBottom:8,opacity:0.3}}/>
                      <p>Carrinho vazio</p>
                    </div>
                  ):cart.map(item=>(
                    <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #1e2a1e'}}>
                      <div style={{width:50,height:50,borderRadius:8,overflow:'hidden',background:'#161625',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {item.image_url&&item.image_url.startsWith('http')
                          ?<img src={item.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          :<span style={{fontSize:11,color:'#64748b'}}>sem foto</span>
                        }
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:600,color:'#e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{item.name}</p>
                        <p style={{fontSize:12,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price)}</p>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <button onClick={()=>updateQty(item.id,-1)} style={{width:28,height:28,borderRadius:7,border:'1px solid #1e2a1e',background:'transparent',color:'#64748b',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={12}/></button>
                        <span style={{fontSize:14,fontWeight:700,color:'#e2e8f0',minWidth:22,textAlign:'center'}}>{item.qty}</span>
                        <button onClick={()=>updateQty(item.id,1)} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(0,255,65,0.3)',background:'rgba(0,255,65,0.1)',color:'#00ff41',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={12}/></button>
                      </div>
                      <p style={{fontSize:13,fontWeight:700,color:'#e2e8f0',fontFamily:'JetBrains Mono,monospace',minWidth:70,textAlign:'right'}}>{fmt(item.price*item.qty)}</p>
                    </div>
                  ))}
                </div>
                {cart.length>0&&(
                  <div style={{padding:'16px 20px',borderTop:'1px solid #1e2a1e',flexShrink:0}}>
                    {matchedZone&&matchedZone.fee>0&&(<div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:'#64748b'}}>Subtotal</span><span style={{fontSize:13,color:'#e2e8f0',fontFamily:'JetBrains Mono,monospace'}}>{fmt(total)}</span></div>)}
                    {matchedZone&&matchedZone.fee>0&&(<div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,color:'#64748b'}}>Taxa de entrega ({matchedZone.name})</span><span style={{fontSize:13,color:'#f59e0b',fontFamily:'JetBrains Mono,monospace'}}>{fmt(matchedZone.fee)}</span></div>)}
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
                      <span style={{fontSize:16,color:'#64748b'}}>Total do pedido</span>
                      <span style={{fontSize:22,fontWeight:700,color:'#00ff41',fontFamily:'JetBrains Mono,monospace'}}>{fmt(total+(matchedZone?.fee||0))}</span>
                    </div>
                    <button onClick={()=>setStep('form')} style={{width:'100%',padding:15,borderRadius:12,border:'none',background:'#00ff41',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:19,letterSpacing:1,display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                      CONTINUAR <ArrowRight size={20}/>
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