import{useState,useEffect,useRef}from 'react'
import{Settings,Save,Upload,Store,Phone,Image,Link}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'
const STORE_ID='77ddd33f-bdc6-4be5-921a-c5064d869cf5'
type S={store_name:string;store_description:string;promo_title:string;promo_description:string;store_logo_url:string;store_banner_url:string;whatsapp:string;min_order:number;whatsapp_api_url:string}
const EMPTY:S={store_name:'',store_description:'',promo_title:'',promo_description:'',store_logo_url:'',store_banner_url:'',whatsapp:'',min_order:0,whatsapp_api_url:''}
export default function SettingsPage(){
  const[settings,setSettings]=useState<S>(EMPTY)
  const[loading,setLoading]=useState(true)
  const[saving,setSaving]=useState(false)
  const[uploading,setUploading]=useState<string|null>(null)
  const logoRef=useRef<HTMLInputElement>(null)
  const bannerRef=useRef<HTMLInputElement>(null)
  useEffect(()=>{load()},[])
  async function load(){
    setLoading(true)
    const{data}=await supabase.from('store_settings').select('*').eq('id',STORE_ID).maybeSingle()
    if(data)setSettings({...EMPTY,...data})
    setLoading(false)
  }
  function upd(field:keyof S,val:any){setSettings(s=>({...s,[field]:val}))}
  async function save(){
    setSaving(true)
    const{error}=await supabase.from('store_settings').update({
      store_name:settings.store_name,
      store_description:settings.store_description,
      promo_title:settings.promo_title,
      promo_description:settings.promo_description,
      store_logo_url:settings.store_logo_url,
      store_banner_url:settings.store_banner_url,
      whatsapp:settings.whatsapp,
      min_order:Number(settings.min_order)||0,
      whatsapp_api_url:settings.whatsapp_api_url,
      updated_at:new Date().toISOString()
    }).eq('id',STORE_ID)
    if(error)toast.error(error.message)
    else toast.success('Configurações salvas!')
    setSaving(false)
  }
  async function uploadImg(file:File,field:'store_logo_url'|'store_banner_url'){
    setUploading(field)
    try{
      const ext=file.name.split('.').pop()
      const path=field+'-'+Date.now()+'.'+ext
      const{error:upErr}=await supabase.storage.from('product-images').upload(path,file,{upsert:true})
      if(upErr)throw upErr
      const{data:urlData}=supabase.storage.from('product-images').getPublicUrl(path)
      upd(field,urlData.publicUrl)
      toast.success('Imagem enviada!')
    }catch(e:any){toast.error(e.message)}
    finally{setUploading(null)}
  }
  if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--muted)'}}>Carregando...</div>
  const Field=({label,value,onChange,placeholder,type='text'}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;type?:string})=>(
    <div style={{marginBottom:12}}>
      <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:0.8,fontWeight:600}}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:'100%',fontSize:13}}/>
    </div>
  )
  const TextArea=({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string})=>(
    <div style={{marginBottom:12}}>
      <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:0.8,fontWeight:600}}>{label}</label>
      <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3} style={{width:'100%',fontSize:13,background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:8,padding:'9px 12px',resize:'none' as const,outline:'none',boxSizing:'border-box' as const}}/>
    </div>
  )
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10}}>
        <Settings size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>CONFIGURAÇÕES</h1>
        <button onClick={save} disabled={saving} className='btn-neon-fill' style={{marginLeft:'auto',fontSize:13,padding:'7px 16px'}}>
          <Save size={13} style={{display:'inline',marginRight:5}}/>{saving?'SALVANDO...':'SALVAR TUDO'}
        </button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px',maxWidth:640}}>
        {/* Loja */}
        <div className='card' style={{padding:'16px',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <Store size={15} color='var(--neon)'/>
            <p style={{fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>INFORMAÇÕES DA LOJA</p>
          </div>
          <Field label='NOME DA LOJA' value={settings.store_name} onChange={v=>upd('store_name',v)} placeholder='Ex: Kurmo Vapes'/>
          <TextArea label='DESCRIÇÃO' value={settings.store_description} onChange={v=>upd('store_description',v)} placeholder='Descrição da sua loja...'/>
          <Field label='WHATSAPP (com DDD)' value={settings.whatsapp} onChange={v=>upd('whatsapp',v)} placeholder='27999999999'/>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:0.8,fontWeight:600}}>PEDIDO MÍNIMO (R$)</label>
            <input type='number' min='0' step='0.01' value={settings.min_order||''} onChange={e=>upd('min_order',parseFloat(e.target.value)||0)} placeholder='0,00' style={{width:'100%',fontSize:13}}/>
          </div>
        </div>
        {/* Promoção */}
        <div className='card' style={{padding:'16px',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <Link size={15} color='var(--neon)'/>
            <p style={{fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>BANNER PROMOCIONAL</p>
          </div>
          <Field label='TÍTULO DA PROMOÇÃO' value={settings.promo_title} onChange={v=>upd('promo_title',v)} placeholder='Ex: 🔥 PROMOÇÃO DO DIA'/>
          <TextArea label='DESCRIÇÃO DA PROMOÇÃO' value={settings.promo_description} onChange={v=>upd('promo_description',v)} placeholder='Detalhes da promoção...'/>
        </div>
        {/* Imagens */}
        <div className='card' style={{padding:'16px',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <Image size={15} color='var(--neon)'/>
            <p style={{fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>IMAGENS</p>
          </div>
          {/* Logo */}
          <div style={{marginBottom:14}}>
            <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:6,letterSpacing:0.8,fontWeight:600}}>LOGO DA LOJA</label>
            <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
              {settings.store_logo_url&&<img src={settings.store_logo_url} alt='logo' style={{width:56,height:56,borderRadius:10,objectFit:'cover',border:'1px solid var(--border)'}}/>}
              <input ref={logoRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])uploadImg(e.target.files[0],'store_logo_url')}}/>
              <button onClick={()=>logoRef.current?.click()} disabled={uploading==='store_logo_url'} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12}}>
                <Upload size={12}/>{uploading==='store_logo_url'?'Enviando...':'Enviar Logo'}
              </button>
              <input value={settings.store_logo_url} onChange={e=>upd('store_logo_url',e.target.value)} placeholder='ou cole a URL...' style={{flex:1,minWidth:140,fontSize:12}}/>
            </div>
          </div>
          {/* Banner */}
          <div>
            <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:6,letterSpacing:0.8,fontWeight:600}}>BANNER DO CATÁLOGO</label>
            <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
              {settings.store_banner_url&&<img src={settings.store_banner_url} alt='banner' style={{width:80,height:42,borderRadius:6,objectFit:'cover',border:'1px solid var(--border)'}}/>}
              <input ref={bannerRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])uploadImg(e.target.files[0],'store_banner_url')}}/>
              <button onClick={()=>bannerRef.current?.click()} disabled={uploading==='store_banner_url'} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12}}>
                <Upload size={12}/>{uploading==='store_banner_url'?'Enviando...':'Enviar Banner'}
              </button>
              <input value={settings.store_banner_url} onChange={e=>upd('store_banner_url',e.target.value)} placeholder='ou cole a URL...' style={{flex:1,minWidth:140,fontSize:12}}/>
            </div>
          </div>
        </div>
        {/* WhatsApp Railway */}
        <div className='card' style={{padding:'16px',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <Phone size={15} color='#25d366'/>
            <p style={{fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>WHATSAPP AUTOMÁTICO (RAILWAY)</p>
          </div>
          <p style={{fontSize:11,color:'var(--muted)',marginBottom:10,lineHeight:1.5}}>
            Cole a URL da sua API hospedada no Railway. O sistema enviará mensagens automáticas ao cliente quando o status do pedido mudar (aceito, saiu para entrega, entregue etc).
          </p>
          <Field label='URL DA API RAILWAY' value={settings.whatsapp_api_url} onChange={v=>upd('whatsapp_api_url',v)} placeholder='https://seu-app.up.railway.app'/>
          <div style={{padding:'8px 12px',background:'rgba(37,211,102,0.06)',borderRadius:8,border:'1px solid rgba(37,211,102,0.15)'}}>
            <p style={{fontSize:10,color:'#25d366',fontWeight:600,marginBottom:3}}>📡 COMO CONFIGURAR</p>
            <p style={{fontSize:10,color:'var(--muted)',lineHeight:1.5}}>
              1. Suba um bot WhatsApp no Railway (ex: usando whatsapp-web.js ou Baileys)<br/>
              2. Exponha o endpoint POST /send que recebe {"{ phone, message }"}<br/>
              3. Cole a URL base aqui e salve<br/>
              4. Sem Railway? O sistema abre o WhatsApp Web como fallback
            </p>
          </div>
        </div>
        {/* Link do catálogo */}
        <div className='card' style={{padding:'16px',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <Link size={15} color='var(--neon)'/>
            <p style={{fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>LINK DO CATÁLOGO PÚBLICO</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:'var(--surface)',borderRadius:8,border:'1px solid var(--border)'}}>
            <span style={{fontSize:12,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              https://kurmo-pdv.vercel.app/menu
            </span>
            <button onClick={()=>{navigator.clipboard.writeText('https://kurmo-pdv.vercel.app/menu');toast.success('Link copiado!')}} style={{padding:'5px 10px',borderRadius:6,border:'1px solid var(--neon-dim)',background:'var(--neon-glow)',color:'var(--neon)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive',flexShrink:0}}>
              COPIAR
            </button>
          </div>
          <p style={{fontSize:10,color:'var(--muted)',marginTop:6}}>Compartilhe este link com seus clientes para que façam pedidos delivery.</p>
        </div>
      </div>
    </div>
  )
}