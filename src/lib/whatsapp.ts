// WhatsApp service via Evolution API
// Configure VITE_WA_URL and VITE_WA_KEY in Vercel environment variables

const WA_URL=import.meta.env.VITE_WA_URL||''
const WA_KEY=import.meta.env.VITE_WA_KEY||''
const WA_INSTANCE=import.meta.env.VITE_WA_INSTANCE||'kurmo'

function fmtPhone(phone:string):string{
  // Clean number and add Brazil country code
  let n=phone.replace(/\D/g,'')
  if(n.startsWith('0'))n=n.slice(1)
  if(!n.startsWith('55'))n='55'+n
  return n+'@s.whatsapp.net'
}

export async function sendWhatsApp(phone:string,message:string):Promise<boolean>{
  if(!WA_URL||!WA_KEY){
    console.warn('[WhatsApp] Not configured - skipping message')
    return false
  }
  try{
    const res=await fetch(WA_URL+'/message/sendText/'+WA_INSTANCE,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':WA_KEY},
      body:JSON.stringify({number:fmtPhone(phone),textMessage:{text:message}})
    })
    const data=await res.json()
    if(res.ok){console.log('[WhatsApp] Sent OK');return true}
    console.error('[WhatsApp] Error:',data)
    return false
  }catch(e){
    console.error('[WhatsApp] Exception:',e)
    return false
  }
}

// Messages for each status change
export const WA_MESSAGES:Record<string,(name:string,num:number)=>string>={
  accepted:(name,num)=>`Ola ${name}! Seu pedido *#${num}* foi *ACEITO* e esta sendo preparado. Aguarde, logo chegaremos! UZT 027`,
  preparing:(name,num)=>`*Pedido #${num}* esta sendo *PREPARADO* agora. Logo sai para entrega! UZT 027`,
  delivering:(name,num)=>`*Pedido #${num}* saiu para *ENTREGA*! O entregador esta a caminho. UZT 027`,
  delivered:(name,num)=>`*Pedido #${num}* foi *ENTREGUE* com sucesso! Obrigado pela preferencia. Volte sempre! UZT 027`,
  cancelled:(name,num)=>`*Pedido #${num}* foi *CANCELADO*. Entre em contato conosco se tiver duvidas. UZT 027`,
}