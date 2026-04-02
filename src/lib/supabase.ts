import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Product = {
  id: string
  name: string
  price: number
  cost_price: number
  stock: number
  category_id: string | null
  image_url: string | null
  barcode: string | null
  active: boolean
  created_at: string
}

export type Category = {
  id: string
  name: string
  color: string
  icon: string
}

export type Order = {
  id: string
  order_number: number
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  type: 'pdv' | 'delivery'
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled'
  payment_method: string
  subtotal: number
  discount: number
  delivery_fee: number
  total: number
  notes: string | null
  items: OrderItem[]
  whatsapp_sent: boolean
  created_at: string
  updated_at: string
}

export type OrderItem = {
  id: string
  product_id: string
  product_name: string
  price: number
  quantity: number
  total: number
  notes?: string
}
