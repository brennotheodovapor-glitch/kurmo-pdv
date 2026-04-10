import{useCashRegister}from '@/hooks/useCashRegister'
    {/* Cash closed overlay + modal */}
    {!cash.isLoading&&!cash.isOpen&&(
      <div style={{position:'fixed',inset:0,background:'rgba(8,12,8,0.97)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:24,zIndex:999,padding:20}}>
        <div style={{width:80,height:80,borderRadius:24,background:'rgba(255,170,0,0.1)',border:'2px solid rgba(255,170,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width='36' height='36' fill='none' stroke='#ffaa00' strokeWidth='2' viewBox='0 0 24 24'><rect x='3' y='11' width='18' height='11' rx='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>
        </div>
        <div style={{textAlign:'center'}}>
          <p style={{fontFamily:'Bangers,cursive',fontSize:34,color:'#ffaa00',letterSpacing:3,marginBottom:8}}>CAIXA FECHADO</p>
          <p style={{fontSize:15,color:'var(--muted)',maxWidth:300,lineHeight:1.5}}>Abra o caixa para comecar a registrar vendas.</p>
        </div>
        <button onClick={()=>cash.setOpenModal(true)} style={{display:'flex',alignItems:'center',gap:10,padding:'14px 36px',borderRadius:14,border:'2px solid #ffaa00',background:'rgba(255,170,0,0.12)',color:'#ffaa00',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:22,letterSpacing:1}}>
          <svg width='20' height='20' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><rect x='3' y='11' width='18' height='11' rx='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>
          ABRIR CAIXA
        </button>
      </div>
    )}
    {cash.openModal&&(
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
        <div className='card' style={{width:'100%',maxWidth:400,padding:28,border:'2px solid #ffaa00',boxShadow:'0 0 60px rgba(255,170,0,0.25)'}}>
          <p style={{fontFamily:'Bangers,cursive',fontSize:26,color:'#ffaa00',marginBottom:4,letterSpacing:2}}>ABRIR CAIXA</p>
          <p style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p>
          <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:8,letterSpacing:1}}>SALDO INICIAL EM CAIXA (R$)</label>
          <input type='number' min='0' step='0.01' value={cash.openBal} onChange={e=>cash.setOpenBal(e.target.value)} placeholder='0,00' autoFocus style={{fontSize:22,textAlign:'center',fontFamily:'JetBrains Mono,monospace',letterSpacing:2,marginBottom:8,width:'100%'}}/>
          <p style={{fontSize:12,color:'var(--muted)',marginBottom:22}}>Quanto dinheiro tem no caixa agora?</p>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>cash.setOpenModal(false)} style={{flex:1,padding:12,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15}}>CANCELAR</button>
            <button onClick={cash.openCash} disabled={cash.saving} style={{flex:2,padding:12,borderRadius:8,border:'none',background:'#ffaa00',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:18,letterSpacing:1,opacity:cash.saving?0.7:1}}>{cash.saving?'ABRINDO...':'ABRIR CAIXA'}</button>
          </div>
        </div>
      </div>
    )}
import { useState, useEffect, useRef } from 'react'
import { Plus, Minus, Trash2, ShoppingCart, X, Check, Search, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Product = {id:string;name:string;price:number;stock:number;image_url?:string}
type CartItem = Product & {qty:number}
type Seller = {id:string;name:string}
type Payment = {method:string;amount:number}
const METHODS = [
  {key:'pix',    label:'PIX'},
  {key:'dinheiro',label:'Dinheiro'},
  {key:'debito', label:'Debito'},
  {key:'credito', label:'Credito'},
]
const fmt = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

type Props={sellerId?:string;sellerName?:string}
export default function PDVPage({sellerId:propSellerId,sellerName:propSellerName}:Props={}) {
  const cash=useCashRegister()
  const [products,setProducts] = useState<Product[]>([])
  const [sellers,setSellers] = useState<Seller[]>([])
  const [cart,setCart] = useState<CartItem[]>([])
  const [search,setSearch] = useState('')
  const [sellerId,setSellerId] = useState('')
  const [customerName,setCustomerName] = useState('')
  const [discount,setDiscount] = useState(0)
  const [payments,setPayments] = useState<Payment[]>([{method:'pix',amount:0}])
  const [processing,setProcessing] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(()=>{loadData()},[])

  async function loadData() {
    const [p,s] = await Promise.all([
      supabase.from('products').select('*').eq('active',true).order('name'),
      supabase.from('sellers').select('id,name').eq('active',true).order('name')
    ])
    setProducts(p.data||[])
    setSellers(s.data||[])
    if((s.data||[]).length===1) setSellerId(s.data![0].id)
  }

  const filtered = products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()))
  const subtotal = cart.reduce((s,i)=>s+i.price*i.qty,0)
  const total = Math.max(0,subtotal-discount)
  const paidTotal = payments.reduce((s,p)=>s+p.amount,0)
  const remaining = total - paidTotal
  const change = paidTotal > total ? paidTotal-total : 0

  const addToCart = (p:Product) => {
    setCart(c=>{
      const ex = c.find(i=>i.id===p.id)
      if(ex) return c.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i)
      return [...c,{...p,qty:1}]
    })
    toast.success(p.name, {duration:800})
  }
  const updateQty = (id:string,delta:number) => setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+delta)}:i).filter(i=>i.qty>0))
  const setPayField = (i:number,field:string,val:any) => setPayments(p=>p.map((pm,j)=>j===i?{...pm,[field]:val}:pm))
  const fillRemaining = (i:number) => {
    const other = payments.reduce((s,p,j)=>j!==i?s+p.amount:s,0)
    setPayments(p=>p.map((pm,j)=>j===i?{...pm,amount:Math.max(0,+(total-other).toFixed(2))}:pm))
  }

  async function finishSale() {
    if(!cash.isOpen){toast.error('Caixa fechado! Abra o caixa para finalizar vendas.');cash.setOpenModal(true);return}
    if(cart.length===0){toast.error('Carrinho vazio');return}
    if(!sellerId && sellers.length>0){toast.error('Selecione o vendedor');return}
    if(remaining>0.01){toast.error('Pagamento insuficiente. Faltam '+fmt(remaining));return}
    setProcessing(true)
    try {
      const {data:order,error:oErr} = await supabase.from('orders').insert({
        seller_id:sellerId||null, customer_name:customerName||null,
        type:'pdv', status:'completed', subtotal, discount, total
      }).select().single()
      if(oErr) throw oErr
      await supabase.from('order_items').insert(cart.map(i=>({order_id:order.id,product_id:i.id,product_name:i.name,quantity:i.qty,unit_price:i.price,total_price:+(i.price*i.qty).toFixed(2)})))
      await supabase.from('order_payments').insert(payments.filter(p=>p.amount>0).map(p=>({order_id:order.id,method:p.method,amount:p.amount})))
      for(const item of cart) await supabase.from('products').update({stock:Math.max(0,(item.stock||0)-item.qty)}).eq('id',item.id)
      toast.success('Venda #'+order.order_number+' finalizada! '+fmt(total))
      if(change>0.01) toast('Troco: '+fmt(change), {icon:' ', duration:4000})
      setCart([]); setDiscount(0); setCustomerName(''); setPayments([{method:'pix',amount:0}])
      loadData(); searchRef.current?.focus()
    } catch(e:any) { toast.error('Erro: '+e.message) }
    finally { setProcessing(false) }
  }

  return (
    <div style={{height:'100%',display:'flex',background:'var(--bg)',overflow:'hidden'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',borderRight:'1px solid var(--border)',minWidth:0}}>
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <ShoppingCart size={18} color="var(--neon)"/>
          <h1 className="font-bangers neon-text-sm" style={{fontSize:22}}>PDV</h1>
          <div style={{position:'relative',flex:1,minWidth:200}}>
            <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
            <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar produto..." style={{paddingLeft:32}}/>
          </div>
          {sellers.length>0 && (
            <select value={sellerId} onChange={e=>setSellerId(e.target.value)} style={{maxWidth:180,fontSize:13,border:!sellerId?'1px solid #ffaa00':'1px solid var(--border)'}}>
              <option value="">Selecionar vendedor...</option>
              {sellers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:12,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8,alignContent:'start'}}>
          {filtered.map(p=>(
            <button key={p.id} onClick={()=>addToCart(p)} disabled={p.stock===0} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:10,cursor:p.stock===0?'not-allowed':'pointer',textAlign:'left',transition:'all 0.15s',opacity:p.stock===0?0.4:1}} className="card-hover">
              {p.image_url ? <img src={p.image_url} alt={p.name} style={{width:'100%',height:72,objectFit:'cover',borderRadius:8,marginBottom:6}}/> : <div style={{width:'100%',height:72,background:'var(--surface)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,marginBottom:6}}> </div>}
              <p style={{fontSize:11,fontWeight:600,color:'var(--white)',lineHeight:1.3,marginBottom:3}}>{p.name}</p>
              <p style={{fontSize:13,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.price)}</p>
              <p style={{fontSize:10,color:p.stock<=5&&p.stock>0?'#ffaa00':p.stock===0?'#ff3333':'var(--muted)'}}>{p.stock===0?'SEM ESTOQUE':'Estoque: '+p.stock}</p>
            </button>
          ))}
          {filtered.length===0 && <div style={{gridColumn:'1/-1',textAlign:'center',padding:48,color:'var(--muted)'}}>Nenhum produto encontrado</div>}
        </div>
      </div>

      <div style={{width:340,display:'flex',flexDirection:'column',background:'var(--surface)',flexShrink:0}}>
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span className="font-bangers" style={{fontSize:18,color:'var(--neon)'}}>CARRINHO {cart.length>0?'('+cart.reduce((s,i)=>s+i.qty,0)+')':''}</span>
          {cart.length>0 && <button onClick={()=>setCart([])} style={{background:'none',border:'none',color:'#ff3333',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>LIMPAR</button>}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'6px 12px'}}>
          {cart.length===0 ? <div style={{textAlign:'center',padding:48,color:'var(--muted)'}}><ShoppingCart size={36} style={{marginBottom:8,opacity:0.3}}/><p style={{fontSize:12}}>Clique nos produtos para adicionar</p></div>
          : cart.map(item=>(
            <div key={item.id} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 0',borderBottom:'1px solid rgba(26,46,26,0.5)'}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:12,fontWeight:600,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</p>
                <p style={{fontSize:11,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price)}   {item.qty} = {fmt(item.price*item.qty)}</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:3}}>
                <button onClick={()=>updateQty(item.id,-1)} style={{width:22,height:22,borderRadius:5,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={11}/></button>
                <span style={{fontSize:13,fontWeight:700,color:'var(--white)',width:22,textAlign:'center'}}>{item.qty}</span>
                <button onClick={()=>updateQty(item.id,1)} style={{width:22,height:22,borderRadius:5,border:'1px solid var(--neon)',background:'var(--neon-glow)',color:'var(--neon)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={11}/></button>
                <button onClick={()=>setCart(c=>c.filter(i=>i.id!==item.id))} style={{width:22,height:22,borderRadius:5,border:'none',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:2}}><X size={11}/></button>
              </div>
            </div>
          ))}
        </div>

        <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)'}}>
          <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Nome do cliente (opcional)" style={{marginBottom:8,fontSize:12}}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)',marginBottom:3}}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:12,color:'var(--muted)'}}>Desconto R$</span>
            <input type="number" min="0" value={discount===0?'':discount} onChange={e=>setDiscount(e.target.value===''?0:parseFloat(e.target.value)||0)} placeholder="0,00" style={{width:80,textAlign:'right',fontSize:12,padding:'4px 6px'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:17,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',padding:'6px 0',borderTop:'1px solid var(--border)',marginBottom:8}}>
            <span>TOTAL</span><span>{fmt(total)}</span>
          </div>

          <div style={{marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
              <span style={{fontSize:10,color:'var(--muted)',letterSpacing:1}}>FORMA DE PAGAMENTO</span>
              <button onClick={()=>setPayments(p=>[...p,{method:'dinheiro',amount:0}])} style={{fontSize:10,color:'var(--neon)',background:'none',border:'none',cursor:'pointer'}}>+ Adicionar</button>
            </div>
            {payments.map((pm,i)=>(
              <div key={i} style={{display:'flex',gap:5,marginBottom:5,alignItems:'center'}}>
                <select value={pm.method} onChange={e=>setPayField(i,'method',e.target.value)} style={{flex:1,fontSize:11,padding:'5px 6px'}}>
                  {METHODS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
                <input type="number" min="0" step="0.01" value={pm.amount===0?'':pm.amount} onChange={e=>setPayField(i,'amount',e.target.value===''?0:parseFloat(e.target.value)||0)} placeholder="0,00" style={{width:80,fontSize:11,textAlign:'right',padding:'5px 6px'}}/>
                <button onClick={()=>fillRemaining(i)} title="Preencher restante" style={{fontSize:9,color:'var(--neon)',background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',borderRadius:5,padding:'4px 5px',cursor:'pointer',whiteSpace:'nowrap'}}>Resto</button>
                {payments.length>1 && <button onClick={()=>setPayments(p=>p.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'#ff3333',cursor:'pointer',padding:2}}><X size={12}/></button>}
              </div>
            ))}
            {remaining>0.01 && <p style={{fontSize:10,color:'#ff3333',display:'flex',alignItems:'center',gap:3}}><AlertTriangle size={10}/>Faltam {fmt(remaining)}</p>}
            {change>0.01 && <p style={{fontSize:11,color:'#10b981',fontWeight:700}}>Troco: {fmt(change)}</p>}
          </div>

          <button onClick={finishSale} className="btn-neon-fill" disabled={processing||cart.length===0||remaining>0.01} style={{width:'100%',fontSize:14,padding:'11px',opacity:cart.length===0||remaining>0.01?0.5:1}}>
            {processing?'Processando...':<><Check size={14} style={{display:'inline',marginRight:6}}/>FINALIZAR VENDA</>}
          </button>
        </div>
      </div>
    </div>
  )
}