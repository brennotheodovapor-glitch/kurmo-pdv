import { useState } from 'react'
import { Search, Filter, Download, Eye, TrendingUp, ChevronDown, X } from 'lucide-react'
import { currency, datetime, orderNumber } from '@/lib/format'

type Sale = {
  id: string; order_number: number; customer_name: string | null
  type: 'pdv' | 'delivery'; payment_method: string
  total: number; items_count: number; created_at: string
  status: 'completed' | 'cancelled'
}

const MOCK_SALES: Sale[] = [
  { id: '1', order_number: 132, customer_name: 'João Silva', type: 'delivery', payment_method: 'pix', total: 175, items_count: 2, created_at: new Date(Date.now() - 30 * 60000).toISOString(), status: 'completed' },
  { id: '2', order_number: 131, customer_name: null, type: 'pdv', payment_method: 'dinheiro', total: 45, items_count: 1, created_at: new Date(Date.now() - 2 * 3600000).toISOString(), status: 'completed' },
  { id: '3', order_number: 130, customer_name: 'Maria Costa', type: 'delivery', payment_method: 'cartao_credito', total: 220, items_count: 3, created_at: new Date(Date.now() - 3 * 3600000).toISOString(), status: 'completed' },
  { id: '4', order_number: 129, customer_name: null, type: 'pdv', payment_method: 'pix', total: 120, items_count: 1, created_at: new Date(Date.now() - 5 * 3600000).toISOString(), status: 'completed' },
  { id: '5', order_number: 128, customer_name: 'Pedro Souza', type: 'delivery', payment_method: 'pix', total: 89, items_count: 1, created_at: new Date(Date.now() - 6 * 3600000).toISOString(), status: 'cancelled' },
  { id: '6', order_number: 127, customer_name: null, type: 'pdv', payment_method: 'cartao_debito', total: 55, items_count: 1, created_at: new Date(Date.now() - 7 * 3600000).toISOString(), status: 'completed' },
  { id: '7', order_number: 126, customer_name: null, type: 'pdv', payment_method: 'dinheiro', total: 35, items_count: 1, created_at: new Date(Date.now() - 8 * 3600000).toISOString(), status: 'completed' },
  { id: '8', order_number: 125, customer_name: 'Ana Lima', type: 'delivery', payment_method: 'pix', total: 310, items_count: 4, created_at: new Date(Date.now() - 24 * 3600000).toISOString(), status: 'completed' },
]

const PM_LABELS: Record<string, string> = {
  pix: 'PIX', dinheiro: 'Dinheiro',
  cartao_debito: 'Débito', cartao_credito: 'Crédito'
}

const PM_COLORS: Record<string, string> = {
  pix: '#10b981', dinheiro: '#f59e0b',
  cartao_debito: '#06b6d4', cartao_credito: '#7c3aed'
}

export default function HistoryPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'pdv' | 'delivery'>('all')

  const completed = MOCK_SALES.filter(s => s.status === 'completed')
  const totalRevenue = completed.reduce((s, o) => s + o.total, 0)
  const avgTicket = completed.length ? totalRevenue / completed.length : 0

  const filtered = MOCK_SALES.filter(s => {
    if (typeFilter !== 'all' && s.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return s.customer_name?.toLowerCase().includes(q) || String(s.order_number).includes(q) || s.total.toFixed(2).includes(q)
    }
    return true
  })

  return (
    <div className="h-full flex flex-col bg-kurmo-bg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-kurmo-border bg-kurmo-surface">
        <div className="flex items-center gap-4">
          <h1 className="font-display font-bold text-xl text-kurmo-text">Histórico</h1>
          <div className="flex gap-1">
            {(['all', 'pdv', 'delivery'] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === t ? 'bg-kurmo-accent text-white' : 'bg-kurmo-card border border-kurmo-border text-kurmo-muted hover:text-kurmo-text'}`}>
                {t === 'all' ? 'Todos' : t.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kurmo-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente, nº ou valor..."
              className="w-full bg-kurmo-card border border-kurmo-border rounded-xl pl-9 pr-4 py-2 text-sm text-kurmo-text placeholder:text-kurmo-muted focus:outline-none focus:border-kurmo-accent" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-kurmo-muted" /></button>}
          </div>
          <button className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl border border-kurmo-border text-kurmo-muted hover:text-kurmo-text hover:border-kurmo-accent/50 transition-all text-xs">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-3 border-b border-kurmo-border bg-kurmo-surface flex gap-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-xs text-kurmo-muted">Total hoje:</span>
          <span className="text-sm font-bold font-mono text-green-400">{currency(totalRevenue)}</span>
        </div>
        <div>
          <span className="text-xs text-kurmo-muted">Vendas: </span>
          <span className="text-sm font-bold text-kurmo-text">{completed.length}</span>
        </div>
        <div>
          <span className="text-xs text-kurmo-muted">Ticket médio: </span>
          <span className="text-sm font-bold font-mono text-kurmo-accentLight">{currency(avgTicket)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-kurmo-card border border-kurmo-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-kurmo-border">
                {['Pedido', 'Cliente', 'Canal', 'Pagamento', 'Itens', 'Total', 'Horário', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-kurmo-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(sale => (
                <tr key={sale.id} className={`border-b border-kurmo-border/50 hover:bg-kurmo-surface/50 transition-colors ${sale.status === 'cancelled' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-kurmo-muted">{orderNumber(sale.order_number)}</td>
                  <td className="px-4 py-3 text-sm text-kurmo-text">{sale.customer_name || <span className="text-kurmo-muted italic">Não identificado</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sale.type === 'pdv' ? 'bg-violet-500/15 text-violet-400' : 'bg-cyan-500/15 text-cyan-400'}`}>
                      {sale.type === 'pdv' ? 'PDV' : 'Delivery'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: PM_COLORS[sale.payment_method], background: PM_COLORS[sale.payment_method] + '20' }}>
                      {PM_LABELS[sale.payment_method]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-kurmo-muted">{sale.items_count} item{sale.items_count > 1 ? 's' : ''}</td>
                  <td className="px-4 py-3 font-mono font-bold text-sm text-kurmo-accentLight">{currency(sale.total)}</td>
                  <td className="px-4 py-3 text-xs text-kurmo-muted">{datetime(sale.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sale.status === 'completed' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {sale.status === 'completed' ? 'Concluída' : 'Cancelada'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 flex flex-col items-center text-kurmo-muted">
              <Search className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Nenhuma venda encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
