// WhatsApp via Evolution API (Railway)
// Variaveis no Vercel:
//   VITE_EVO_URL      -> URL publica do Railway (ex: https://xyz.up.railway.app)
//   VITE_EVO_KEY      -> API Key definida na Evolution API
//   VITE_EVO_INSTANCE -> Nome da instancia (ex: uzt027)

const EVO_URL=()=>import.meta.env.VITE_EVO_URL||''
const EVO_KEY=()=>import.meta.env.VITE_EVO_KEY||''
const EVO_INST=()=>import.meta.env.VITE_EVO_INSTANCE||'uzt027'

function fmtPhone(phone:string):string{
  let n=phone.replace(/\D/g,'')
  if(n.startsWith('0'))n=n.slice(1)
  if(!n.startsWith('55'))n='55'+n
  return n+'@s.whatsapp.net'
}

export function isConfigured():boolean{
  return!!(EVO_URL()&&EVO_KEY())
}

export async function sendWhatsApp(phone:string,message:string):Promise<boolean>{
  const url=EVO_URL();const key=EVO_KEY();const inst=EVO_INST()
  if(!url||!key){
    console.warn('[WhatsApp] Nao configurado — adicione VITE_EVO_URL e VITE_EVO_KEY no Vercel')
    return false
  }
  try{
    const res=await fetch(url+'/message/sendText/'+inst,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':key},
      body:JSON.stringify({number:fmtPhone(phone),textMessage:{text:message}})
    })
    if(res.ok){console.log('[WhatsApp] Enviado OK');return true}
    const err=await res.json()
    console.error('[WhatsApp] Erro:',err)
    return false
  }catch(e){
    console.error('[WhatsApp] Excecao:',e)
    return false
  }
}

export const WA_MESSAGES:Record<string,(name:string,num:number)=>string>={
  accepted:  (name,num)=>`Oi ${name}! Seu pedido *#${num}* foi *ACEITO* e esta sendo preparado. Logo mais chega! UZT 027 `,
  preparing: (_,num)  =>`*Pedido #${num}* esta sendo *PREPARADO* agora. Aguarde! UZT 027 `,
  delivering:(_,num)  =>`*Pedido #${num}* SAIU PARA ENTREGA! O entregador esta a caminho. UZT 027 `,
  delivered: (name,num)=>`${name}, seu *Pedido #${num}* foi *ENTREGUE*! Obrigado pela preferencia! UZT 027 `,
  cancelled: (_,num)  =>`*Pedido #${num}* foi *CANCELADO*. Em caso de duvidas, fale conosco. UZT 027 `,
}