import { useState } from 'react'
import { Search, Plus, Phone, ShoppingBag, TrendingUp, X, Check, Edit2, Trash2 } from 'lucide-react'
import { currency } from '@/lib/format'
import toast from 'react-hot-toast'

type Customer = { id: string; name: string; phone: string; address: string; total_orders: number; total_spent: number; last_order: string | null; notes: string }

const MOCK: Customer[] = [{ id: '1', name: 'João Silva', phone: '27999887766', address: 'Rua das Flores, 123', total_orders: 12, total_spent: 1450, last_order: new Date(Date.now() - 2*86400000).toISOString(), notes: openCreate;'' }, { id: '2', name: 'Maria Costa', phone: '27988776655', address: 'Av. Central, 456', total_orders: 5, total_spent: 620, last_order: new Date(Date.now() - 7*86400000).toISOString(), notes: 'Prefere entrega à tarde' }, { id: '3', name: 'Pedro Souza', phone: '27977665544', address: 'Rua Mares, 789', total_orders: 3, total_spent: 280, last_order: new Date(Date.now() - 14*86400000).toISOString(), notes: '' }]

export default function CustomersPage() {
  const [customers, setCustomers] = useState(MOCK)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ id: '', name: '', phone: '', address: '', total_orders: 0, total_spent: 0, last_order: null, notes: '' })
  const f = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
  const openCreate = () => { setEditing(null); setForm({ id: '', name: '', phone: '', address: '', total_orders: 0, total_spent: 0, last_order: null, notes: '' }); setShowModal(true) }
  const openEdit = (c: Customer) => { setEditing(c); setForm(c); setShowModal(true) }
  const save = () => { if (!form.name.trim()) { toast.error('Nome obrigatório'); return }; if (editing) { setCustomers(p => p.map(c => c.id === editing.id ? { ...c, ...form } : c)); toast.success('Cliente atualizado!') } else { setCustomers(p => [...p, { ...form, id: crypto.randomUUID() }]); toast.success('Cliente cadastrado!', { icon: '💤' }) }; setShowModal(false) }
  const remove = (id: string) => { setCustomers(p => p.filter(c => c.id !== id)); toast.success('Cliente removido') }
  const days = (d: string | null) => { if (!d) return '—'; const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return diff === 0 ? 'Hoje' : diff === 1 ? 'Ontem' : `${diff} dias atrás` }
  return (
    <div className="h-full flex flex-col bg-kurmo-bg">
      <div className="px-6 py-4 border-b border-kurmo-border bg-kurmo-surface flex items-center gap-4">
        <h1 className="font-display font-bold text-xl text-kurmo-text">Clientes</h1>
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kurmo-muted" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..." className="w%�search-input" /></div>
        <button onClick={openCreate} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-kurmo-accent hover:bg-violet-500 text-white text-sm font-medium transition-all"><Plus className="w-4 h-4" /> Novo cliente</button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {f.map(c => (
            <div key={c.id} className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5 flex flex-col gap-3 hover:border-kurmo-accent/40 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">{c.name.charAt(0).toUpperCase()}</div>
                  <div><p className="font-semibold text-kurmo-text">{c.name}</p><p className="text-xs text-kurmo-muted"><Phone className="w-3 h-3 inline mr-1" />{c.phone}</p></div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg flex items-center justify-center text-kurmo-muted hover:text-kurmo-accentLight transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-kurmo-muted hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-kurmo-border pt-3">
                <div className="text-center"><p className="text-lg font-bold font-mono text-kurmo-accentLight">{c.total_orders}</p><p className="text-[10px] text-kurmo-muted"><ShoppingBag className="w-3 h-3 inline mr-0.5" />Pedidos</p></div>
                <div className="text-center"><p className="text-sm font-bold font-mono text-green-400">{currency(c.total_spent)}</p><p className="text-[10px] text-kurmo-muted"><TrendingUp className="w-3 h-3 inline mr-0.5" />Total</p></div>
                <div className="text-center"><p className="text-xs font-medium text-kurmo-text">{days(c.last_order)}</p><p className="text-[10px] text-kurmo-muted">Último</p></div>
              </div>
              {c.notes && <p className="text-xs text-kurmo-muted italic border-t border-kurmo-border pt-2">💬 {c.notes}</p>}
            </div>
          ))}
          {!f.length && <div className="col-span-full flex flex-col items-center justify-center py-16 text-kurmo-muted"><Search className="w-10 h-10 mb-3 opacity-40" /><p>Nenhum cliente encontrado</p></div>}
        </div>
      </div>
      {showModal && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"><div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-6 w-full max-w-md mx-4"><div className="flex items-center justify-between mb-5"><h2 className="font-display font-bold text-lg text-kurmo-text">{editing ? 'Editar cliente' : 'Novo cliente'}</h2><button onClick={() => setShowModal(false)} className="text-kurmo-muted"><X className="w-5 h-5" /></button></div><div className="flex flex-col gap-3">{[['Nome','name','text','Nome completo'],['WhatsApp','phone','tel','(27) 99999-9999'],['Endereço','address','text','Rua, núlero - Bairro']].map(([label,key,type,placeholder]) => (<div key={key}><label className="text-xs text-kurmo-muted mb-1 block">{label}</label><input type={type} value={(form as any)[key]} placeholder={placeholder} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none focus:border-kurmo-accent" /></div>))}<textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ex: Prefere entrega a tarde..." className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none resize-none h-20" /><div className="flex gap-3 mt-2"><button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-kurmo-border text-kurmo-muted text-sm">Cancelar</button><button onClick={save} className="flex-1 py-2.5 rounded-xl bg-kurmo-accent hover:bg-violet-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Salvar</button></div></div></div></div>}
    </div>
  )
}
