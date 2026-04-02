import { useState, useCallback, useEffect } from 'react'
import { Search, X, Plus, Minus, Trash2, ShoppingBag, Tag, User, MessageSquare, Percent, DollarSign, CreditCard, Banknote, QrCode, Zap } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { currency } from '@/lib/format'
import { supabase, type Product, type Category } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'Vapes', color: '#7c3aed', icon: '💨' },
  { id: '2', name: 'Pods', color: '#06b6d4', icon: '🔋' },
  { id: '3', name: 'Liquids', color: '#10b981', icon: '💧' },
  { id: '4', name: 'Acessórios', color: '#f59e0b', icon: '🔧' },
  { id: '5', name: 'Descartáveis', color: '#ef4444', icon: '⚡' },
]

const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Lost Mary 600 Puffs', price: 45, cost_price: 20, stock: 30, category_id: '5', image_url: null, barcode: null, active: true, created_at: '' },
  { id: '2', name: 'Elfbar BC5000', price: 120, cost_price: 60, stock: 15, category_id: '5', image_url: null, barcode: null, active: true, created_at: '' },
  { id: '3', name: 'Uwell Caliburn G3', price: 180, cost_price: 90, stock: 8, category_id: '1', image_url: null, barcode: null, active: true, created_at: '' },
  { id: '4', name: 'Vaporesso XROS 4', price: 220, cost_price: 110, stock: 5, category_id: '1', image_url: null, barcode: null, active: true, created_at: '' },
  { id: '5', name: 'Salt Nic Mango 30ml', price: 35, cost_price: 15, stock: 50, category_id: '3', image_url: null, barcode: null, active: true, created_at: '' },
  { id: '6', name: 'Freebase Blueberry 60ml', price: 55, cost_price: 25, stock: 20, category_id: '3', image_url: null, barcode: null, active: true, created_at: '' },
  { id: '7', name: 'Coil Uwell UN2', price: 25, cost_price: 12, stock: 40, category_id: '4', image_url: null, barcode: null, active: true, created_at: '' },
  { id: '8', name: 'Pod Caliburn A3', price: 95, cost_price: 45, stock: 12, category_id: '2', image_url: null, barcode: null, active: true, created_at: '' },
  { id: '9', name: 'Smok Nord 5', price: 199, cost_price: 95, stock: 7, category_id: '1', image_url: null, barcode: null, active: true, created_at: '' },
  { id: '10', name: 'Ice Blast Menthol 35ml', price: 38, cost_price: 18, stock: 35, category_id: '3', image_url: null, barcode: null, active: true, created_at: '' },
  { id: '11', name: 'Geek Vape Aegis Hero 2', price: 250, cost_price: 130, stock: 4, category_id: '1', image_url: null, barcode: null, active: true, created_at: '' },
  { id: '12', name: 'Elf Bar Pi 9000', price: 89, cost_price: 40, stock: 22, category_id: '5', image_url: null, barcode: null, active: true, created_at: '' },
]

const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX', icon: QrCode, color: '#10b981' },
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: '#f59e0b' },
  { id: 'cartao_debito', label: 'Débito', icon: CreditCard, color: '#06b6d4' },
  { id: 'cartao_credito', label: 'Crédito', icon: CreditCard, color: '#7c3aed' },
]

function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const colors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
  const color = colors[parseInt(product.id) % colors.length]
  const emoji = ['💨', '🔋', '💧', '⚡', '🌿', '❄️', '🍭', '🔥'][parseInt(product.id) % 8]

  return (
    <button
      onClick={() => onAdd(product)}
      className="group relative bg-kurmo-card border border-kurmo-border rounded-2xl p-4 text-left hover:border-opacity-60 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] flex flex-col gap-2"
      style={{ '--hover-color': color } as React.CSSProperties}
    >
      {/* Stock badge */}
      {product.stock <= 5 && (
        <div className="absolute top-2 right-2 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 font-medium">
          {product.stock === 0 ? 'Sem estoque' : `${product.stock} restantes`}
        </div>
      )}

      {/* Product image / emoji */}
      <div
        className="w-full h-16 rounded-xl flex items-center justify-center text-2xl mb-1 transition-all"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        {emoji}
      </div>

      <div className="text-xs font-medium text-kurmo-text leading-tight">{product.name}</div>
      <div className="text-kurmo-accentLight font-bold font-mono text-sm">{currency(product.price)}</div>

      {/* Add overlay */}
      <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 rounded-full bg-kurmo-accent flex items-center justify-center">
          <Plus className="w-5 h-5 text-white" />
        </div>
      </div>
    </button>
  )
}

export default function PDVPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showDiscount, setShowDiscount] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  const [showCustomer, setShowCustomer] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [showNotes, setShowNotes] = useState(false)

  const cart = useCartStore()

  const products = MOCK_PRODUCTS.filter(p => {
    if (!p.active) return false
    if (activeCategory && p.category_id !== activeCategory) return false
    if (search) return p.name.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const handleAddProduct = useCallback((p: Product) => {
    cart.addItem({ id: p.id, name: p.name, price: p.price })
    toast.success(`${p.name} adicionado`, { duration: 1000, icon: '🛒' })
  }, [cart])

  const handleFinalize = async () => {
    if (cart.items.length === 0) { toast.error('Carrinho vazio'); return }
    if (!cart.paymentMethod) { toast.error('Selecione forma de pagamento'); return }

    // In production, save to Supabase here
    toast.success('Venda finalizada com sucesso!', { icon: '🎉', duration: 3000 })
    cart.clearCart()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') document.getElementById('pdv-search')?.focus()
      if (e.key === 'F10') handleFinalize()
      if (e.key === 'Escape') setSearch('')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cart])

  const subtotal = cart.getSubtotal()
  const total = cart.getTotal()
  const discount = subtotal - total

  return (
    <div className="flex h-full bg-kurmo-bg">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-kurmo-border">
        {/* Header */}
        <div className="px-6 py-4 border-b border-kurmo-border bg-kurmo-surface">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kurmo-muted" />
              <input
                id="pdv-search"
                type="text"
                placeholder="Buscar produto... (F2)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-kurmo-card border border-kurmo-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-kurmo-text placeholder:text-kurmo-muted focus:outline-none focus:border-kurmo-accent transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-kurmo-muted hover:text-kurmo-text" />
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!activeCategory ? 'bg-kurmo-accent text-white' : 'bg-kurmo-card text-kurmo-muted hover:text-kurmo-text border border-kurmo-border'}`}
            >
              Todos
            </button>
            {MOCK_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${cat.id === activeCategory ? 'text-white border' : 'bg-kurmo-card text-kurmo-muted hover:text-kurmo-text border border-kurmo-border'}`}
                style={cat.id === activeCategory ? { background: cat.color, borderColor: cat.color } : {}}
              >
                <span>{cat.icon}</span>{cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {products.map(p => (
              <ProductCard key={p.id} product={p} onAdd={handleAddProduct} />
            ))}
            {products.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-kurmo-muted">
                <Search className="w-10 h-10 mb-3 opacity-40" />
                <p>Nenhum produto encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-[340px] flex flex-col h-full bg-kurmo-surface">
        {/* Cart Header */}
        <div className="px-5 py-4 border-b border-kurmo-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-kurmo-accentLight" />
            <span className="font-semibold text-kurmo-text font-display">Carrinho</span>
            {cart.items.length > 0 && (
              <span className="w-5 h-5 bg-kurmo-accent rounded-full text-white text-xs flex items-center justify-center font-bold">
                {cart.items.length}
              </span>
            )}
          </div>
          {cart.items.length > 0 && (
            <button onClick={cart.clearCart} className="text-kurmo-muted hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Customer */}
        <div className="px-5 py-3 border-b border-kurmo-border">
          {cart.customerName ? (
            <div className="flex items-center gap-2 bg-kurmo-accentGlow border border-kurmo-accent/30 rounded-xl px-3 py-2">
              <User className="w-4 h-4 text-kurmo-accentLight" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-kurmo-text truncate">{cart.customerName}</p>
                {cart.customerPhone && <p className="text-xs text-kurmo-muted">{cart.customerPhone}</p>}
              </div>
              <button onClick={() => { cart.setCustomer('', ''); setNameInput(''); setPhoneInput('') }}>
                <X className="w-3 h-3 text-kurmo-muted" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomer(!showCustomer)}
              className="w-full flex items-center gap-2 text-kurmo-muted hover:text-kurmo-accentLight transition-colors text-sm"
            >
              <User className="w-4 h-4" />
              <span>+ Adicionar cliente</span>
            </button>
          )}
          {showCustomer && !cart.customerName && (
            <div className="mt-2 flex flex-col gap-2 animate-slide-up">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Nome do cliente"
                className="bg-kurmo-card border border-kurmo-border rounded-xl px-3 py-2 text-sm text-kurmo-text placeholder:text-kurmo-muted focus:outline-none focus:border-kurmo-accent w-full"
              />
              <input
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="WhatsApp (opcional)"
                className="bg-kurmo-card border border-kurmo-border rounded-xl px-3 py-2 text-sm text-kurmo-text placeholder:text-kurmo-muted focus:outline-none focus:border-kurmo-accent w-full"
              />
              <button
                onClick={() => { cart.setCustomer(nameInput, phoneInput); setShowCustomer(false) }}
                className="bg-kurmo-accent hover:bg-violet-500 text-white rounded-xl py-2 text-sm font-medium transition-colors"
              >
                Confirmar
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-2">
          {cart.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-kurmo-muted">
              <ShoppingBag className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Carrinho vazio</p>
              <p className="text-xs mt-1 opacity-60">Clique nos produtos para adicionar</p>
            </div>
          ) : (
            cart.items.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-kurmo-card border border-kurmo-border rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-kurmo-text truncate">{item.product_name}</p>
                  <p className="text-xs text-kurmo-accentLight font-mono">{currency(item.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => cart.updateQuantity(item.product_id, item.quantity - 1)}
                    className="w-6 h-6 rounded-lg bg-kurmo-surface border border-kurmo-border flex items-center justify-center hover:border-red-500/50 hover:text-red-400 transition-all"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold font-mono text-kurmo-text">{item.quantity}</span>
                  <button
                    onClick={() => cart.updateQuantity(item.product_id, item.quantity + 1)}
                    className="w-6 h-6 rounded-lg bg-kurmo-surface border border-kurmo-border flex items-center justify-center hover:border-green-500/50 hover:text-green-400 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-xs font-bold font-mono text-kurmo-text w-16 text-right">{currency(item.total)}</span>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        {cart.items.length > 0 && (
          <div className="px-5 py-3 border-t border-kurmo-border flex gap-2">
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-kurmo-card border border-kurmo-border text-kurmo-muted hover:text-kurmo-orange hover:border-orange-500/30 transition-all text-xs"
            >
              <Tag className="w-3.5 h-3.5" />
              Desconto
            </button>
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-kurmo-card border border-kurmo-border text-kurmo-muted hover:text-kurmo-cyan hover:border-cyan-500/30 transition-all text-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Nota
            </button>
          </div>
        )}

        {showDiscount && (
          <div className="px-5 pb-3 flex gap-2 animate-slide-up">
            <input
              value={discountInput}
              onChange={e => setDiscountInput(e.target.value)}
              placeholder="Valor"
              type="number"
              className="flex-1 bg-kurmo-card border border-kurmo-border rounded-xl px-3 py-2 text-sm text-kurmo-text placeholder:text-kurmo-muted focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={() => { cart.setDiscount(parseFloat(discountInput) || 0, 'fixed'); setShowDiscount(false) }}
              className="px-3 py-2 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-medium hover:bg-orange-500/30 transition-all"
            >
              <DollarSign className="w-4 h-4" />
            </button>
            <button
              onClick={() => { cart.setDiscount(parseFloat(discountInput) || 0, 'percent'); setShowDiscount(false) }}
              className="px-3 py-2 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-medium hover:bg-orange-500/30 transition-all"
            >
              <Percent className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Payment */}
        <div className="px-5 py-3 border-t border-kurmo-border">
          <p className="text-xs text-kurmo-muted mb-2 font-medium">Forma de pagamento</p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(pm => (
              <button
                key={pm.id}
                onClick={() => cart.setPayment(pm.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  cart.paymentMethod === pm.id
                    ? 'text-white border-transparent'
                    : 'bg-kurmo-card border-kurmo-border text-kurmo-muted hover:text-kurmo-text'
                }`}
                style={cart.paymentMethod === pm.id ? { background: pm.color + 'cc', borderColor: pm.color } : {}}
              >
                <pm.icon className="w-3.5 h-3.5" />
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="px-5 py-3 border-t border-kurmo-border space-y-1">
          <div className="flex justify-between text-xs text-kurmo-muted">
            <span>Subtotal</span>
            <span className="font-mono">{currency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-xs text-orange-400">
              <span>Desconto</span>
              <span className="font-mono">-{currency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-kurmo-text pt-1 border-t border-kurmo-border">
            <span className="font-display">Total</span>
            <span className="font-mono text-gradient">{currency(total)}</span>
          </div>
        </div>

        {/* Finalize button */}
        <div className="px-5 pb-5 pt-2">
          <button
            onClick={handleFinalize}
            disabled={cart.items.length === 0}
            className="w-full py-3.5 rounded-2xl font-bold text-white transition-all duration-200 text-sm font-display disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="relative flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              Finalizar Venda (F10)
            </div>
          </button>
          <p className="text-center text-xs text-kurmo-muted mt-2">F2 = Buscar • Esc = Limpar</p>
        </div>
      </div>
    </div>
  )
}
