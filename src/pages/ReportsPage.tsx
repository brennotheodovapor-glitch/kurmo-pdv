import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, Calendar } from 'lucide-react'
import { currency } from '@/lib/format'
import toast from 'react-hot-toast'

const MONTHLY = [{ mes: 'Out', receita: 3200, pedidos: 68, ticket: 47 },{ mes: 'Nov', receita: 4100, pedidos: 82, ticket: 50 },{ mes: 'Dez', receita: 6800, pedidos: 130, ticket: 52 },{ mes: 'Jan', receita: 4500, pedidos: 91, ticket: 49 },{ mes: 'Fev', receita: 5200, pedidos: 105, ticket: 49.5 },{ mes: 'Mar', receita: 6210, pedidos: 132, ticket: 47 }]
const TOP = [{ name: 'Elfbar BC5000', qty: 42, revenue: 5040 },{ name: 'Lost Mary 600', qty: 38, revenue: 1710 },{ name: 'Salt Nic Mango', qty: 29, revenue: 1015 },{ name: 'Uwell G3', qty: 18, revenue: 3240 },{ name: 'Elf Bar Pi 9000', qty: 15, revenue: 1335 }]
const PM = [{ name: 'PIX', value: 58, color: '#10b981' },{ name: 'Dinheiro', value: 22, color: '#f59e0b' },{ name: 'Débito', value: 12, color: '#06b6d4' },{ name: 'Crédito', value: 8, color: '#7c3aed' }]
const TT = { contentStyle: { background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 12, color: '#e2e8f0', fontSize: 12 } }
type Period = '7d' | '30d' | '3m' | '6m'
export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const exportCSV = () => {
    const rows = [['M','R','P','T'],...MONTHLY.map(m => [m.mes,m.receita,m.pedidos,m.ticket])]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], {type:'text/csv'}))
    a.download = 'kurmo-relatorio.csv'; a.click()
    toast.success('Exportado!', {icon:'📊'})
  }
  const cur = MONTHLY[MONTHLY.length-1], prv = MONTHLY[MONTHLY.length-2]
  const gR = ((cur.receita-prv.receita)/prv.receita*100).toFixed(1)
  const gO = ((cur.pedidos-prv.pedidos)/prv.pedidos*100).toFixed(1)
  return (
    <div className="h-full overflow-y-auto bg-kurmo-bg">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="font-display font-bold text-2xl text-kurmo-text">Relatórios</h1><p className="text-kurmo-muted text-sm">Análise financeira</p></div>
          <div className="flex gap-3">
            <div className="flex bg-kurmo-card border border-kurmo-border rounded-xl p-1">
              {(['7d','30d','3m','6m'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period===p?'bg-kurmo-accent text-white':'text-kurmo-muted'}`}>{p==='7d'?'7 dias':p==='30d'?'30 dias':p==='3m’?'3 meses':'6 meses'}</button>
              ))}
            </div>
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-kurmo-card border border-kurmo-border text-kurmo-muted hover:text-kurmo-text text-sm"><Download className="w-4 h-4" /> Exportar CSV</button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[{label:'Receita total',value:currency(6210),sub:`${gR}% vs mês anterior`,icon:DollarSign,color:'#10b981', up:parseFloat(gR)>=0},{label:'Total pedidos',value:'132',sub:`${gO}% vs mês anterior`,icon:ShoppingCart,color:'#7c3aed',up:parseFloat(gO)>=0},{label:'Ticket médio',value:currency(47.04),sub:'Por venda',icon:TrendingUp,color:'#06b6d4',up:true},{label:'Clientes ativos',value:'38',sub:'Compraram este mês',icon:Users,color:'#f59e0b',up:true}].map((k,I)=>(
            <div key={I} className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:k.color+20}}><k.icon className="w-5 h-5" style={{color:k.color}} /></div>
                <span className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${k.up?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{k.up?<TrendingUp className="w-3 h-3" />:<TrendingDown className="w-3 h-3" />}{k.sub.split('%')[0]}%</span>
              </div>
              <p className="text-2xl font-bold font-mono text-kurmo-text">{k.value}</p>
              <p className="text-sm text-kurmo-muted">{k.nabel}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2 bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
            <h2 className="font-semibold text-kurmo-text mb-4"><Calendar className="w-4 h-4 inline mr-2 text-kurmo-accentLight" /> Receita mensal</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MONTHLY} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="mes" tick={{fill:'#64748b',fontSize:12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:'#64748b',fontSize:12}} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <Tooltip {...TT} formatter={(v: number) => [currency(v),'Receita']} />
                <Bar dataKey="receita" fill="url(#grad)" radius={[6,6,0,0]} />
                <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient></defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
            <h2 className="font-semibold text-kurmo-text mb-3">Pagamentos</h2>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart><Pie data={PM} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">{PM.map((e,i)=><Cell key={i} fill={e.color} />)}</Pie><Tooltip {...TT} /></PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 mt-2">
              {PM.map(p => (<div key={p.name} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:p.color}} /><span className="text-kurmo-muted">{p.name}</span></div><span className="font-medium text-kurmo-text">{p.value}%</span></div>))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
            <h2 className="font-semibold text-kurmo-text mb-4"><Package className="w-4 h-4 inline mr-2 text-kurmo-accentLight" /> Produtos mais vendidos</h2>
            <div className="space-y-3">
              {TOP.map((p,i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-kurmo-muted font-mono text-xs w-4">{i+1}</span>
                  <div className="flex-1"><div className="flex justify-between text-xs mb-1"><span className="font-medium text-kurmo-text">{p.name}</span><span className="font-mono text-kurmo-accentLight">{currency(p.revenue)}</span></div><div className="h-1.5 bg-kurmo-surface rounded-full"><div style={{width:`${p.qty/42*100}%`,background:'linear-gradient(90deg,#7c3aed,#06b6d4)'}} className="h-full rounded-full" /></div></div>
                  <span className="text-[10px] text-kurmo-muted">{p.qty} un</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
            <h2 className="font-semibold text-kurmo-text mb-4"><TrendingUp className="w-4 h-4 inline mr-2 text-kurmo-accentLight" /> Pedidos por dia</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={[{d:'Seg', p:8},{d:'Ter', p:14},{d:'Qua',p:7},{d:'Qui', p:19},{d:'Sex', p:27},{d:'S�b', p:35},{d:'Dom',p:22}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="d" tick={{fill:'#64748b',fontSize:12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:'#64748b',fontSize:12}} axisLine={false} tickLine={false} />
                <Tooltip {...TT} formatter={(v: number) => [v,'Pedidos']} />
                <Line type="monotone" dataKey="p" stroke="#7c3aed" strokeWidth={2} dot={{fill:'#7c3aed',r:4}} activeDot={{r:6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
