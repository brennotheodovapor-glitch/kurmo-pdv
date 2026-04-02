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
    accepted: '✅ *Pedido Confirmado!*',
    preparing: '👨‍🍳 *Seu pedido está sendo preparado!*',
    ready: '🎉 *Pedido pronto!*',
    delivering: '🛵 *Saiu para entrega!*',
    delivered: '✨ *Pedido entregue!*',
    cancelled: '❌ *Pedido cancelado*',
  }
  const header = statusMessages[order.status] || `📦 *Atualização do pedido #${order.order_number}*`
  const items = order.items.map(i => `  • ${i.product_name} x${i.quantity} — R$ ${i.total.toFixed(2)}`).join('\n')
  return [
    `*Kurmo PDV* — Pedido #${String(order.order_number).padStart(4, '0')}`,
    '',
    header,
    '',
    `*Olá${order.customer_name ? ', ' + order.customer_name : ''}!*`,
    '',
    '*Itens:*',
    items,
    '',
    order.delivery_fee ? `Taxa de entrega: R$ ${order.delivery_fee.toFixed(2)}` : '',
    `*Total: R$ ${order.total.toFixed(2)}*`,
    '',
    '_Obrigado por comprar conosco!_ 🙏',
  ].filter(l => l !== null).join('\n')
}
