import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, ShoppingCart, Package, DollarSign, ArrowUpRight, ArrowDownRight, Zap, Clock } from 'lucide-react'
import { currency } from '@/lib/format'

const salesData = [
  { day: 'Seg', vendas: 420, pedidos: 8 },
  { day: 'Ter', vendas: 680, pedidos: 14 },
  { day: 'Qua', vendas: 320, pedidos: 7 },
  { day: 'Qui', vendas: 890, pedidos: 19 },
  { day: 'Sex', vendas: 1240, pedidos: 27 },
  { day: 'Sab', vendas: 1680, pedidos: 35 },
  { day: 'Dom', vendas: 980, pedidos: 22 },
]

const topProducts = [
  { name: 'Elfbar BC5000', sales: 42, revenue: 5040 },
  { name: 'Lost Mary 600', sales: 38, revenue: 1710 },
  { name: 'Salt Nic Mango', sales: 29, revenue: 1015 },
  { name: 'Uwell Caliburn', sales: 18, revenue: 3240 },
  { name: 'Elf Bar Pi 9000', sales: 15, revenue: 1335 },
]

const paymentData = [
  { name: 'PIX', value: 58, color: '#10b981' },
  { name: 'Dinheiro', value: 22, color: '#f59e0b' },
  { name: 'Débito', value: 12, color: '#06b6d4' },
  { name: 'Crédito', value: 8, color: '#7c3aed' },
]

const TOOLTIP_STYLE = {
  contentStyle: { background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 12, color: '#e2e8f0', fontFamily: 'DM Sans' },
  itemStyle: { color: '#a78bfa' },
  labelStyle: { color: '#64748b' },
}

function StatCard({ label, value, sub, trend, icon: Icon, color }: any) {
  const isUp = trend >= 0
  return (
    <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${isUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold font-mono text-kurmo-text">{value}</p>
        <p className="text-sm text-kurmo-muted mt-0.5">{label}</p>
        {sub && <p className="text-xs text-kurmo-muted mt-1 opacity-70">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="h-full overflow-y-auto bg-kurmo-bg">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-kurmo-text">Dashboard</h1>
            <p className="text-kurmo-muted text-sm mt-0.5">Visão geral dos últimos 7 dias</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-kurmo-card border border-kurmo-border text-sm text-kurmo-muted">
            <Clock className="w-4 h-4" />
            Últimos 7 dias
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Faturamento" value={currency(6210)} sub="Este período" trend={12.4} icon={DollarSign} color="#10b981" />
          <StatCard label="Pedidos" value="132" sub="PDV + Delivery" trend={8.2} icon={ShoppingCart} color="#7c3aed" />
          <StatCard label="Ticket médio" value={currency(47.04)} sub="Por venda" trend={3.1} icon={TrendingUp} color="#06b6d4" />
          <StatCard label="Produtos" sub="Em estoque" value="47" trend={-2} icon={Package} color="#f59e0b" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Sales chart */}
          <div className="col-span-2 bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
            <h2 className="font-semibold text-kurmo-text mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-kurmo-accentLight" /> Vendas por dia
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salesData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [currency(v), 'Vendas']} />
                <Bar dataKey="vendas" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Payment pie */}
          <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
            <h2 className="font-semibold text-kurmo-text mb-4">Formas de pagamento</h2>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {paymentData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 12, fontFamily: 'DM Sans', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 mt-2">
              {paymentData.map(p => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-kurmo-muted">{p.name}</span>
                  </div>
                  <span className="font-medium text-kurmo-text">{p.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
          <h2 className="font-semibold text-kurmo-text mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-kurmo-accentLight" /> Produtos mais vendidos
          </h2>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-4">
                <span className="text-kurmo-muted font-mono text-sm w-5">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-kurmo-text">{p.name}</span>
                    <span className="text-sm font-mono font-bold text-kurmo-accentLight">{currency(p.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-kurmo-surface rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(p.sales / 42) * 100}%`, background: `linear-gradient(90deg, #7c3aed, #06b6d4)` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-kurmo-muted w-12 text-right">{p.sales} un</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
