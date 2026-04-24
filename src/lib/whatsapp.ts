const WA_URL='https://kurmo-whatsapp-api-production.up.railway.app'

// Mensagens padrão caso tabela não exista
const DEFAULT_MSGS:Record<string,string>={
  accepted:'Ola {nome}! Pedido #{numero} foi ACEITO! Estamos preparando tudo.',
  preparing:'Ola {nome}! Pedido #{numero} esta sendo PREPARADO!',
  ready:'Ola {nome}! Pedido #{numero} esta PRONTO! O entregador vai sair agora.',
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
    console.error('WhatsApp send error:',e)
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
  try{
    // Tentar buscar mensagem customizada do banco
    const{createClient}=await import('@supabase/supabase-js')
    const sb=createClient(
      import.meta.env.VITE_SUPABASE_URL||'',
      import.meta.env.VITE_SUPABASE_ANON_KEY||''
    )
    let template=DEFAULT_MSGS[status]||''
    const{data:msg}=await sb.from('whatsapp_messages').select('message,active').eq('id',status).single()
    if(msg?.active&&msg?.message)template=msg.message

    if(!template)return false

    // Substituir variáveis
    let text=template
      .replace(/{nome}/g,customerName||'Cliente')
      .replace(/{numero}/g,String(orderNumber||0))

    // Adicionar itens se entregando/pronto
    if(items&&items.length>0&&['ready','delivering','delivered'].includes(status)){
      text+='

*Itens:*
'+items.map(i=>i.quantity+'x '+i.product_name).join('
')
    }

    return sendWhatsApp(phone,text)
  }catch(e){
    console.error('notifyOrderStatus error:',e)
    return false
  }
}