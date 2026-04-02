import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type CartItem = {
  id: string
  product_id: string
  product_name: string
  price: number
  quantity: number
  total: number
  notes?: string
  product_image?: string
}

interface CartState {
  items: CartItem[]
  discount: number
  discountType: 'percent' | 'fixed'
  customerName: string
  customerPhone: string
  paymentMethod: string
  notes: string
  addItem: (product: { id: string; name: string; price: number; image_url?: string | null }) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  setDiscount: (v: number, type: 'percent' | 'fixed') => void
  setCustomer: (name: string, phone: string) => void
  setPayment: (method: string) => void
  setNotes: (n: string) => void
  clearCart: () => void
  getSubtotal: () => number
  getTotal: () => number
}

export const useCartStore = create<CartState>()(
  immer((set, get) => ({
    items: [],
    discount: 0,
    discountType: 'fixed',
    customerName: '',
    customerPhone: '',
    paymentMethod: '',
    notes: '',
    addItem: (product) => set((state) => {
      const existing = state.items.find(i => i.product_id === product.id)
      if (existing) {
        existing.quantity += 1
        existing.total = existing.price * existing.quantity
      } else {
        state.items.push({
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          quantity: 1,
          total: product.price,
          product_image: product.image_url || undefined,
        })
      }
    }),
    removeItem: (productId) => set((state) => {
      state.items = state.items.filter(i => i.product_id !== productId)
    }),
    updateQuantity: (productId, qty) => set((state) => {
      if (qty <= 0) { state.items = state.items.filter(i => i.product_id !== productId); return }
      const item = state.items.find(i => i.product_id === productId)
      if (item) { item.quantity = qty; item.total = item.price * qty }
    }),
    setDiscount: (v, type) => set((state) => { state.discount = v; state.discountType = type }),
    setCustomer: (name, phone) => set((state) => { state.customerName = name; state.customerPhone = phone }),
    setPayment: (method) => set((state) => { state.paymentMethod = method }),
    setNotes: (n) => set((state) => { state.notes = n }),
    clearCart: () => set((state) => {
      state.items = []; state.discount = 0; state.discountType = 'fixed'
      state.customerName = ''; state.customerPhone = ''; state.paymentMethod = ''; state.notes = ''
    }),
    getSubtotal: () => get().items.reduce((s, i) => s + i.total, 0),
    getTotal: () => {
      const sub = get().getSubtotal()
      const { discount, discountType } = get()
      if (discountType === 'percent') return sub * (1 - discount / 100)
      return Math.max(0, sub - discount)
    },
  }))
)
