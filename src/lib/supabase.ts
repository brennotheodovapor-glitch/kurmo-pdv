/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hkepgdjjnooevdlmlfmr.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrZXBnZGpqbm9vZXZkbG1sZm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNDAyMzgsImV4cCI6MjA5MDgxNjIzOH0.FA0-VucLdLJQixgIFvGS76D3jFVKICRa2D23Hk_0BP8'

export const supabase = createClient(supabaseUrl, supabaseKey)
export const isDemoMode = !import.meta.env.VITE_SUPABASE_URL

export type Product = { id:string; name:string; price:number; cost_price:number; stock:number; category_id:string|null; image_url:string|null; barcode:string|null; active:boolean; created_at:string }
export type Category = { id:string; name:string; color:string; icon:string }
export type Order = { id:string; order_number:number; customer_name:string|null; customer_phone:string|null; customer_address:string|null; type:'pdv'|'delivery'; status:'pending'|'accepted'|'preparing'|'ready'|'delivering'|'delivered'|'cancelled'|'completed'; payment_method:string; subtotal:number; discount:number; delivery_fee:number; total:number; notes:string|null; created_at:string; updated_at:string }
