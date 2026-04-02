import { useState } from 'react'
import { Plus, Search, Package, Edit2, Trash2, AlertTriangle, X, Check } from 'lucide-react'
import { currency } from '@/lib/format'
import toast from 'react-hot-toast'

type Product = {
  id: string; name: string; price: number; cost_price: number
  stock: number; category: string; active: boolean; barcode?: string
}

const INITIAL: Product[] = [
  { id: '1', name: 'Lost Mary 600 Puffs', price: 45, cost_price: 20, stock: 30, category: 'Descartáveis', active: true },
  { id: '2', name: 'Elfbar BC5000', price: 120, cost_price: 60, stock: 15, category: 'Descartáveis', active: true },
  { id: '3', name: 'Uwell Caliburn G3', price: 180, cost_price: 90, stock: 8, category: 'Vapes', active: true },
  { id: '4', name: 'Vaporesso XROS 4', price: 220, cost_price: 110, stock: 2, category: 'Vapes', active: true },
  { id: '5', name: 'Salt Nic Mango 30ml', price: 35, cost_price: 15, stock: 50, category: 'Liquids', active: true },
  { id: '6', name: 'Freebase Blueberry 60ml', price: 55, cost_price: 25, stock: 20, category: 'Liquids', active: true },
  { id: '7', name: 'Coil Uwell UN2', price: 25, cost_price: 12, stock: 0, category: 'Acessórios', active: false },
  { id: '8', name: 'Pod Caliburn A3', price: 95, cost_price: 45, stock: 12, category: 'Pods', active: true },
]

const EMPTY: Omit<Product, 'id'> = { name: '', price: 0, cost_price: 0, stock: 0, category: 'Descartáveis', active: true }
const CATEGORIES = ['Vapes', 'Pods', 'Liquids', 'Acessórios', 'Descartáveis']

export default function ProductsPage() {
  const [products, setProducts] = useState(INITIAL)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY)

  const filtered = products.filter(p => {
    if (catFilter && p.category !== catFilter) return false
    if (search) return p.name.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, price: p.price, cost_price: p.cost_price, stock: p.stock, category: p.category, active: p.active }); setShowModal(true) }

  const save = () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return }
    if (editing) {
      setProducts(prev => prev.map(p => p.id === editing.id ? { ...p, ...form } : p))
      toast.success('Produto atualizado!')
    } else {
      setProducts(prev => [...prev, { ...form, id: crypto.randomUUID() }])
      toast.success('Produto cadastrado!', { icon: '📦' })
    }
    setShowModal(false)
  }

  const remove = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id))
    toast.success('Produto removido')
  }

  const margin = (p: Product) => p.price > 0 ? ((p.price - p.cost_price) / p.price * 100).toFixed(0) : '0'

  return (
    <div className="h-full flex flex-col bg-kurmo-bg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-kurmo-border bg-kurmo-surface flex items-center gap-4">
        <h1 className="font-display font-bold text-xl text-kurmo-text">Produtos</h1>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kurmo-muted" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full max-w-sm bg-kurmo-card border border-kurmo-border rounded-xl pl-9 pr-4 py-2 text-sm text-kurmo-text placeholder:text-kurmo-muted focus:outline-none focus:border-kurmo-accent"
          />
        </div>
        <div className="flex gap-2">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c === catFilter ? null : c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${catFilter === c ? 'bg-kurmo-accent text-white' : 'bg-kurmo-card border border-kurmo-border text-kurmo-muted hover:text-kurmo-text'}`}>
              {c}
            </button>
          ))}
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-kurmo-accent hover:bg-violet-500 text-white text-sm font-medium transition-all ml-auto">
          <Plus className="w-4 h-4" /> Novo produto
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-kurmo-card border border-kurmo-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-kurmo-border">
                {['Produto', 'Categoria', 'Preço', 'Custo', 'Margem', 'Estoque', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-kurmo-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-kurmo-border/50 hover:bg-kurmo-surface/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-kurmo-surface flex items-center justify-center text-sm">
                        {p.category === 'Descartáveis' ? '⚡' : p.category === 'Vapes' ? '💨' : p.category === 'Liquids' ? '💧' : p.category === 'Pods' ? '🔋' : '🔧'}
                      </div>
                      <span className="text-sm font-medium text-kurmo-text">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-kurmo-muted">{p.category}</td>
                  <td className="px-4 py-3 text-sm font-mono font-bold text-kurmo-accentLight">{currency(p.price)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-kurmo-muted">{currency(p.cost_price)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${parseInt(margin(p)) >= 40 ? 'bg-green-500/15 text-green-400' : parseInt(margin(p)) >= 25 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'}`}>
                      {margin(p)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs ${p.stock === 0 ? 'text-red-400' : p.stock <= 5 ? 'text-orange-400' : 'text-kurmo-muted'}`}>
                      {p.stock <= 5 && p.stock > 0 && <AlertTriangle className="w-3 h-3" />}
                      {p.stock} un
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.active ? 'bg-green-500/15 text-green-400' : 'bg-kurmo-surface text-kurmo-muted'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg flex items-center justify-center text-kurmo-muted hover:text-kurmo-accentLight hover:bg-kurmo-accentGlow transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => remove(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-kurmo-muted hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 flex flex-col items-center text-kurmo-muted">
              <Package className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-6 w-full max-w-md mx-4 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg text-kurmo-text">{editing ? 'Editar produto' : 'Novo produto'}</h2>
              <button onClick={() => setShowModal(false)} className="text-kurmo-muted hover:text-kurmo-text transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-kurmo-muted mb-1 block">Nome</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none focus:border-kurmo-accent" placeholder="Nome do produto" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-kurmo-muted mb-1 block">Preço de venda</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none focus:border-kurmo-accent" />
                </div>
                <div>
                  <label className="text-xs text-kurmo-muted mb-1 block">Preço de custo</label>
                  <input type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none focus:border-kurmo-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-kurmo-muted mb-1 block">Estoque</label>
                  <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none focus:border-kurmo-accent" />
                </div>
                <div>
                  <label className="text-xs text-kurmo-muted mb-1 block">Categoria</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none focus:border-kurmo-accent">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={`w-10 h-6 rounded-full relative transition-colors ${form.active ? 'bg-kurmo-accent' : 'bg-kurmo-surface border border-kurmo-border'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.active ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm text-kurmo-muted">Produto ativo</span>
              </label>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-kurmo-border text-kurmo-muted hover:text-kurmo-text transition-colors text-sm">
                  Cancelar
                </button>
                <button onClick={save}
                  className="flex-1 py-2.5 rounded-xl bg-kurmo-accent hover:bg-violet-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
