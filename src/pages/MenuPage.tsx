import{useState,useEffect,useRef}from 'react'
import{QrCode,Bell,BellOff,Check,X,ChevronDown,ChevronUp,Package,Settings,Image,Tag,Store,Upload,Loader2,ExternalLink,Edit2,GripVertical}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function MenuPage(){
  const[orders,setOrders]=useState<any[]>([])
  const[products,setProducts]=useState<any[]>([])
  const[loading,setLoading]=useState(true)
  const[soundOn,setSoundOn]=useState(true)
  const[settings,setSettings]=useState<any>({store_name:'UZT 027',store_description:'Vapes & Roupas',promo_title:'',promo_description:''})
  const[savingSettings,setSavingSettings]=useState(false)
  const[tab,setTab]=useState<'orders'|'settings'|'products'>('orders')
  const[uploadingLogo,setUploadingLogo]=useState(false)
  const[uploadingBanner,setUploadingBanner]=useState(false)
  const audioRef=useRef<AudioContext|null>(null)
  const prevRef=useRef(0)
  const logoRef=useRef<HTMLInputElement>(null)
  const bannerRef=useRef<HTMLInputElement>(null)
  const catalogUrl=window.location.origin+'/menu'

  useEffect(()=>{loadAll();const i=setInterval(loadOrders,15000);return()=>clearInterval(i)},[])

  function playAlarm(){
    try{
      if(!audioRef.current)audioRef.current=new AudioContext()
      const ctx=audioRef.current;const osc=ctx.createOscillator();const g=ctx.createGain()
      osc.connect(g);g.connect(ctx.destination)
      osc.frequency.setValueAtTime(880,ctx.currentTime);osc.frequency.setValueAtTime(660,ctx.currentTime+0.1);osc.frequency.setValueAtTime(880,ctx.currentTime+0.2)
      g.gain.setValueAtTime(0.3,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5)
      osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.5)
    }catch{}
  }

  async function loadAll(){
    setLoading(true)
    const[o,p,s]=await Promise.all([
      supabase.from('orders').select('*,order_items(product_name,quantity,unit_price,total_price)').eq('type','delivery').in('status',['pending','accepted','preparing','ready','delivering']).order('created_at'),
      supabase.from('products').select('*').eq('active',true).order('sort_order').order('name'),
      supabase.from('store_settings').select('*').eq('id',1).maybeSingle(),
    ])
    setOrders(o.data||[])
    setProducts(p.data||[])
    if(s.data)setSettings(s.data)
    setLoading(false)
  }

  async function loadOrders(){
    const{data}=await supabase.from('orders').select('*,order_items(product_name,quantity,unit_price,total_price)').eq('type','delivery').in('status',['pending','accepted','preparing','ready','delivering']).order('created_at')
    const newOrders=data||[]
    const pending=newOrders.filter(o=>o.status==='pending').length
    if(soundOn&&pending>prevRef.current)playAlarm()
    prevRef.current=pending
    setOrders(newOrders)
  }

  async function updateStatus(id:string,status:string){
    await supabase.from('orders').update({status}).eq('id',id)
    toast.success(status==='accepted'?'Pedido aceito!':status==='delivering'?'Saiu para entrega!':'Status atualizado')
    loadOrders()
  }

  async function saveSettings(){
    setSavingSettings(true)
    const{error}=await supabase.from('store_settings').upsert({...settings,id:1,updated_at:new Date().toISOString()})
    if(error)toast.error(error.message)
    else toast.success('Configurações salvas!')
    setSavingSettings(false)
  }

  async function uploadImg(file:File,field:'store_logo_url'|'store_banner_url',setUploading:(v:boolean)=>void){
    setUploading(true)
    try{
      const ext=file.name.split('.').pop()||'jpg'
      const path='store/'+field+'.'+ext
      const{error}=await supabase.storage.from('product-images').upload(path,file,{upsert:true,contentType:file.type})
      if(error)throw error
      const{data:{publicUrl}}=supabase.storage.from('product-images').getPublicUrl(path)
      setSettings((s:any)=>({...s,[field]:publicUrl}))
      toast.success('Imagem enviada! Clique em Salvar.')
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setUploading(false)}
  }

  async function togglePromo(id:string,current:boolean){
    await supabase.from('products').update({is_promo:!current}).eq('id',id)
    toast.success(!current?'Produto em promoção!':'Promoção removida')
    loadAll()
  }

  async function setPromoPrice(id:string,price:string){
    await supabase.from('products').update({promo_price:price?parseFloat(price):null}).eq('id',id)
    loadAll()
  }

  const NEXT:Record<string,string>={pending:'accepted',accepted:'preparing',preparing:'ready',ready:'delivering'}
  const STATUS_LABEL:Record<string,string>={pending:'Aguardando',accepted:'Aceito',preparing:'Preparando',ready:'Pronto',delivering:'A Caminho'}
  const STATUS_COLOR:Record<string,string>={pending:'#ffaa00',accepted:'#06b6d4',preparing:'#7c3aed',ready:'#00ff41',delivering:'#f59e0b'}
  const pendingCount=orders.filter(o=>o.status==='pending').length

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',flexShrink:0}}>
        <QrCode size={18} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:22}}>CATÁLOGO</h1>
        <button onClick={()=>setSoundOn(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,border:soundOn?'1px solid var(--neon)':'1px solid var(--border)',background:soundOn?'var(--neon-glow)':'transparent',color:soundOn?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>
          {soundOn?<Bell size={12}/>:<BellOff size={12}/>}{soundOn?'SOM':'MUDO'}
        </button>
        <a href={catalogUrl} target='_blank' rel='noopener noreferrer' style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,border:'1px solid var(--border)',color:'var(--muted)',textDecoration:'none',fontSize:11,fontFamily:'Bangers,cursive'}}>
          <ExternalLink size={11}/>VER CATÁLOGO
        </a>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',background:'var(--surface)',flexShrink:0}}>
        {[{k:'orders',l:'Pedidos'+(pendingCount>0?' ('+pendingCount+')':'')},{k:'settings',l:'Loja'},{k:'products',l:'Promoções'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as any)} style={{flex:1,padding:'10px',border:'none',borderBottom:tab===t.k?'2px solid var(--neon)':'2px solid transparent',background:'transparent',color:tab===t.k?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive',transition:'all 0.15s'}}>{t.l}</button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto'}}>
        {/* ORDERS TAB */}
        {tab==='orders'&&(
          <div style={{padding:'10px 14px'}}>
            {loading?<div style={{textAlign:'center',padding:32,color:'var(--muted)'}}>Carregando...</div>:
            orders.length===0?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}><QrCode size={32} style={{opacity:0.2,marginBottom:10}}/><p style={{fontFamily:'Bangers,cursive',fontSize:16}}>Sem pedidos ativos</p></div>:
            orders.map(o=>(
              <div key={o.id} className='card' style={{marginBottom:8,borderLeft:'3px solid '+(STATUS_COLOR[o.status]||'var(--border)')}}>
                <div style={{padding:'10px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,color:'var(--neon)',fontWeight:700}}>#{o.order_number}</span>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--white)'}}>{o.customer_name}</span>
                    <span style={{fontSize:10,padding:'2px 7px',borderRadius:10,background:(STATUS_COLOR[o.status]||'#888')+'22',color:STATUS_COLOR[o.status]||'#888',fontWeight:700}}>{STATUS_LABEL[o.status]}</span>
                    <span style={{marginLeft:'auto',fontSize:15,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(o.total)}</span>
                  </div>
                  <div style={{marginBottom:8}}>
                    {(o.order_items||[]).map((i:any,idx:number)=>(<span key={idx} style={{fontSize:11,color:'var(--muted)',marginRight:10}}>{i.quantity}x {i.product_name}</span>))}
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    {NEXT[o.status]&&<button onClick={()=>updateStatus(o.id,NEXT[o.status])} style={{flex:2,padding:'8px',borderRadius:7,border:'none',background:o.status==='pending'?'var(--neon)':'var(--neon-glow)',color:o.status==='pending'?'#000':'var(--neon)',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive'}}>{o.status==='pending'?'✓ ACEITAR':'→ '+(STATUS_LABEL[NEXT[o.status]]||'').toUpperCase()}</button>}
                    <button onClick={()=>updateStatus(o.id,'cancelled')} style={{padding:'8px 12px',borderRadius:7,border:'1px solid #ff3333',background:'rgba(255,51,51,0.08)',color:'#ff3333',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive'}}>✗</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab==='settings'&&(
          <div style={{padding:'14px 16px',maxWidth:500}}>
            <div className='card' style={{padding:16,marginBottom:12}}>
              <p style={{fontSize:12,color:'var(--muted)',letterSpacing:1,marginBottom:12,fontWeight:600}}>IDENTIDADE DA LOJA</p>
              <div style={{display:'flex',gap:12,marginBottom:14,alignItems:'flex-start'}}>
                {/* Logo */}
                <div>
                  <p style={{fontSize:10,color:'var(--muted)',marginBottom:5}}>LOGO (150x150)</p>
                  <div onClick={()=>logoRef.current?.click()} style={{width:80,height:80,borderRadius:12,border:'2px dashed var(--border)',overflow:'hidden',cursor:'pointer',background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                    {settings.store_logo_url?<img src={settings.store_logo_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<Store size={24} color='var(--muted)'/>}
                    {uploadingLogo&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}><Loader2 size={16} color='var(--neon)' style={{animation:'spin 1s linear infinite'}}/></div>}
                  </div>
                  <input ref={logoRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>e.target.files?.[0]&&uploadImg(e.target.files[0],'store_logo_url',setUploadingLogo)}/>
                </div>
                {/* Banner */}
                <div style={{flex:1}}>
                  <p style={{fontSize:10,color:'var(--muted)',marginBottom:5}}>BANNER (1200x400)</p>
                  <div onClick={()=>bannerRef.current?.click()} style={{width:'100%',height:80,borderRadius:10,border:'2px dashed var(--border)',overflow:'hidden',cursor:'pointer',background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                    {settings.store_banner_url?<img src={settings.store_banner_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{textAlign:'center'}}><Image size={20} color='var(--muted)'/><p style={{fontSize:10,color:'var(--muted)',marginTop:3}}>Clique para enviar</p></div>}
                    {uploadingBanner&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}><Loader2 size={16} color='var(--neon)' style={{animation:'spin 1s linear infinite'}}/></div>}
                  </div>
                  <input ref={bannerRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>e.target.files?.[0]&&uploadImg(e.target.files[0],'store_banner_url',setUploadingBanner)}/>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>NOME DA LOJA</label><input value={settings.store_name||''} onChange={e=>setSettings((s:any)=>({...s,store_name:e.target.value}))} style={{width:'100%'}}/></div>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>DESCRIÇÃO</label><input value={settings.store_description||''} onChange={e=>setSettings((s:any)=>({...s,store_description:e.target.value}))} placeholder='Ex: Vapes & Roupas' style={{width:'100%'}}/></div>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>PEDIDO MÍNIMO (R$)</label><input type='number' min='0' step='0.01' value={settings.min_order||0} onChange={e=>setSettings((s:any)=>({...s,min_order:parseFloat(e.target.value)||0}))} style={{width:'100%'}}/></div>
              </div>
            </div>

            <div className='card' style={{padding:16,marginBottom:12}}>
              <p style={{fontSize:12,color:'var(--muted)',letterSpacing:1,marginBottom:12,fontWeight:600}}>BANNER DE PROMOÇÃO</p>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>TÍTULO DA PROMOÇÃO</label><input value={settings.promo_title||''} onChange={e=>setSettings((s:any)=>({...s,promo_title:e.target.value}))} placeholder='Ex: 🔥 Promoção de fim de semana!' style={{width:'100%'}}/></div>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>DESCRIÇÃO</label><input value={settings.promo_description||''} onChange={e=>setSettings((s:any)=>({...s,promo_description:e.target.value}))} placeholder='Ex: 10% de desconto em todos os vapes' style={{width:'100%'}}/></div>
              </div>
              <p style={{fontSize:10,color:'var(--muted)',marginTop:8}}>Deixe o título vazio para ocultar o banner de promoção</p>
            </div>

            <button onClick={saveSettings} disabled={savingSettings} className='btn-neon-fill' style={{width:'100%',fontSize:14,padding:12}}>
              <Check size={14} style={{display:'inline',marginRight:6}}/>{savingSettings?'SALVANDO...':'SALVAR CONFIGURAÇÕES'}
            </button>
          </div>
        )}

        {/* PRODUCTS / PROMOS TAB */}
        {tab==='products'&&(
          <div style={{padding:'10px 14px'}}>
            <p style={{fontSize:11,color:'var(--muted)',marginBottom:12,letterSpacing:0.5}}>Marque produtos como promoção para aparecerem em destaque no catálogo</p>
            {products.map(p=>(
              <div key={p.id} className='card' style={{marginBottom:6,padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
                {p.image_url&&<img src={p.image_url} style={{width:40,height:40,borderRadius:7,objectFit:'cover',flexShrink:0}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:600,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</p>
                  <p style={{fontSize:11,color:'var(--muted)'}}>{fmt(p.price)}</p>
                </div>
                {p.is_promo&&(
                  <input type='number' min='0' step='0.01' defaultValue={p.promo_price||''} onBlur={e=>setPromoPrice(p.id,e.target.value)} placeholder='Preço promo' style={{width:90,fontSize:12,padding:'4px 7px',textAlign:'right'}}/>
                )}
                <button onClick={()=>togglePromo(p.id,p.is_promo)} style={{padding:'5px 10px',borderRadius:7,border:p.is_promo?'1px solid #f59e0b':'1px solid var(--border)',background:p.is_promo?'rgba(245,158,11,0.1)':'transparent',color:p.is_promo?'#f59e0b':'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive',whiteSpace:'nowrap'}}>
                  <Tag size={11} style={{display:'inline',marginRight:3}}/>{p.is_promo?'EM PROMO':'PROMOVER'}
                </button>
              </div>
            ))}
            {products.length===0&&<div style={{textAlign:'center',padding:32,color:'var(--muted)'}}>Nenhum produto cadastrado ainda</div>}
          </div>
        )}
      </div>
    </div>
  )
}