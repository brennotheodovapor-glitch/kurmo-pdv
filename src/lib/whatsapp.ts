const WA_URL='https://kurmo-whatsapp-api-production.up.railway.app'

const STATUS_MSG:Record<string,string>={
  accepted:'✅ Seu pedido foi *ACEITO*! Estamos preparando tudo com carinho. Em breve sairá para entrega.',
  preparing:'👨‍🍳 Seu pedido está sendo *PREPARADO*! Em breve ficará pronto.',
  ready:'🎁 Pedido *PRONTO*! Saiu para entrega agora mesmo.',
  delivering:'🛵 Pedido *A CAMINHO*! Nosso entregador está indo até você.',
  delivered:'🎉 Pedido *ENTREGUE*! Obrigado pela preferência. Volte sempre!',
  cancelled:'❌ Seu pedido foi *CANCELADO*. Entre em contato para mais informações.'
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
  }catch{return false}
}

export async function notifyOrderStatus(phone:string,customerName:string,orderNumber:number,status:string,items?:any[]):Promise<boolean>{
  const base=STATUS_MSG[status]
  if(!base||!phone)return false
  const itemsList=items&&items.length>0?'\n\n*Itens:*\n'+items.map(i=>i.quantity+'x '+i.product_name+' - R$'+Number(i.total_price).toFixed(2)).join('\n'):''
  const msg=`🛍️ *UZT 021* - Pedido #${orderNumber}\n\nOlá ${customerName}!\n${base}${itemsList}`
  return sendWhatsApp(phone,msg)
}
