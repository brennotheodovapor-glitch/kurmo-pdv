/// <reference types="vite/client" />
// WhatsApp integration via Evolution API (Railway)
const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_API_URL || ''
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || ''
const INSTANCE = import.meta.env.VITE_EVOLUTION_INSTANCE || 'kurmo'

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) return false
  try {
    const clean = phone.replace(/\D/g, '')
    const number = clean.startsWith('55') ? clean : `55${clean}`
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_KEY,
      },
      body: JSON.stringify({ number, text: message }),
    })
    return res.ok
  } catch { return false }
}

export function buildOrderMessage(order: {
  order_number: number
  status: string
  customer_name: string | null
  items: { product_name: string; quantity: number; total: number }[]
  total: number
  delivery_fee?: number
}): string {
  const statusMessages: Record<string, string> = {
    accepted: 'â *Pedido Confirmado!*',
    preparing: 'ð¨âð³ *Seu pedido estÃ¡ sendo preparado!*',
    ready: 'ð *Pedido pronto!*',
    delivering: 'ðµ *Saiu para entrega!*',
    delivered: 'â¨ *Pedido entregue!*',
    cancelled: 'â *Pedido cancelado*',
  }
  const header = statusMessages[order.status] || `ð¦ *AtualizaÃ§Ã£o do pedido #${order.order_number}*`
  const items = order.items.map(i => `  â¢ ${i.product_name} x${i.quantity} â R$ ${i.total.toFixed(2)}`).join('\n')
  return [
    `*Kurmo PDV* â Pedido #${String(order.order_number).padStart(4, '0')}`,
    '',
    header,
    '',
    `*OlÃ¡${order.customer_name ? ', ' + order.customer_name : ''}!*`,
    '',
    '*Itens:*',
    items,
    '',
    order.delivery_fee ? `Taxa de entrega: R$ ${order.delivery_fee.toFixed(2)}` : '',
    `*Total: R$ ${order.total.toFixed(2)}*`,
    '',
    '_Obrigado por comprar conosco!_ ð',
  ].filter(l => l !== null).join('\n')
}
