# ⚡ Kurmo PDV

Sistema PDV completo para venda de cigarros eletrônicos.
Stack 100% gratuita: **Vercel + Supabase + Railway**.

---

## 🚀 Setup em 4 passos

### 1. Supabase (banco de dados)
1. Acesse [supabase.com](https://supabase.com) → New Project
2. Vá em **SQL Editor** e cole o conteúdo de `SUPABASE_SCHEMA.sql`
3. Vá em **Settings → API** e copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 2. Evolution API no Railway (WhatsApp)
1. Acesse [railway.app](https://railway.app) → New Project → Deploy from template
2. Pesquise **"Evolution API"** e faça deploy
3. Após deploy, acesse o painel da Evolution API:
   - Crie uma instância chamada `kurmo`
   - Conecte o WhatsApp escaneando o QR Code
4. Copie a URL do Railway e sua API Key

### 3. Deploy no Vercel
1. Envie o código para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) → New Project → Import
3. Em **Environment Variables**, adicione:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_EVOLUTION_API_URL=https://xxx.up.railway.app
VITE_EVOLUTION_API_KEY=sua_key
VITE_EVOLUTION_INSTANCE=kurmo
```
4. Deploy! ✅

### 4. Local (desenvolvimento)
```bash
npm install
cp .env.example .env.local
# Preencha o .env.local com suas credenciais
npm run dev
```

---

## ✨ Funcionalidades

### PDV
- ✅ Catálogo de produtos com categorias
- ✅ Carrinho com quantidade, notas por item
- ✅ Desconto em R$ ou %
- ✅ 4 formas de pagamento
- ✅ Atalhos de teclado (F2, F10, Esc)
- ✅ Identificação de cliente

### Delivery
- ✅ Kanban de pedidos em tempo real
- ✅ Timeline de status visual
- ✅ Envio automático de WhatsApp a cada mudança de status
- ✅ Link direto para WhatsApp do cliente
- ✅ Filtro por status

### Dashboard
- ✅ Faturamento, pedidos, ticket médio
- ✅ Gráfico de vendas por dia
- ✅ Produtos mais vendidos
- ✅ Formas de pagamento (pizza)

### Produtos
- ✅ CRUD completo
- ✅ Controle de estoque com alertas
- ✅ Margem de lucro calculada automaticamente
- ✅ Categorias coloridas

### Histórico
- ✅ Todas as vendas PDV + Delivery
- ✅ Filtro por canal e busca
- ✅ Resumo financeiro do dia

---

## 🎹 Atalhos de teclado (PDV)
| Tecla | Ação |
|-------|------|
| F2 | Focar na busca |
| F10 | Finalizar venda |
| Esc | Limpar busca |

---

## 🛠 Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Estilo**: Tailwind CSS + custom design system
- **Estado**: Zustand + Immer
- **Banco**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime
- **WhatsApp**: Evolution API
- **Deploy**: Vercel (frontend) + Railway (Evolution API)
- **Gráficos**: Recharts
