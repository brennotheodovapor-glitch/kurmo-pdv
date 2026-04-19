// Comprovante de venda — funciona no PDV e Delivery
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const PL:Record<string,string>={pix:'PIX',dinheiro:'Dinheiro',debito:'Débito',credito:'Crédito'}

export interface ReceiptData{
  order_number:number
  customer_name:string
  customer_phone?:string|null
  type:string
  status:string
  payment_method?:string|null
  subtotal:number
  delivery_fee?:number
  discount?:number
  total:number
  coupon_code?:string|null
  notes?:string|null
  created_at:string
  items:Array<{product_name:string;quantity:number;unit_price:number;total_price:number;discount?:number}>
  payments?:Array<{method:string;amount:number}>
  seller_name?:string|null
  store_name?:string
}

export function printReceipt(data:ReceiptData){
  const win=window.open('','_blank','width=380,height=600')
  if(!win)return
  const date=new Date(data.created_at)
  const dateStr=date.toLocaleDateString('pt-BR')+' '+date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
  const sep='─'.repeat(32)
  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Comprovante #${data.order_number}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:12px;color:#000;background:#fff;width:300px;padding:10px}
  .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:6px 0}
  .row{display:flex;justify-content:space-between;margin:2px 0}
  .title{font-size:18px;font-weight:bold;margin:4px 0}
  .sub{font-size:10px;color:#333}
  .total-row{display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin:4px 0}
  .badge{display:inline-block;padding:2px 8px;border:1px solid #000;border-radius:4px;font-size:10px;margin:2px 0}
  @media print{@page{margin:2mm;size:80mm auto}}
</style>
</head><body>
<div class="center">
  <div class="title">${data.store_name||'KURMO PDV'}</div>
  <div class="sub">${dateStr}</div>
</div>
<div class="line"></div>
<div class="row"><span>Pedido:</span><span class="bold">#${data.order_number}</span></div>
<div class="row"><span>Cliente:</span><span>${data.customer_name||'Cliente Avulso'}</span></div>
${data.customer_phone?'<div class="row"><span>Fone:</span><span>'+data.customer_phone+'</span></div>':''}
<div class="row"><span>Tipo:</span><span class="badge">${data.type==='delivery'?'🛵 DELIVERY':'🏪 PDV'}</span></div>
${data.seller_name?'<div class="row"><span>Vendedor:</span><span>'+data.seller_name+'</span></div>':''}
${data.notes?'<div style="margin:4px 0;font-size:10px;color:#555">📍 '+data.notes+'</div>':''}
<div class="line"></div>
<div class="bold" style="margin-bottom:4px">ITENS</div>
${data.items.map(i=>{
  const hasDisc=(i.discount||0)>0
  return '<div class="row"><span>'+i.quantity+'x '+i.product_name+'</span><span>'+fmt(i.total_price)+(hasDisc?' <span style="color:red;font-size:10px">(-'+fmt(i.discount||0)+')</span>':'')+'</span></div>'
}).join('')}
<div class="line"></div>
${data.subtotal!==data.total?'<div class="row"><span>Subtotal:</span><span>'+fmt(data.subtotal)+'</span></div>':''}
${(data.delivery_fee||0)>0?'<div class="row"><span>Entrega:</span><span>'+fmt(data.delivery_fee||0)+'</span></div>':''}
${(data.discount||0)>0?'<div class="row"><span>Desconto'+(data.coupon_code?' ('+data.coupon_code+')':'')+':</span><span>-'+fmt(data.discount||0)+'</span></div>':''}
<div class="total-row"><span>TOTAL:</span><span>${fmt(data.total)}</span></div>
<div class="line"></div>
<div class="bold" style="margin-bottom:2px">PAGAMENTO</div>
${data.payments&&data.payments.length>0
  ?data.payments.map(p=>'<div class="row"><span>'+(PL[p.method]||p.method)+'</span><span>'+fmt(p.amount)+'</span></div>').join('')
  :data.payment_method?'<div class="row"><span>'+(PL[data.payment_method]||data.payment_method)+'</span><span>'+fmt(data.total)+'</span></div>':''
}
<div class="line"></div>
<div class="center sub" style="margin-top:8px">Obrigado pela preferência!<br>${data.store_name||'KURMO PDV'}</div>
</body></html>`)
  win.document.close()
  setTimeout(()=>win.print(),500)
}
