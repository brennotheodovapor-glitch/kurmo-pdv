-- Kurmo PDV - Supabase Schema
-- Execute no SQL Editor do Supabase

-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text default '#7c3aed',
  icon text default '📦',
  created_at timestamptz default now()
);

-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null default 0,
  cost_price numeric(10,2) default 0,
  stock integer default 0,
  category_id uuid references categories(id) on delete set null,
  image_url text,
  barcode text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number serial unique,
  customer_name text,
  customer_phone text,
  customer_address text,
  type text not null default 'pdv' check (type in ('pdv', 'delivery')),
  status text not null default 'completed' check (status in ('pending','accepted','preparing','ready','delivering','delivered','cancelled','completed')),
  payment_method text not null,
  subtotal numeric(10,2) default 0,
  discount numeric(10,2) default 0,
  delivery_fee numeric(10,2) default 0,
  total numeric(10,2) default 0,
  notes text,
  items jsonb default '[]',
  whatsapp_sent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create or replace trigger products_updated_at before update on products
  for each row execute function update_updated_at();

create or replace trigger orders_updated_at before update on orders
  for each row execute function update_updated_at();

-- Enable Realtime for orders
alter publication supabase_realtime add table orders;

-- RLS (Row Level Security) - disable for single user
alter table categories disable row level security;
alter table products disable row level security;
alter table orders disable row level security;

-- Seed categories
insert into categories (name, color, icon) values
  ('Vapes', '#7c3aed', '💨'),
  ('Pods', '#06b6d4', '🔋'),
  ('Liquids', '#10b981', '💧'),
  ('Acessórios', '#f59e0b', '🔧'),
  ('Descartáveis', '#ef4444', '⚡')
on conflict do nothing;
