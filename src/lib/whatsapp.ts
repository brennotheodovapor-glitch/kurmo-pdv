// WhatsApp via Z-API (https://www.z-api.io)
// Variaveis necessarias no Vercel:
//   VITE_ZAPI_INSTANCE  -> ID da instancia (ex: 3D...)
//   VITE_ZAPI_TOKEN     -> Token do cliente Z-API
//   VITE_ZAPI_SECURITY  -> Security token (opcional, recomendado)

const BASE='https://api.z-api.io/instances'
const INSTANCE=()=>import.meta.env.VITE_ZAPI_INSTANCE||''
const TOKEN=()=>import.meta.env.VITE_ZAPI_TOKEN||''
const SECURITY=()=>import.meta.env.VITE_ZAPI_SECURITY||''

function fmtPhone(phone:string):string{
  let n=phone.replace(/\D/g,'')
  if(n.startsWith('0'))n=n.slice(1)
  if(!n.startsWith('55'))n='55'+n
  return n
}

export async function sendWhatsApp(phone:string,message:string):Promise<boolean>{
  const inst=INSTANCE();const tok=TOKEN()
  if(!inst||!tok){
    console.warn('[Z-API] Nao configurado - VITE_ZAPI_INSTANCE e VITE_ZAPI_TOKEN necessarios')
    return false
  }
  try{
    const headers:Record<string,string>={'Content-Type':'application/json','Client-Token':tok}
    const sec=SECURITY();if(sec)headers['Security-Token']=sec
    const res=await fetch(BASE+'/'+inst+'/token/'+tok+'/send-text',{
      method:'POST',
      headers,
      body:JSON.stringify({phone:fmtPhone(phone),message})
    })
    const data=await res.json()
    if(res.ok&&data.zaapId){console.log('[Z-API] Enviado:',data.zaapId);return true}
    console.error('[Z-API] Erro:',data)
    return false
  }catch(e){
    console.error('[Z-API] Excecao:',e)
    return false
  }
}

export function isConfigured():boolean{
  return!!(INSTANCE()&&TOKEN())
}

// Mensagens automaticas por status
export const WA_MESSAGES:Record<string,(name:string,num:number)=>string>={
  accepted:  (name,num)=>`Oi ${name}! Seu pedido *#${num}* foi *ACEITO* e esta sendo preparado. Logo mais chega! UZT 027 `,
  preparing: (_,num)  =>`*Pedido #${num}* esta *SENDO PREPARADO* agora. Aguarde, estamos quase prontos! UZT 027 `,
  delivering:(_,num)  =>`*Pedido #${num}* SAIU PARA ENTREGA! O entregador esta a caminho. UZT 027 `,
  delivered: (name,num)=>`${name}, seu *Pedido #${num}* foi *ENTREGUE*! Obrigado pela preferencia. Volte sempre! UZT 027 `,
  cancelled: (_,num)  =>`*Pedido #${num}* foi *CANCELADO*. Em caso de duvidas, fale conosco. UZT 027 `,
}