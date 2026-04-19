import{supabase}from './supabase'
const fmt=(n:string)=>n.replace(/\D/g,'').replace(/^0/,'').replace(/^55/,'55')

export const WA_MESSAGES:Record<string,Function>={
  accepted:(name:string,num:number)=>`✅ Olá ${name}! Seu pedido #${num} foi ACEITO! Estamos preparando tudo com carinho. 🛵`,
  preparing:(name:string,num:number)=>`👨‍🍳 Pedido #${num} sendo preparado agora! Em breve sairá para entrega.`,
  ready:(name:string,num:number)=>`📦 Pedido #${num} PRONTO! Aguardando o entregador.`,
  delivering:(name:string,num:number)=>`🛵 Seu pedido #${num} saiu para entrega! Fique de olho.`,
  delivered:(name:string,num:number)=>`🎉 Pedido #${num} entregue! Obrigado pela preferência. Volte sempre! ⭐`,
  cancelled:(name:string,num:number)=>`❌ Pedido #${num} cancelado. Sentimos muito. Entre em contato para mais informações.`,
}

// Send WhatsApp via Railway API (URL stored in store_settings.whatsapp_api_url)
let _cachedApiUrl:string|null=null
async function getApiUrl():Promise<string|null>{
  if(_cachedApiUrl!==null)return _cachedApiUrl||null
  try{
    const{data}=await supabase.from('store_settings').select('whatsapp_api_url').limit(1).maybeSingle()
    _cachedApiUrl=(data as any)?.whatsapp_api_url||''
    return _cachedApiUrl||null
  }catch{return null}
}

export async function sendWhatsApp(phone:string,message:string):Promise<boolean>{
  try{
    const apiUrl=await getApiUrl()
    if(!apiUrl){
      // Fallback: open WhatsApp Web
      const num=fmt(phone)
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`,'_blank')
      return true
    }
    // Call Railway API
    const r=await fetch(apiUrl+'/send',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({phone:fmt(phone),message})
    })
    return r.ok
  }catch(e){
    console.error('WhatsApp error:',e)
    return false
  }
}
