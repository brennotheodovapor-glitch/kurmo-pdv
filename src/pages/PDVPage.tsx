import{printReceipt}from '@/lib/receipt'
import{useCashRegister}from '@/hooks/useCashRegister'
import{useState,useEffect,useRef}from 'react'
import{Plus,Minus,X,Check,Search,ShoppingCart,AlertTriangle,User,Printer,Percent,Tag,ChevronRight}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Product={id:string;name:string;price:number;stock:number;image_url?:string}
type CartItem=Product&{qty:number}
type Payment={method:string;amount:number}
const METHODS=[{key:'pix',label:'PIX'},{key:'dinheiro',label:'Dinheiro'},{key:'debito',label:'Debito'},{key:'credito',label:'Credito'}]
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
type Props={sellerId?:string|null;sellerName?:string}

export default function PDVPage({sellerId:propSellerId,sellerName:propSellerName}:Props={}){
  const cash=useCashRegister()
  const[products,setProducts]=useState<Product[]>([])
  const[discountModal,setDiscountModal]=useState<string|null>(null)
  const[discountValue,setDiscountValue]=useState('')
  const[discountType,setDiscountType]=useState<'pct'|'fixed'>('pct')
  const[cart,setCart]=useState<CartItem[]>([])
  const[search,setSearch]=useState('')
  const[customerName,setCustomerName]=useState('')
  const[discount,setDiscount]=useState(0)
  const[payments,setPayments]=useState<Payment[]>([{method:'pix',amount:0}])
  const[processing,setProcessing]=useState(false)
  const[couponCode,setCouponCode]=useState('')
  const[couponData,setCouponData]=useState<any|null>(null)
  const[couponLoading,setCouponLoading]=useState(false)
  const[lastOrder,setLastOrder]=useState<any|null>(null)
  const[mobileTab,setMobileTab]=useState<'products'|'cart'>('products')
  const searchRef=useRef<HTMLInputElement>(null)
  const activeSellerId=propSellerId||null
  const activeSellerName=propSellerName||null

  useEffect(()=>{loadData()},[])

  async function loadData(){
    const{data}=await supabase.from('products').select('*').eq('active',true).order('name')
    setProducts(data||[])
  }

  const filtered=products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()))
  const subtotal=cart.reduce((s,i)=>s+i.price*i.qty,0)
  const couponDiscount=couponData?(couponData.discount_type==='percent'?subtotal*(couponData.discount_value/100):Math.min(couponData.discount_value,subtotal)):0
  const total=Math.max(0,subtotal-discount-couponDiscount)
  const paidTotal=payments.reduce((s,p)=>s+p.amount,0)
  const remaining=total-paidTotal
  const change=paidTotal>total?paidTotal-total:0
  const cartCount=cart.reduce((s,i)=>s+i.qty,0)

  const addToCart=(p:Product)=>{
    setCart(c=>{const ex=c.find(i=>i.id===p.id);if(ex)return c.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i);return[...c,{...p,qty:1}]})
    toast.success(p.name,{duration:600})
    // On mobile, show visual feedback but stay on products
  }
  const updateQty=(id:string,delta:number)=>setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+delta)}:i).filter(i=>i.qty>0))
  const setPayField=(i:number,field:string,val:any)=>setPayments(p=>p.map((pm,j)=>j===i?{...pm,[field]:val}:pm))
  const fillRemaining=(i:number)=>{const other=payments.reduce((s,p,j)=>j!==i?s+p.amount:s,0);setPayments(p=>p.map((pm,j)=>j===i?{...pm,amount:Math.max(0,+(total-other).toFixed(2))}:pm))}

  async function applyCoupon(){
    if(!couponCode.trim())return
    setCouponLoading(true)
    const{data}=await supabase.from('coupons').select('*').eq('code',couponCode.toUpperCase().trim()).eq('active',true).maybeSingle()
    if(!data){toast.error('Cupom inválido');setCouponData(null);setCouponLoading(false);return}
    if(data.expires_at&&new Date(data.expires_at)<new Date()){toast.error('Cupom expirado');setCouponData(null);setCouponLoading(false);return}
    if(data.max_uses&&data.used_count>=data.max_uses){toast.error('Cupom esgotado');setCouponData(null);setCouponLoading(false);return}
    setCouponData(data)
    const disc=data.discount_type==='percent'?subtotal*(data.discount_value/100):Math.min(data.discount_value,subtotal)
    toast.success('Cupom! -'+fmt(disc))
    setCouponLoading(false)
  }

  function printReceipt(order:any,items:any[]){
    const w=window.open('','_blank','width=400,height=600')
    if(!w)return
    const lines=items.map(i=>'<tr><td>'+i.qty+'x '+i.name+'</td><td style="text-align:right">'+fmt(i.price*i.qty)+'</td></tr>').join('')
    w.document.write('<html><head><title>Cupom</title><style>body{font-family:monospace;font-size:13px;max-width:320px;margin:0 auto;padding:16px}h2{text-align:center}table{width:100%;border-collapse:collapse}td{padding:3px 0}hr{border:1px dashed #ccc}.total{font-size:16px;font-weight:bold}.center{text-align:center}</style></head><body>')
    w.document.write('<h2>UZT 027</h2><p class="center">'+new Date().toLocaleString('pt-BR')+'</p><hr/>')
    w.document.write('<p><strong>Pedido #'+order.order_number+'</strong>'+(order.customer_name?'<br>Cliente: '+order.customer_name:'')+'</p><hr/>')
    w.document.write('<table>'+lines+'</table><hr/>')
    if(order.discount>0)w.document.write('<p>Desconto: -'+fmt(order.discount)+'</p>')
    w.document.write('<p class="total">TOTAL: '+fmt(order.total)+'</p><hr/>')
    w.document.write('<p class="center">Obrigado!<br>UZT 027</p></body></html>')
    w.document.close()
    setTimeout(()=>w.print(),500)
  }

  async function finishSale(){
    if(!cash.isOpen){toast.error('Abra o caixa primeiro');cash.setOpenModal(true);return}
    if(cart.length===0){toast.error('Carrinho vazio');return}
    if(remaining>0.01){toast.error('Faltam '+fmt(remaining));return}
    setProcessing(true)
    try{
      const{data:order,error:oErr}=await supabase.from('orders').insert({
        seller_id:activeSellerId||null,customer_name:customerName||null,
        type:'pdv',status:'completed',cash_register_id:cash.current?.id||null,
        subtotal,discount:discount+couponDiscount,total,coupon_code:couponData?.code||null
      }).select().single()
      if(oErr)throw oErr
      await supabase.from('order_items').insert(cart.map(i=>({order_id:order.id,product_id:i.id,product_name:i.name,quantity:i.qty,unit_price:i.price,total_price:+(i.price*i.qty).toFixed(2)})))
      await supabase.from('order_payments').insert(payments.filter(p=>p.amount>0).map(p=>({order_id:order.id,method:p.method,amount:p.amount})))
      for(const item of cart)await supabase.from('products').update({stock:Math.max(0,(item.stock||0)-item.qty)}).eq('id',item.id)
      if(couponData)await supabase.from('coupons').update({used_count:(couponData.used_count||0)+1}).eq('id',couponData.id)
      setLastOrder({...order,items:cart.map(i=>({...i,qty:i.qty,product_name:i.name,total_price:i.price*i.qty}))})
      // Audit log
  try{await supabase.from('audit_log').insert({table_name:'orders',record_id:order.id,action:'INSERT',new_data:{order_number:order.order_number,total:order.total,type:'pdv',customer:order.customer_name},user_name:'Admin'})}catch{}
  toast.success('Venda #'+order.order_number+' finalizada! '+fmt(total))
      if(change>0.01)toast('Troco: '+fmt(change),{duration:4000})
      setCart([]);setDiscount(0);setCustomerName('');setPayments([{method:'pix',amount:0}]);setCouponData(null);setCouponCode('')
      setMobileTab('products')
      loadData();searchRef.current?.focus()
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setProcessing(false)}
  }

  const ProductsPanel=()=>(
    <div style={{display:'flex',flexDirection:'column',height:'100%',minWidth:0}}>
      <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',flexShrink:0}}>
        <ShoppingCart size={16} color='var(--neon)'/>
        <span className='font-bangers neon-text-sm' style={{fontSize:20}}>PDV</span>
        {activeSellerName&&<span style={{fontSize:11,color:'var(--neon)',padding:'3px 8px',borderRadius:6,background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',fontFamily:'Bangers,cursive'}}>{activeSellerName}</span>}
        <div style={{position:'relative',flex:1,minWidth:140}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar...' style={{paddingLeft:30,fontSize:14}}/>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:10,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:8,alignContent:'start'}}>
        {filtered.map(p=>(
          <button key={p.id} onClick={()=>addToCart(p)} disabled={p.stock===0}
            style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:8,cursor:p.stock===0?'not-allowed':'pointer',textAlign:'left',opacity:p.stock===0?0.4:1,WebkitTapHighlightColor:'transparent'}}
            className='card-hover'>
            {p.image_url&&p.image_url.startsWith('http')
              ?<img src={p.image_url} alt={p.name} style={{width:'100%',height:68,objectFit:'cover',borderRadius:7,marginBottom:5}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              :<div style={{width:'100%',height:68,background:'var(--surface)',borderRadius:7,marginBottom:5}}/>}
            <p style={{fontSize:11,fontWeight:600,color:'var(--white)',lineHeight:1.3,marginBottom:2}}>{p.name}</p>
            <p style={{fontSize:13,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.price)}</p>
            <p style={{fontSize:9,color:p.stock===0?'#ff3333':p.stock<=5?'#ffaa00':'var(--muted)'}}>{p.stock===0?'SEM ESTOQUE':'Estq: '+p.stock}</p>
          </button>
        ))}
        {filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:48,color:'var(--muted)'}}>Nenhum produto</div>}
      </div>
    </div>
  )

  const CartPanel=()=>(
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'var(--surface)'}}>
      <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <span className='font-bangers' style={{fontSize:18,color:'var(--neon)'}}>CARRINHO {cartCount>0?'('+cartCount+')':''}</span>
        {cart.length>0&&<button onClick={()=>setCart([])} style={{background:'none',border:'none',color:'#ff3333',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>LIMPAR</button>}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'6px 10px'}}>
        {cart.length===0
          ?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}><ShoppingCart size={32} style={{marginBottom:8,opacity:0.3}}/><p style={{fontSize:12}}>Adicione produtos</p></div>
          :cart.map(item=>(
            <div key={item.id} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 0',borderBottom:'1px solid rgba(26,46,26,0.5)'}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:12,fontWeight:600,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</p>
                <div style={{display:'flex',alignItems:'center',gap:4,marginTop:1}}>
                  <span style={{fontSize:10,color:'var(--muted)'}}>{fmt(item.price)} x {item.qty} =</span>
                  <span style={{fontSize:12,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price*item.qty)}</span>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
                <button onClick={()=>updateQty(item.id,-1)} style={{width:26,height:26,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={11}/></button>
                <span style={{fontSize:13,fontWeight:700,color:'var(--white)',width:24,textAlign:'center'}}>{item.qty}</span>
                <button onClick={()=>updateQty(item.id,1)} style={{width:26,height:26,borderRadius:6,border:'1px solid var(--neon)',background:'var(--neon-glow)',color:'var(--neon)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={11}/></button>
                <button onClick={()=>setCart(c=>c.filter(i=>i.id!==item.id))} style={{width:26,height:26,borderRadius:6,border:'none',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:2}}><X size={11}/></button>
              </div>
            </div>
          ))
        }
      </div>
      <div style={{padding:'10px 12px',borderTop:'1px solid var(--border)',flexShrink:0}}>
        <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder='Nome do cliente (opcional)' style={{marginBottom:8,fontSize:13,width:'100%'}}/>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)',marginBottom:4}}><span>Subtotal</span><span style={{fontFamily:'JetBrains Mono,monospace'}}>{fmt(subtotal)}</span></div>
        {/* Discount + Coupon */}
        <div style={{background:'rgba(26,46,26,0.4)',borderRadius:9,padding:'8px 10px',marginBottom:8,border:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:11,color:'var(--muted)'}}>Desconto R$</span>
            <input type='number' min='0' value={discount===0?'':discount} onChange={e=>setDiscount(e.target.value===''?0:parseFloat(e.target.value)||0)} placeholder='0,00' style={{width:75,textAlign:'right',fontSize:12,padding:'3px 6px'}}/>
          </div>
          <div style={{display:'flex',gap:5,alignItems:'center'}}>
            <input value={couponCode} onChange={e=>setCouponCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&applyCoupon()} placeholder='CUPOM' style={{flex:1,fontSize:11,height:28,letterSpacing:1,fontFamily:'JetBrains Mono,monospace'}}/>
            {couponData
              ?<button onClick={()=>{setCouponData(null);setCouponCode('')}} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #ff3333',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>X</button>
              :<button onClick={applyCoupon} disabled={couponLoading||!couponCode} style={{padding:'3px 10px',borderRadius:6,border:'1px solid var(--neon)',background:'var(--neon-glow)',color:'var(--neon)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive',opacity:couponCode?1:0.4}}>{couponLoading?'...':'OK'}</button>
            }
          </div>
          {couponData&&<p style={{fontSize:10,color:'var(--neon)',marginTop:4}}>{couponData.code} — -{couponData.discount_type==='percent'?couponData.discount_value+'%':fmt(couponData.discount_value)} = -{fmt(couponDiscount)}</p>}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:18,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',padding:'6px 0',borderTop:'1px solid var(--border)',marginBottom:8}}>
          <span>TOTAL</span><span>{fmt(total)}</span>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
            <span style={{fontSize:10,color:'var(--muted)',letterSpacing:0.5}}>PAGAMENTO</span>
            <button onClick={()=>setPayments(p=>[...p,{method:'dinheiro',amount:0}])} style={{fontSize:10,color:'var(--neon)',background:'none',border:'none',cursor:'pointer'}}>+ Forma</button>
          </div>
          {payments.map((pm,i)=>(
            <div key={i} style={{display:'flex',gap:5,marginBottom:5,alignItems:'center'}}>
              <select value={pm.method} onChange={e=>setPayField(i,'method',e.target.value)} style={{flex:1,fontSize:12,padding:'6px 6px'}}>
                {METHODS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
              <input type='number' min='0' step='0.01' value={pm.amount===0?'':pm.amount} onChange={e=>setPayField(i,'amount',e.target.value===''?0:parseFloat(e.target.value)||0)} placeholder='0,00' style={{width:80,fontSize:12,textAlign:'right',padding:'6px 6px'}}/>
              <button onClick={()=>fillRemaining(i)} style={{fontSize:9,color:'var(--neon)',background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',borderRadius:5,padding:'5px 5px',cursor:'pointer',whiteSpace:'nowrap'}}>↑</button>
              {payments.length>1&&<button onClick={()=>setPayments(p=>p.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'#ff3333',cursor:'pointer',padding:2}}><X size={12}/></button>}
            </div>
          ))}
          {remaining>0.01&&<p style={{fontSize:10,color:'#ff3333',display:'flex',alignItems:'center',gap:3}}><AlertTriangle size={10}/>Faltam {fmt(remaining)}</p>}
          {change>0.01&&<p style={{fontSize:12,color:'#10b981',fontWeight:700}}>Troco: {fmt(change)}</p>}
        </div>
        {lastOrder&&(
          <button onClick={()=>printReceipt(lastOrder,lastOrder.items||[])} style={{width:'100%',fontSize:12,padding:'7px',borderRadius:7,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--muted)',cursor:'pointer',marginBottom:6,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
            <Printer size={12}/>IMPRIMIR ÚLTIMO #{lastOrder.order_number}
          </button>
        )}
        <button onClick={finishSale} className='btn-neon-fill' disabled={processing||cart.length===0||remaining>0.01}
          style={{width:'100%',fontSize:15,padding:'12px',opacity:cart.length===0||remaining>0.01?0.5:1}}>
          {processing?'Processando...':<><Check size={14} style={{display:'inline',marginRight:6}}/>FINALIZAR VENDA</>}
        </button>
      </div>
    </div>
  )

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)',overflow:'hidden',position:'relative'}}>
      {/* Overlay caixa fechado */}
      {!cash.isLoading&&!cash.isOpen&&(
        <div style={{position:'absolute',inset:0,background:'rgba(8,12,8,0.97)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:20,zIndex:99,padding:20}}>
          <div style={{width:72,height:72,borderRadius:20,background:'rgba(255,170,0,0.1)',border:'2px solid rgba(255,170,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width='32' height='32' fill='none' stroke='#ffaa00' strokeWidth='2' viewBox='0 0 24 24'><rect x='3' y='11' width='18' height='11' rx='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>
          </div>
          <div style={{textAlign:'center'}}>
            <p style={{fontFamily:'Bangers,cursive',fontSize:30,color:'#ffaa00',letterSpacing:3,marginBottom:6}}>CAIXA FECHADO</p>
            <p style={{fontSize:13,color:'var(--muted)',maxWidth:280,lineHeight:1.5}}>Abra o caixa para começar a registrar vendas.</p>
          </div>
          <button onClick={()=>cash.setOpenModal(true)} style={{display:'flex',alignItems:'center',gap:10,padding:'13px 32px',borderRadius:12,border:'2px solid #ffaa00',background:'rgba(255,170,0,0.12)',color:'#ffaa00',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:20,letterSpacing:1}}>
            ABRIR CAIXA
          </button>
        </div>
      )}

      {/* Modal abrir caixa */}
      {cash.openModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:380,padding:24,border:'2px solid #ffaa00'}}>
            <p style={{fontFamily:'Bangers,cursive',fontSize:24,color:'#ffaa00',marginBottom:4,letterSpacing:2}}>ABRIR CAIXA</p>
            <p style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6}}>SALDO INICIAL (R$)</label>
            <input type='number' min='0' step='0.01' value={cash.openBal} onChange={e=>cash.setOpenBal(e.target.value)} placeholder='0,00' autoFocus style={{fontSize:20,textAlign:'center',fontFamily:'JetBrains Mono,monospace',marginBottom:16,width:'100%'}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>cash.setOpenModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={cash.openCash} disabled={cash.saving} style={{flex:2,padding:11,borderRadius:8,border:'none',background:'#ffaa00',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:17,opacity:cash.saving?0.7:1}}>{cash.saving?'ABRINDO...':'ABRIR CAIXA'}</button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP: side-by-side | MOBILE: tabs */}
      <div style={{flex:1,display:'flex',overflow:'hidden',minHeight:0}}>
        {/* Produtos — sempre visível no desktop, condicional no mobile */}
        <div style={{flex:1,display:'flex',flexDirection:'column',borderRight:'1px solid var(--border)',minWidth:0,
          // Mobile: hide when on cart tab
          overflow:'hidden'}} className='pdv-products-panel'>
          <ProductsPanel/>
        </div>
        {/* Carrinho — sempre visível no desktop */}
        <div style={{width:'min(340px,42vw)',display:'flex',flexDirection:'column',background:'var(--surface)',flexShrink:0,minWidth:260}} className='pdv-cart-panel'>
          <CartPanel/>
        </div>
      </div>

      {/* Mobile FAB - go to cart when items in cart */}
      <style>{
        `@media (max-width: 640px) {
          .pdv-cart-panel { display: none !important; }
          .pdv-products-panel { flex: 1 !important; border-right: none !important; }
          .pdv-mobile-cart-btn { display: flex !important; }
          .pdv-mobile-overlay { display: flex !important; }
        }
        @media (min-width: 641px) {
          .pdv-mobile-cart-btn { display: none !important; }
          .pdv-mobile-overlay { display: none !important; }
        }`
      }</style>

      {/* Mobile: FAB carrinho */}
      <div className='pdv-mobile-cart-btn' style={{display:'none',position:'fixed',bottom:72,right:16,zIndex:40}}>
        {cartCount>0&&(
          <button onClick={()=>setMobileTab('cart')}
            style={{display:'flex',alignItems:'center',gap:8,padding:'12px 20px',borderRadius:50,border:'none',background:'var(--neon)',color:'#000',cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:'Bangers,cursive',letterSpacing:0.5,boxShadow:'0 4px 20px rgba(0,255,65,0.4)'}}>
            <ShoppingCart size={16}/>
            <span style={{background:'rgba(0,0,0,0.3)',borderRadius:10,padding:'0 6px',fontSize:12}}>{cartCount}</span>
            {fmt(total)}
          </button>
        )}
      </div>

      {/* Mobile: Carrinho overlay */}
      {mobileTab==='cart'&&(
        <div className='pdv-mobile-overlay' style={{display:'none',position:'fixed',inset:0,zIndex:50,flexDirection:'column',background:'var(--bg)'}}>
          <div style={{padding:'10px 14px',background:'var(--surface)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
            <button onClick={()=>setMobileTab('products')} style={{background:'none',border:'none',color:'var(--neon)',cursor:'pointer',padding:4,fontSize:13,fontFamily:'Bangers,cursive',display:'flex',alignItems:'center',gap:4}}>
              ← PRODUTOS
            </button>
            <span style={{fontFamily:'Bangers,cursive',fontSize:18,color:'var(--neon)',flex:1,textAlign:'center'}}>CARRINHO ({cartCount})</span>
          </div>
          <div style={{flex:1,overflow:'hidden'}}>
            <CartPanel/>
          </div>
        </div>
      )}
    </div>
  )
}