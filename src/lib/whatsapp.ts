import{supabase}from './supabase'

const WA_URL='https://kurmo-whatsapp-api-production.up.railway.app'

// Apenas estes 4 status disparam mensagem
const NOTIFY_STATUSES=['accepted','delivering','delivered','cancelled']

const DEFAULT_MSGS:Record<string,string>={
  accepted:'Ola {nome}! Pedido #{numero} foi ACEITO! Estamos preparando tudo.',
  delivering:'Ola {nome}! Pedido #{numero} esta A CAMINHO! Fique de olho.',
  delivered:'Ola {nome}! Pedido #{numero} foi ENTREGUE! Obrigado pela preferencia!',
  cancelled:'Ola {nome}! Infelizmente seu pedido #{numero} foi CANCELADO. Entre em contato.'
}

export async function sendWhatsApp(phone:string,message:string):Promise<boolean>{
  try{
    const n=phone.replace(/\D/g,'')
    const r=await fetch(WA_URL+'/send',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({phone:n,message})
    })
    return r.ok
  }catch(e){
    console.error('WhatsApp error:',e)
    return false
  }
}

export async function notifyOrderStatus(
  phone:string,
  customerName:string,
  orderNumber:number,
  status:string,
  items?:any[]
):Promise<boolean>{
  if(!phone||!status)return false
  // Enviar apenas nos status selecionados
  if(!NOTIFY_STATUSES.includes(status))return false
  try{
    let template=DEFAULT_MSGS[status]||''
    const{data:msg}=await supabase.from('whatsapp_messages').select('message,active').eq('id',status).maybeSingle()
    if(msg?.active&&msg?.message)template=msg.message
    if(!template)return false
    let text=template.replace(/{nome}/g,customerName||'Cliente').replace(/{numero}/g,String(orderNumber||0))
    if(items&&items.length>0&&status==='delivered'){
      text+='\n\nItens:\n'+items.map(i=>i.quantity+'x '+i.product_name).join('\n')
    }
    return sendWhatsApp(phone,text)
  }catch(e){
    console.error('notifyOrderStatus error:',e)
    try{
      const template=DEFAULT_MSGS[status]||''
      if(!template)return false
      const text=template.replace(/{nome}/g,customerName||'Cliente').replace(/{numero}/g,String(orderNumber||0))
      return sendWhatsApp(phone,text)
    }catch{return false}
  }
}