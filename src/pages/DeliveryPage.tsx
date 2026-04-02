import { useState, useEffect } from 'react'
import { Plus, Phone, MapPin, Clock, ChevronRight, Search, Zap, CheckCircle, ChefHat, Package, Bike, Star, X } from 'lucide-react'
import { currency, orderNumber, time } from '@/lib/format'
import toast from 'react-hot-toast'

type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled'

type DeliveryOrder = {
  id: string
  order_number: number
  customer_name: string
  customer_phone: string
  customer_address: string
  status: OrderStatus
  payment_method: string
  total: number
  delivery_fee: number
  items: { product_name: string; quantity: number; total: number }[]
  notes?: string
  created_at: string
}

const MOCK_ORDERS: DeliveryOrder[] = [
  {
    id: '1', order_number: 1, customer_name: 'João Silva', customer_phone: '27999887766',
    customer_address: 'Rua das Flores, 123 - Jardim América', status: 'pending',
    payment_method: 'pix', total: 175, delivery_fee: 10,
    items: [{ product_name: 'Elfbar BC5000', quantity: 1, total: 120 }, { product_name: 'Salt Nic Mango 30ml', quantity: 1, total: 35 }],
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: '2', order_number: 2, customer_name: 'Maria Costa', customer_phone: '27988776655',
    customer_address: 'Av. Central, 456 - Centro', status: 'preparing',
    payment_method: 'dinheiro', total: 220, delivery_fee: 8,
    items: [{ product_name: 'Uwell Caliburn G3', quantity: 1, total: 180 }, { product_name: 'Coil Uwell UN2', quantity: 1, total: 25 }],
    created_at: new Date(Date.now() - 20 * 60000).toISOString(),
  },
  {
    id: '3', order_number: 3, customer_name: 'Pedro Souza', customer_phone: '27977665544',
    customer_address: 'Rua Mares, 789 - Praia Grande', status: 'delivering',
    payment_method: 'pix', total: 89, delivery_fee: 12,
    items: [{ product_name: 'Elf Bar Pi 9000', quantity: 1, total: 89 }],
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
]

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ElementType; next: OrderStatus | null; action: string }> = {
  pending: { label: 'Novo pedido', color: '#f59e0b', bg: '#f59e0b15', icon: Clock, next: 'accepted', action: 'Aceitar pedido' },
  accepted: { label: 'Aceito', color: '#06b6d4', bg: '#06b6d415', icon: CheckCircle, next: 'preparing', action: 'Iniciar preparo' },
  preparing: { label: 'Preparando', color: '#7c3aed', bg: '#7c3aed15', icon: ChefHat, next: 'ready', action: 'Marcar como pronto' },
  ready: { label: 'Pronto', color: '#10b981', bg: '#10b98115', icon: Package, next: 'delivering', action: 'Saiu para entrega' },
  delivering: { label: 'Em entrega', color: '#06b6d4', bg: '#06b6d415', icon: Bike, next: 'delivered', action: 'Confirmar entrega' },
  delivered: { label: 'Entregue', color: '#10b981', bg: '#10b98115', icon: Star, next: null, action: '' },
  cancelled: { label: 'Cancelado', color: '#ef4444', bg: '#ef444415', icon: X, next: null, action: '' },
}

function OrderCard({ order, selected, onClick }: { order: DeliveryOrder; selected: boolean; onClick: () => void }) {
  const cfg = STATUS_CONFIG[order.status]
  const Icon = cfg.icon
  const elapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${selected ? 'border-kurmo-accent bg-kurmo-accentGlow' : 'border-kurmo-border bg-kurmo-card hover:border-kurmo-accent/40'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs font-mono text-kurmo-muted">{orderNumber(order.order_number)}</span>
          <p className="font-semibold text-kurmo-text text-sm">{order.customer_name}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium" style={{ color: cfg.color, background: cfg.bg }}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-kurmo-muted flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {elapsed}min atrás
        </span>
        <span className="text-sm font-bold font-mono text-kurmo-accentLight">{currency(order.total)}</span>
      </div>
    </button>
  )
}

export default function DeliveryPage() {
  const [orders, setOrders] = useState(MOCK_ORDERS)
  const [selected, setSelected] = useState<DeliveryOrder | null>(MOCK_ORDERS[0])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  const filtered = orders.filter(o => filter === 'all' || o.status === filter)
  const pending = orders.filter(o => o.status === 'pending').length

  const advanceStatus = (order: DeliveryOrder) => {
    const cfg = STATUS_CONFIG[order.status]
    if (!cfg.next) return
    const updated = orders.map(o => o.id === order.id ? { ...o, status: cfg.next! } : o)
    setOrders(updated)
    const updatedOrder = updated.find(o => o.id === order.id)!
    setSelected(updatedOrder)
    toast.success(`Pedido ${orderNumber(order.order_number)}: ${STATUS_CONFIG[cfg.next].label}`, { icon: '✅' })
    // In production: sendWhatsApp(order.customer_phone, buildOrderMessage(...))
  }

  const cancelOrder = (order: DeliveryOrder) => {
    const updated = orders.map(o => o.id === order.id ? { ...o, status: 'cancelled' as OrderStatus } : o)
    setOrders(updated)
    setSelected(null)
    toast.error(`Pedido ${orderNumber(order.order_number)} cancelado`)
  }

  const cfg = selected ? STATUS_CONFIG[selected.status] : null

  return (
    <div className="flex h-full bg-kurmo-bg">
      {/* Sidebar */}
      <div className="w-[300px] flex flex-col h-full border-r border-kurmo-border bg-kurmo-surface">
        <div className="px-5 py-4 border-b border-kurmo-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-kurmo-text text-lg">Delivery</h1>
              {pending > 0 && (
                <span className="w-5 h-5 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center font-bold animate-pulse">
                  {pending}
                </span>
              )}
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-kurmo-accent hover:bg-violet-500 text-white text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Novo
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {(['all', 'pending', 'preparing', 'delivering'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-kurmo-accent text-white' : 'bg-kurmo-card text-kurmo-muted hover:text-kurmo-text border border-kurmo-border'}`}
              >
                {f === 'all' ? 'Todos' : STATUS_CONFIG[f].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-kurmo-muted">
              <Package className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Nenhum pedido</p>
            </div>
          ) : (
            filtered.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                selected={selected?.id === order.id}
                onClick={() => setSelected(order)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selected && cfg ? (
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="px-8 py-5 border-b border-kurmo-border bg-kurmo-surface sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-kurmo-muted">{orderNumber(selected.order_number)}</span>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium" style={{ color: cfg.color, background: cfg.bg }}>
                    <cfg.icon className="w-4 h-4" />
                    {cfg.label}
                  </div>
                </div>
                <h2 className="font-display font-bold text-xl text-kurmo-text mt-1">{selected.customer_name}</h2>
              </div>
              <div className="flex gap-3">
                {cfg.next && (
                  <button
                    onClick={() => advanceStatus(selected)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm transition-all hover:scale-105 active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${cfg.color}, ${STATUS_CONFIG[cfg.next].color})` }}
                  >
                    <ChevronRight className="w-4 h-4" />
                    {cfg.action}
                  </button>
                )}
                {selected.status !== 'delivered' && selected.status !== 'cancelled' && (
                  <button
                    onClick={() => cancelOrder(selected)}
                    className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all text-sm"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 grid grid-cols-2 gap-6">
            {/* Customer info */}
            <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
              <h3 className="font-semibold text-kurmo-text mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4 text-kurmo-accentLight" /> Cliente
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-kurmo-muted">Nome</p>
                  <p className="font-medium text-kurmo-text">{selected.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-kurmo-muted">WhatsApp</p>
                  <a href={`https://wa.me/55${selected.customer_phone}`} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-green-400 hover:text-green-300 transition-colors flex items-center gap-1">
                    {selected.customer_phone}
                    <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                <div>
                  <p className="text-xs text-kurmo-muted">Endereço</p>
                  <p className="font-medium text-kurmo-text flex items-start gap-1">
                    <MapPin className="w-4 h-4 text-kurmo-muted flex-shrink-0 mt-0.5" />
                    {selected.customer_address}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
              <h3 className="font-semibold text-kurmo-text mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-kurmo-accentLight" /> Pagamento
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-kurmo-muted text-sm">Método</span>
                  <span className="font-medium text-kurmo-text capitalize">{selected.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-kurmo-muted text-sm">Taxa entrega</span>
                  <span className="font-medium text-kurmo-text">{currency(selected.delivery_fee)}</span>
                </div>
                <div className="flex justify-between border-t border-kurmo-border pt-3">
                  <span className="font-semibold text-kurmo-text">Total</span>
                  <span className="font-bold font-mono text-xl text-gradient">{currency(selected.total)}</span>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="col-span-2 bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
              <h3 className="font-semibold text-kurmo-text mb-4">Itens do pedido</h3>
              <div className="space-y-2">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-kurmo-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-kurmo-surface text-kurmo-muted text-xs flex items-center justify-center font-mono">{item.quantity}x</span>
                      <span className="text-kurmo-text text-sm">{item.product_name}</span>
                    </div>
                    <span className="font-mono text-sm font-medium text-kurmo-accentLight">{currency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Timeline */}
            <div className="col-span-2 bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
              <h3 className="font-semibold text-kurmo-text mb-4">Progresso do pedido</h3>
              <div className="flex items-center gap-0">
                {(['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered'] as OrderStatus[]).map((s, i, arr) => {
                  const sCfg = STATUS_CONFIG[s]
                  const Icon = sCfg.icon
                  const statuses: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered']
                  const currentIdx = statuses.indexOf(selected.status)
                  const thisIdx = statuses.indexOf(s)
                  const isDone = thisIdx <= currentIdx
                  const isActive = s === selected.status

                  return (
                    <div key={s} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isActive ? 'scale-110' : ''}`}
                          style={isDone ? { background: sCfg.color + '33', border: `2px solid ${sCfg.color}` } : { background: '#1e1e2e', border: '2px solid #1e1e2e' }}
                        >
                          <Icon className="w-4 h-4" style={{ color: isDone ? sCfg.color : '#64748b' }} />
                        </div>
                        <span className="text-[10px] text-kurmo-muted mt-1 whitespace-nowrap">{sCfg.label}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <div className="flex-1 h-0.5 mx-1 mb-4" style={{ background: thisIdx < currentIdx ? sCfg.color : '#1e1e2e' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-kurmo-muted">
          <Package className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-medium">Selecione um pedido</p>
          <p className="text-sm mt-1 opacity-60">para ver os detalhes</p>
        </div>
      )}
    </div>
  )
}
