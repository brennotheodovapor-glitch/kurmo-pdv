import{useState,useEffect}from 'react'
import{ShoppingCart,Search,X,Plus,Minus,Layers,Check,ChevronLeft,MapPin,AlertCircle}from 'lucide-react'
import{supabase}from '@/lib/supabase'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
const S:React.CSSProperties={width:'100%',background:'#1c1c1c',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'12px 14px',fontSize:15,outline:'none',boxSizing:'border-box'}

type Cat={id:string;name:string;color:string}
type Variant={id:string;name:string;stock:number;price_modifier:number}
type Prod={id:string;name:string;description:string;price:number;promo_price:number|null;is_promo:boolean;stock:number;image_url:string;category_id:string;has_sizes:boolean}
type CartItem={uid:string;product_id:string;variant_id?:string;name:string;variant_name?:string;price:number;qty:number;maxStock:number}
type Zone={id:string;name:string;fee:number}
type Screen='menu'|'cart'|'checkout'

export default function PublicMenuPage(){
  const[cats,setCats]=useState<Cat[]>([])
  const[prods,setProds]=useState<Prod[]>([])
  const[vm,setVm]=useState<Record<string,Variant[]>>({})
  const[zones,setZones]=useState<Zone[]>([])
  const[settings,setSettings]=useState<any>({store_name:'UZT 021',store_logo_url:'',store_banner_url:'',promo_title:'',promo_description:'',min_order:0})
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[catF,setCatF]=useState('')
  const[cart,setCart]=useState<CartItem[]>([])
  const[screen,setScreen]=useState<Screen>('menu')
  const[varModal,setVarModal]=useState<Prod|null>(null)
  const[selVar,setSelVar]=useState('')
  const[varQty,setVarQty]=useState(1)
  const[done,setDone]=useState<any>(null)
  // checkout
  const[cName,setCName]=useState('')
  const[cPhone,setCPhone]=useState('')
  const[cep,setCep]=useState('')
  const[cepLoading,setCepLoading]=useState(false)
  const[cepStatus,setCepStatus]=useState<'idle'|'ok'|'err'>('idle')
  const[street,setStreet]=useState('')
  const[num,setNum]=useState('')
  const[complement,setComplement]=useState('')
  const[matchedZones,setMatchedZones]=useState<Zone[]>([])
  const[zone,setZone]=useState<Zone|null>(null)
  const[notes,setNotes]=useState('')
  const[pay,setPay]=useState('pix')
  const[change,setChange]=useState('')
  const[submitting,setSubmitting]=useState(false)

  useEffect(()=>{load()},[])

  async function load(){
    setLoading(true)
    const[p,c,s,v,z]=await Promise.all([
      supabase.from('products').select('*').eq('active',true),
      supabase.from('categories').select('*').eq('active',true).order('sort_order').order('name'),
      supabase.from('store_settings').select('*').limit(1).maybeSingle(),
      supabase.from('product_variants').select('*').eq('active',true).order('created_at',{ascending:false}),
      supabase.from('delivery_zones').select('id,name,fee').eq('active',true).order('name')
    ])
    setCats(c.data||[])
    if(s.data)setSettings(s.data)
    setZones(z.data||[])
    const map:Record<string,Variant[]>={}
    const seen:Record<string,Set<string>>={}
    ;(v.data||[]).forEach((vr:any)=>{
      if(!map[vr.product_id]){map[vr.product_id]=[];seen[vr.product_id]=new Set()}
      if(!seen[vr.product_id].has(vr.name)){map[vr.product_id].push(vr);seen[vr.product_id].add(vr.name)}
    })
    setVm(map)
    const enriched=(p.data||[]).map((pr:any)=>{
      if(pr.has_sizes){const pv=map[pr.id]||[];return{...pr,stock:pv.reduce((s:number,v:any)=>s+(v.stock||0),0)}}
      return pr
    })
    setProds(enriched)
    setLoading(false)
  }

  async function handleCep(val:string){
    const digits=val.replace(/\D/g,'').substring(0,8)
    const masked=digits.length>5?digits.substring(0,5)+'-'+digits.substring(5):digits
    setCep(masked)
    setZone(null)
    setMatchedZones([])
    setCepStatus('idle')
    if(digits.length!==8)return
    setCepLoading(true)
    try{
      // 1. Busca endereço no ViaCEP
      const r=await fetch('https://viacep.com.br/ws/'+digits+'/json/')
      const d=await r.json()
      if(d.erro){setCepStatus('err');setCepLoading(false);return}
      setStreet(d.logradouro||'')
      // 2. Pega o bairro EXATO que o ViaCEP retornou
      const bairroExato=(d.bairro||'').trim()
      if(!bairroExato){
        // CEP sem bairro (faixa geral) -> mostra todos para cliente escolher
        const allZ:Zone[]=zones.length>0?zones:(await supabase.from('delivery_zones').select('id,name,fee').eq('active',true).order('name').then(r2=>r2.data||[]))
        if(zones.length===0)setZones(allZ)
        setMatchedZones(allZ)
        setCepStatus('ok')
        setCepLoading(false)
        return
      }
      // 3. Busca esse bairro exato na tabela delivery_zones
      const bairroLower=bairroExato.toLowerCase()
      const{data:zData}=await supabase
        .from('delivery_zones')
        .select('id,name,fee')
        .eq('active',true)
        .ilike('name',bairroExato)
        .limit(1)
      if(zData&&zData.length>0){
        // Achou exato -> seleciona direto, sem nem mostrar lista
        setMatchedZones(zData)
        setZone(zData[0])
        setCepStatus('ok')
        setCepLoading(false)
        return
      }
      // 4. Não achou nome exato -> tenta busca parcial (bairro contém o nome ou vice-versa)
      const allZ:Zone[]=zones.length>0?zones:(await supabase.from('delivery_zones').select('id,name,fee').eq('active',true).order('name').then(r2=>r2.data||[]))
      if(zones.length===0)setZones(allZ)
      const partial=allZ.filter((z:Zone)=>{
        const zn=z.name.toLowerCase()
        return bairroLower===zn||bairroLower.includes(zn)||zn.includes(bairroLower)
      })
      if(partial.length>0){
        setMatchedZones(partial)
        if(partial.length===1)setZone(partial[0])
      }else{
        // Não entregamos nessa área
        setMatchedZones([])
        setZone(null)
      }
      setCepStatus('ok')
    }catch{setCepStatus('err')}
    setCepLoading(false)
  }

  const fee=zone?.fee||0
  const subtotal=cart.reduce((s,i)=>s+i.price*i.qty,0)
  const total=subtotal+fee
  const cartCount=cart.reduce((s,i)=>s+i.qty,0)

  function cartQty(pid:string,vid?:string){
    return cart.find(i=>i.uid===pid+(vid?'__'+vid:''))?.qty||0
  }

  function addItem(p:Prod,v?:Variant,qty=1){
    const price=(p.is_promo&&p.promo_price?Number(p.promo_price):Number(p.price))+(Number(v?.price_modifier)||0)
    const max=v?v.stock:p.stock
    const uid=p.id+(v?'__'+v.id:'')
    setCart(prev=>{
      const ex=prev.find(i=>i.uid===uid)
      if(ex){if(ex.qty+qty>max)return prev;return prev.map(i=>i.uid===uid?{...i,qty:i.qty+qty}:i)}
      return[...prev,{uid,product_id:p.id,variant_id:v?.id,name:p.name,variant_name:v?.name,price,qty,maxStock:max}]
    })
  }

  function chgQty(uid:string,d:number){
    setCart(prev=>prev.map(i=>{
      if(i.uid!==uid)return i
      const nq=i.qty+d
      if(nq<=0)return null as any
      if(nq>i.maxStock)return i
      return{...i,qty:nq}
    }).filter(Boolean))
  }

  function clickProd(p:Prod){
    const vars=vm[p.id]||[]
    if(p.has_sizes&&vars.filter(v=>v.stock>0).length>0){setVarModal(p);setSelVar('');setVarQty(1)}
    else if(!p.has_sizes&&p.stock>0){addItem(p)}
  }

  function confirmVar(){
    if(!varModal||!selVar)return
    const v=(vm[varModal.id]||[]).find(x=>x.id===selVar)
    if(v)addItem(varModal,v,varQty)
    setVarModal(null)
  }

  async function submit(){
    if(!cName.trim()){alert('Informe seu nome completo');return}
    const _ph=cPhone.replace(/\D/g,'')
    if(!_ph||_ph.length<10){alert('Informe um WhatsApp válido com DDD (mínimo 10 dígitos)');return}
    if(!cep||cepStatus!=='ok'){alert('Informe um CEP válido');return}
    if(!zone){alert('Selecione seu bairro');return}
    setSubmitting(true)
    try{
      const ph=cPhone.replace(/\D/g,'')
      let cid:string|null=null
      const{data:ec}=await supabase.from('customers').select('id').eq('phone',ph).maybeSingle()
      if(ec){cid=ec.id}else{
        const{data:nc}=await supabase.from('customers').insert({name:cName,phone:ph,address:street+(num?' nº'+num:''),neighborhood:zone.name}).select().single()
        if(nc)cid=nc.id
      }
      const addr=[street,num?'nº'+num:'',complement,zone.name].filter(Boolean).join(', ')
      const{data:order,error}=await supabase.from('orders').insert({
        customer_name:cName,customer_phone:ph,customer_id:cid,
        type:'delivery',status:'pending',
        subtotal,delivery_fee:fee,total,payment_method:pay,
        cash_requested:pay==='dinheiro'&&change?parseFloat(change):null,
        notes:addr+(notes?' | '+notes:''),delivery_zone_id:zone.id
      }).select().single()
      if(error||!order)throw error||new Error('Erro')
      await supabase.from('order_items').insert(cart.map(i=>({
        order_id:order.id,product_id:i.product_id,
        product_name:i.name+(i.variant_name?' — '+i.variant_name:''),
        quantity:i.qty,unit_price:i.price,total_price:i.price*i.qty,variant_id:i.variant_id||null
      })))
      await supabase.from('order_payments').insert({order_id:order.id,method:pay,amount:total})
      for(const item of cart){
        if(item.variant_id){
          const{data:vr}=await supabase.from('product_variants').select('stock').eq('id',item.variant_id).single()
          if(vr)await supabase.from('product_variants').update({stock:Math.max(0,vr.stock-item.qty)}).eq('id',item.variant_id)
        }else{
          const{data:pr}=await supabase.from('products').select('stock').eq('id',item.product_id).single()
          if(pr)await supabase.from('products').update({stock:Math.max(0,pr.stock-item.qty)}).eq('id',item.product_id)
        }
      }
      setDone({...order,_items:cart.map(i=>({...i,qty:i.qty}))});setCart([]);setScreen('menu')
      setCName('');setCPhone('');setCep('');setStreet('');setNum('');setComplement('')
      setZone(null);setMatchedZones([]);setNotes('');setChange('');setCepStatus('idle')
    }catch(e:any){alert('Erro: '+e.message)}
    finally{setSubmitting(false)}
  }

  const catsWithProds=cats.filter(c=>prods.some(p=>p.category_id===c.id&&(!search||p.name.toLowerCase().includes(search.toLowerCase()))&&(!catF||p.category_id===catF)))
  const visProds=(cid:string)=>prods.filter(p=>p.category_id===cid&&(!search||p.name.toLowerCase().includes(search.toLowerCase())))

  if(done)return(
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{textAlign:'center',maxWidth:340}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(0,255,65,0.1)',border:'2px solid #00ff41',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><Check size={32} color='#00ff41'/></div>
        <h2 style={{fontFamily:'Bangers,cursive',fontSize:28,color:'#00ff41',letterSpacing:2,marginBottom:6}}>PEDIDO ENVIADO!</h2>
        <p style={{fontSize:14,color:'#aaa',marginBottom:4}}>Pedido #{done.order_number||'#'+done.id?.substring(0,6)}</p>
        <div style={{background:'#161616',borderRadius:10,padding:'10px 14px',marginBottom:12,textAlign:'left' as const,maxWidth:300,width:'100%'}}>
          {(done._items||[]).map((it:any,i:number)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:12,color:'#ccc'}}>{it.qty||it.quantity}x {it.name}{it.variant_name?' ('+it.variant_name+')':''}</span>
              <span style={{fontSize:12,color:'#00ff41',fontFamily:'monospace'}}>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(it.price*it.qty||it.total_price)}</span>
            </div>
          ))}
        </div>
        <p style={{fontSize:12,color:'#666',marginBottom:20}}>Aguarde a confirmação pelo WhatsApp 📱</p>
        <button onClick={()=>setDone(null)} style={{padding:'12px 28px',borderRadius:10,background:'#00ff41',color:'#000',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1}}>FAZER NOVO PEDIDO</button>
      </div>
    </div>
  )
  return(
    <div style={{minHeight:'100vh',background:'#0a0a0a',fontFamily:'Inter,sans-serif'}}>

      {/* HEADER */}
      <div style={{background:'#111',borderBottom:'1px solid #1e1e1e',padding:'10px 14px',position:'sticky',top:0,zIndex:40}}>
        <div style={{maxWidth:600,margin:'0 auto',display:'flex',alignItems:'center',gap:10}}>
          {screen!=='menu'&&<button onClick={()=>setScreen(screen==='checkout'?'cart':'menu')} style={{background:'none',border:'none',cursor:'pointer',color:'#888',padding:'2px 8px 2px 0',display:'flex',alignItems:'center',gap:3,fontSize:13,flexShrink:0}}><ChevronLeft size={16}/>Voltar</button>}
          {screen==='menu'&&settings.store_logo_url&&<img src={settings.store_logo_url} alt='' style={{width:34,height:34,borderRadius:8,objectFit:'cover',flexShrink:0}}/>}
          <h1 style={{fontFamily:'Bangers,cursive',fontSize:screen==='menu'?20:16,color:'#00ff41',letterSpacing:2,flex:1,lineHeight:1,margin:0}}>
            {screen==='menu'?settings.store_name:screen==='cart'?'SEU PEDIDO':'FINALIZAR PEDIDO'}
          </h1>
          {screen==='menu'&&cartCount>0&&(
            <button onClick={()=>setScreen('cart')} style={{background:'#00ff41',border:'none',borderRadius:10,padding:'8px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontFamily:'Bangers,cursive',fontSize:13,color:'#000',flexShrink:0,whiteSpace:'nowrap'}}>
              <ShoppingCart size={14}/>{cartCount} · {fmt(total)}
            </button>
          )}
        </div>
      </div>

      {/* ═══ MENU ═══ */}
      {screen==='menu'&&(
        <div style={{maxWidth:600,margin:'0 auto',padding:'0 12px',paddingBottom:cartCount>0?90:20}}>
          {settings.store_banner_url&&<img src={settings.store_banner_url} alt='' style={{width:'100%',borderRadius:12,marginTop:10,objectFit:'cover',maxHeight:160}}/>}
          {settings.promo_title&&<div style={{margin:'8px 0',padding:'10px 12px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:10}}><p style={{fontSize:13,fontWeight:700,color:'#f59e0b',margin:0}}>{settings.promo_title}</p>{settings.promo_description&&<p style={{fontSize:11,color:'#888',margin:'2px 0 0'}}>{settings.promo_description}</p>}</div>}
          <div style={{position:'relative',margin:'8px 0'}}>
            <Search size={13} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#555'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar produto...' style={{width:'100%',background:'#1a1a1a',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'9px 12px 9px 32px',fontSize:14,outline:'none',boxSizing:'border-box' as const}}/>
          </div>
          <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4,marginBottom:8}}>
            <button onClick={()=>setCatF('')} style={{padding:'4px 12px',borderRadius:16,border:!catF?'1px solid #00ff41':'1px solid #2a2a2a',background:!catF?'rgba(0,255,65,0.1)':'transparent',color:!catF?'#00ff41':'#666',cursor:'pointer',fontSize:11,fontWeight:600,whiteSpace:'nowrap',flexShrink:0}}>Todos</button>
            {cats.filter(c=>prods.some(p=>p.category_id===c.id)).map(c=>(
              <button key={c.id} onClick={()=>setCatF(catF===c.id?'':c.id)} style={{padding:'4px 12px',borderRadius:16,border:catF===c.id?'1px solid '+(c.color||'#00ff41'):'1px solid #2a2a2a',background:catF===c.id?(c.color||'#00ff41')+'20':'transparent',color:catF===c.id?(c.color||'#00ff41'):'#666',cursor:'pointer',fontSize:11,fontWeight:600,whiteSpace:'nowrap',flexShrink:0}}>{c.name}</button>
            ))}
          </div>
          {loading?<p style={{textAlign:'center',padding:40,color:'#555'}}>Carregando cardápio...</p>:
          catsWithProds.map(cat=>{
            const ps=visProds(cat.id)
            if(!ps.length)return null
            return(
              <div key={cat.id} style={{marginBottom:20}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><div style={{width:4,height:18,borderRadius:2,background:cat.color||'#00ff41',flexShrink:0}}/><h2 style={{fontFamily:'Bangers,cursive',fontSize:18,color:'#fff',letterSpacing:1,margin:0}}>{cat.name}</h2></div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
                  {ps.map((p:Prod)=>{
                    const vars=vm[p.id]||[]
                    const price=p.is_promo&&p.promo_price?p.promo_price:p.price
                    const inStock=p.stock>0
                    const cq=p.has_sizes?cart.filter(i=>i.product_id===p.id).reduce((s,i)=>s+i.qty,0):cartQty(p.id)
                    return(
                      <div key={p.id} style={{background:'#161616',borderRadius:12,overflow:'hidden',opacity:inStock?1:0.5,border:'1px solid '+(cq>0?'#00ff41':'#1e1e1e'),transition:'border-color 0.2s'}}>
                        <div onClick={()=>{if(inStock)clickProd(p)}} style={{cursor:inStock?'pointer':'default'}}>
                          {p.image_url?<img src={p.image_url} alt='' style={{width:'100%',height:96,objectFit:'cover',display:'block'}}/>
                            :<div style={{height:96,background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:28}}>📦</span></div>}
                        </div>
                        <div style={{padding:'8px 10px'}}>
                          <p style={{fontSize:12,fontWeight:600,color:'#e5e5e5',marginBottom:3,lineHeight:1.3,margin:'0 0 3px'}}>{p.name}</p>
                          {p.has_sizes&&vars.length>0&&<p style={{fontSize:10,color:'#7c3aed',marginBottom:3,display:'flex',alignItems:'center',gap:3,margin:'0 0 3px'}}><Layers size={9}/>{vars.filter(v=>v.stock>0).length} sabores</p>}
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4}}>
                            <div>
                              {p.is_promo&&<p style={{fontSize:9,color:'#666',textDecoration:'line-through',margin:0}}>{fmt(Number(p.price))}</p>}
                              <p style={{fontSize:14,fontWeight:700,color:p.is_promo?'#f59e0b':'#00ff41',margin:0,fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(price))}</p>
                            </div>
                            {!inStock?<span style={{fontSize:9,color:'#ff5555',fontWeight:700}}>ESGOTADO</span>:
                            p.has_sizes?(
                              <button onClick={()=>clickProd(p)} style={{padding:'5px 10px',borderRadius:8,background:cat.color||'#00ff41',color:'#000',border:'none',cursor:'pointer',fontSize:11,fontWeight:700}}>VER</button>
                            ):(cq>0?(
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <button onClick={e=>{e.stopPropagation();chgQty(p.id,-1)}} style={{width:26,height:26,borderRadius:6,border:'1px solid #333',background:'#222',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={11}/></button>
                                <span style={{fontSize:13,fontWeight:700,color:'#00ff41',minWidth:14,textAlign:'center' as const}}>{cq}</span>
                                <button onClick={e=>{e.stopPropagation();if(cq<p.stock)addItem(p)}} style={{width:26,height:26,borderRadius:6,border:'1px solid #333',background:cq>=p.stock?'#111':'#222',color:cq>=p.stock?'#333':'#fff',cursor:cq>=p.stock?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={11}/></button>
                              </div>
                            ):(
                              <button onClick={e=>{e.stopPropagation();clickProd(p)}} style={{width:28,height:28,borderRadius:8,background:cat.color||'#00ff41',display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer'}}><Plus size={14} color='#000'/></button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {cartCount>0&&(
            <div style={{position:'fixed',bottom:0,left:0,right:0,padding:'10px 14px',background:'rgba(10,10,10,0.97)',borderTop:'1px solid #1e1e1e',zIndex:30}}>
              <div style={{maxWidth:600,margin:'0 auto'}}>
                <button onClick={()=>setScreen('cart')} style={{width:'100%',padding:'14px',borderRadius:12,background:'#00ff41',color:'#000',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:17,letterSpacing:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <ShoppingCart size={18}/>{cartCount} {cartCount===1?'item':'itens'} — VER CARRINHO — {fmt(subtotal)}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* ═══ CARRINHO ═══ */}
      {screen==='cart'&&(
        <div style={{maxWidth:600,margin:'0 auto',padding:'12px 14px',paddingBottom:100}}>
          {cart.length===0?(
            <div style={{textAlign:'center',padding:48,color:'#555'}}><ShoppingCart size={32} style={{opacity:0.2,marginBottom:8}}/><p style={{margin:0}}>Carrinho vazio</p></div>
          ):(
            <>
              {cart.map(item=>(
                <div key={item.uid} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 0',borderBottom:'1px solid #1e1e1e'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,color:'#e5e5e5',fontWeight:600,margin:0}}>{item.name}</p>
                    {item.variant_name&&<p style={{fontSize:11,color:'#888',margin:'2px 0 0'}}>Sabor: {item.variant_name}</p>}
                    <p style={{fontSize:13,color:'#00ff41',fontWeight:700,margin:'3px 0 0',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price*item.qty)}</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                    <button onClick={()=>chgQty(item.uid,-1)} style={{width:28,height:28,borderRadius:8,border:'1px solid #333',background:'#1a1a1a',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={12}/></button>
                    <span style={{fontSize:15,fontWeight:700,color:'#fff',minWidth:20,textAlign:'center' as const}}>{item.qty}</span>
                    <button onClick={()=>chgQty(item.uid,1)} disabled={item.qty>=item.maxStock} style={{width:28,height:28,borderRadius:8,border:'1px solid #333',background:item.qty>=item.maxStock?'#111':'#1a1a1a',color:item.qty>=item.maxStock?'#444':'#fff',cursor:item.qty>=item.maxStock?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={12}/></button>
                    <button onClick={()=>setCart(c=>c.filter(i=>i.uid!==item.uid))} style={{width:28,height:28,borderRadius:8,border:'none',background:'rgba(255,51,51,0.1)',color:'#ff5555',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={12}/></button>
                  </div>
                </div>
              ))}
              <div style={{marginTop:12,padding:'10px 0',borderTop:'1px solid #2a2a2a'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:13,color:'#888'}}>Subtotal</span>
                  <span style={{fontSize:13,color:'#aaa',fontFamily:'JetBrains Mono,monospace'}}>{fmt(subtotal)}</span>
                </div>
                <p style={{fontSize:11,color:'#555',margin:'4px 0 0'}}>Frete calculado no próximo passo</p>
              </div>
              <div style={{position:'fixed',bottom:0,left:0,right:0,padding:'10px 14px',background:'rgba(10,10,10,0.97)',borderTop:'1px solid #1e1e1e',zIndex:30}}>
                <div style={{maxWidth:600,margin:'0 auto'}}>
                  <button onClick={()=>setScreen('checkout')} style={{width:'100%',padding:'14px',borderRadius:12,background:'#00ff41',color:'#000',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:17,letterSpacing:1}}>
                    FINALIZAR PEDIDO →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ CHECKOUT ═══ */}
      {screen==='checkout'&&(
        <div style={{maxWidth:600,margin:'0 auto',padding:'16px 14px 80px'}}>

          {/* DADOS PESSOAIS */}
          <p style={{fontSize:11,color:'#888',fontWeight:700,letterSpacing:0.8,margin:'0 0 10px'}}>SEUS DADOS</p>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
            <input value={cName} onChange={e=>setCName(e.target.value)} placeholder='Nome completo *' style={S}/>
            <input value={cPhone} onChange={e=>setCPhone(e.target.value)} placeholder='WhatsApp com DDD * Ex: (27) 99999-9999' inputMode='numeric' style={S}/>
          </div>

          {/* ENDEREÇO */}
          <p style={{fontSize:11,color:'#888',fontWeight:700,letterSpacing:0.8,margin:'0 0 10px'}}>ENDEREÇO DE ENTREGA</p>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
            {/* CEP */}
            <div style={{position:'relative'}}>
              <input
                value={cep}
                onChange={e=>handleCep(e.target.value)}
                placeholder='CEP * (preenchimento automático)'
                inputMode='numeric'
                maxLength={9}
                style={{...S,paddingRight:44,borderColor:cepStatus==='ok'?'#00ff41':cepStatus==='err'?'#ff5555':'#2a2a2a'}}
              />
              <div style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',fontSize:16,pointerEvents:'none'}}>
                {cepLoading?<span style={{color:'#f59e0b',fontSize:13}}>⏳</span>
                :cepStatus==='ok'?<span style={{color:'#00ff41'}}>✓</span>
                :cepStatus==='err'?<span style={{color:'#ff5555'}}>✕</span>
                :<MapPin size={16} color='#555'/>}
              </div>
            </div>
            {cepStatus==='err'&&<p style={{fontSize:12,color:'#ff5555',margin:'-4px 0 0',display:'flex',alignItems:'center',gap:4}}><AlertCircle size={12}/>CEP não encontrado. Verifique e tente novamente.</p>}
            {/* Rua aparece automaticamente após CEP válido */}
            {cepStatus==='ok'&&street&&(
              <>
                <input value={street} onChange={e=>setStreet(e.target.value)} placeholder='Rua / Avenida' style={S}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <input value={num} onChange={e=>setNum(e.target.value)} placeholder='Número *' style={S}/>
                  <input value={complement} onChange={e=>setComplement(e.target.value)} placeholder='Complemento' style={S}/>
                </div>
              </>
            )}
          </div>

          {/* BAIRRO E FRETE — aparece só após CEP válido */}
          {cepStatus==='ok'&&(
            <div style={{marginBottom:24}}>
              <p style={{fontSize:11,color:'#888',fontWeight:700,letterSpacing:0.8,margin:'0 0 6px'}}>
                {zone&&matchedZones.length===1?'ENTREGA — '+zone.name:'BAIRRO / FRETE DE ENTREGA'}
              </p>
              {matchedZones.length===0?(
                <p style={{fontSize:13,color:'#ff5555',padding:'12px',background:'rgba(255,51,51,0.06)',borderRadius:10,border:'1px solid rgba(255,51,51,0.2)'}}>❌ Não entregamos nesse bairro ainda. Entre em contato pelo WhatsApp.</p>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {matchedZones.map((z:Zone)=>(
                    <button key={z.id} onClick={()=>setZone(zone?.id===z.id?null:z)}
                      style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                        padding:'14px 16px',borderRadius:12,cursor:'pointer',textAlign:'left' as const,
                        border:zone?.id===z.id?'2px solid #00ff41':'1px solid #2a2a2a',
                        background:zone?.id===z.id?'rgba(0,255,65,0.06)':'#161616',
                        transition:'all 0.15s'}}>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{width:20,height:20,borderRadius:'50%',border:'2px solid '+(zone?.id===z.id?'#00ff41':'#444'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          {zone?.id===z.id&&<div style={{width:10,height:10,borderRadius:'50%',background:'#00ff41'}}/>}
                        </div>
                        <span style={{fontSize:15,color:zone?.id===z.id?'#fff':'#ccc',fontWeight:zone?.id===z.id?600:400}}>{z.name}</span>
                      </div>
                      <span style={{fontSize:15,fontWeight:700,color:z.fee===0?'#00ff41':'#fff',fontFamily:'JetBrains Mono,monospace',flexShrink:0,marginLeft:12}}>
                        {z.fee===0?'🆓 Grátis':fmt(z.fee)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OBSERVAÇÕES */}
          <p style={{fontSize:11,color:'#888',fontWeight:700,letterSpacing:0.8,margin:'0 0 8px'}}>OBSERVAÇÕES (opcional)</p>
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder='Ex: portão azul, sem cebola...' style={{...S,marginBottom:24}}/>

          {/* PAGAMENTO */}
          <p style={{fontSize:11,color:'#888',fontWeight:700,letterSpacing:0.8,margin:'0 0 10px'}}>FORMA DE PAGAMENTO</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:pay==='dinheiro'?10:24}}>
            {[{k:'pix',l:'💚 PIX'},{k:'dinheiro',l:'💵 Dinheiro'},{k:'debito',l:'💳 Débito'},{k:'credito',l:'💳 Crédito'}].map(m=>(
              <button key={m.k} onClick={()=>setPay(m.k)} style={{padding:'12px',borderRadius:12,border:pay===m.k?'2px solid #00ff41':'1px solid #2a2a2a',background:pay===m.k?'rgba(0,255,65,0.06)':'#161616',color:pay===m.k?'#00ff41':'#888',cursor:'pointer',fontSize:14,fontWeight:600}}>{m.l}</button>
            ))}
          </div>
          {pay==='dinheiro'&&(
            <input value={change} onChange={e=>setChange(e.target.value)} placeholder='Troco para quanto? (opcional)' inputMode='numeric' type='number' style={{...S,marginBottom:24}}/>
          )}

          {/* RESUMO */}
          <div style={{background:'#161616',borderRadius:12,padding:'14px 16px',marginBottom:20}}>
            <p style={{fontSize:11,color:'#888',fontWeight:700,letterSpacing:0.8,margin:'0 0 8px'}}>RESUMO DO PEDIDO</p>
            {cart.map((item,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:12,color:'#ccc'}}>{item.qty}x {item.name}{item.variant_name?' ('+item.variant_name+')':''}</span>
                <span style={{fontSize:12,color:'#aaa',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price*item.qty)}</span>
              </div>
            ))}
            <div style={{borderTop:'1px solid #2a2a2a',marginTop:8,paddingTop:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:12,color:'#888'}}>Subtotal</span>
                <span style={{fontSize:12,color:'#aaa',fontFamily:'JetBrains Mono,monospace'}}>{fmt(subtotal)}</span>
              </div>
              {zone&&(
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontSize:12,color:'#888'}}>Entrega ({zone.name})</span>
                  <span style={{fontSize:12,color:fee===0?'#00ff41':'#aaa',fontFamily:'JetBrains Mono,monospace'}}>{fee===0?'Grátis':fmt(fee)}</span>
                </div>
              )}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                <span style={{fontSize:15,color:'#fff',fontWeight:700}}>Total</span>
                <span style={{fontSize:18,color:'#00ff41',fontWeight:700,fontFamily:'JetBrains Mono,monospace'}}>{fmt(total)}</span>
              </div>
            </div>
          </div>

          <button onClick={submit} disabled={submitting} style={{width:'100%',padding:'16px',borderRadius:12,background:submitting?'#2a2a2a':'#00ff41',color:submitting?'#555':'#000',border:'none',cursor:submitting?'not-allowed':'pointer',fontFamily:'Bangers,cursive',fontSize:18,letterSpacing:1}}>
            {submitting?'ENVIANDO PEDIDO...':'✅ CONFIRMAR PEDIDO'}
          </button>
        </div>
      )}

      {/* Modal variantes */}
      {varModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:50}}>
          <div style={{width:'100%',maxWidth:500,background:'#151515',borderRadius:'20px 20px 0 0',padding:20,paddingBottom:32}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
              {varModal.image_url&&<img src={varModal.image_url} alt='' style={{width:48,height:48,borderRadius:8,objectFit:'cover'}}/>}
              <div style={{flex:1}}>
                <p style={{fontSize:16,fontWeight:700,color:'#fff',margin:0}}>{varModal.name}</p>
                <p style={{fontSize:13,color:'#00ff41',fontWeight:600,margin:0}}>{fmt(varModal.is_promo&&varModal.promo_price?varModal.promo_price:varModal.price)}</p>
              </div>
              <button onClick={()=>setVarModal(null)} style={{background:'#222',border:'none',borderRadius:8,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#888'}}><X size={16}/></button>
            </div>
            <p style={{fontSize:11,color:'#666',marginBottom:8,fontWeight:600,letterSpacing:0.5}}>ESCOLHA O SABOR</p>
            <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:260,overflowY:'auto',marginBottom:14}}>
              {(vm[varModal.id]||[]).filter(v=>v.stock>0).map(v=>(
                <button key={v.id} onClick={()=>setSelVar(v.id)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,border:selVar===v.id?'2px solid #00ff41':'1px solid #2a2a2a',background:selVar===v.id?'rgba(0,255,65,0.08)':'#1a1a1a',cursor:'pointer',textAlign:'left' as const}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:16,height:16,borderRadius:'50%',border:'2px solid '+(selVar===v.id?'#00ff41':'#444'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {selVar===v.id&&<div style={{width:8,height:8,borderRadius:'50%',background:'#00ff41'}}/>}
                    </div>
                    <span style={{fontSize:13,color:selVar===v.id?'#fff':'#ccc',fontWeight:selVar===v.id?600:400}}>{v.name}</span>
                  </div>
                  <div style={{textAlign:'right' as const}}>
                    {v.price_modifier!==0&&<p style={{fontSize:10,color:'#888',margin:0}}>{v.price_modifier>0?'+':''}{fmt(v.price_modifier)}</p>}
                    <p style={{fontSize:10,color:'#555',margin:0}}>estq: {v.stock}</p>
                  </div>
                </button>
              ))}
              {(vm[varModal.id]||[]).filter(v=>v.stock===0).map(v=>(
                <div key={v.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,border:'1px solid #1a1a1a',opacity:0.4}}>
                  <span style={{fontSize:13,color:'#555'}}>{v.name}</span>
                  <span style={{fontSize:10,color:'#ff5555'}}>ESGOTADO</span>
                </div>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <span style={{fontSize:12,color:'#888'}}>Quantidade</span>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <button onClick={()=>setVarQty(q=>Math.max(1,q-1))} style={{width:32,height:32,borderRadius:8,border:'1px solid #333',background:'#222',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={14}/></button>
                <span style={{fontSize:16,fontWeight:700,color:'#fff',minWidth:20,textAlign:'center' as const}}>{varQty}</span>
                <button onClick={()=>{const v=(vm[varModal.id]||[]).find(x=>x.id===selVar);if(!selVar||varQty<(v?.stock||99))setVarQty(q=>q+1)}} style={{width:32,height:32,borderRadius:8,border:'1px solid #333',background:'#222',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={14}/></button>
              </div>
            </div>
            <button onClick={confirmVar} disabled={!selVar} style={{width:'100%',padding:'14px',borderRadius:12,background:selVar?'#00ff41':'#2a2a2a',color:selVar?'#000':'#555',border:'none',cursor:selVar?'pointer':'not-allowed',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1}}>
              {selVar?'ADICIONAR AO CARRINHO':'SELECIONE UM SABOR'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}