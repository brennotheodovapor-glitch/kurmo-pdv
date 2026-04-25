import{printReceipt}from '@/lib/receipt'
import{useCashRegister}from '@/hooks/useCashRegister'
import{useState,useEffect,useRef}from 'react'
import{Plus,Minus,X,Check,Search,ShoppingCart,AlertTriangle,User,Printer,Percent,Tag,ChevronRight}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'
type CartItem={id:string;name:string;price:number;stock:number;qty:number;_variantId?:string}
type Payment={method:string;amount:number}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
export default function PDVPage(){
  const cash=useCashRegister()
  const[products,setProducts]=useState<any[]>([])
  const[variantsMap,setVariantsMap]=useState<Record<string,any[]>>({})
  const[cart,setCart]=useState<CartItem[]>([])
  const[search,setSearch]=useState('')
  const[customerName,setCustomerName]=useState('')
  const[customers,setCustomers]=useState<any[]>([])
  const[custSearch,setCustSearch]=useState<any[]>([])
  const[showCustDrop,setShowCustDrop]=useState(false)
  const[selectedCustomer,setSelectedCustomer]=useState<any|null>(null)
  const[discount,setDiscount]=useState(0)
  const[acrescimo,setAcrescimo]=useState(0)
  const[payments,setPayments]=useState<Payment[]>([{method:'pix',amount:0}])
  const[processing,setProcessing]=useState(false)
  const[couponCode,setCouponCode]=useState('')
  const[couponData,setCouponData]=useState<any|null>(null)
  const[couponLoading,setCouponLoading]=useState(false)
  const[lastOrder,setLastOrder]=useState<any|null>(null)
  const[activeSellerId,setActiveSellerId]=useState<string|null>(null)
  const[sellers,setSellers]=useState<any[]>([])
  const[discountModal,setDiscountModal]=useState<string|null>(null)
  const[discountValue,setDiscountValue]=useState('')
  const[discountType,setDiscountType]=useState<'pct'|'fixed'>('pct')
  const[variantPickerModal,setVariantPickerModal]=useState<any|null>(null)
  const[pickerVariant,setPickerVariant]=useState('')
  const[pickerQty,setPickerQty]=useState(1)
  const searchRef=useRef<HTMLInputElement>(null)
  useEffect(()=>{loadData();loadCustomers()},[])
  async function loadData(){
    const[p,v,s]=await Promise.all([
      supabase.from('products').select('*').eq('active',true).order('name'),
      supabase.from('product_variants').select('*').eq('active',true).order('created_at',{ascending:false}),
      supabase.from('sellers').select('*').eq('active',true).order('name')
    ])
    const vars=v.data||[]
    const vm:Record<string,any[]>={}
    // Deduplicate: keep only one variant per product+name (newest first)
    vars.forEach((vr:any)=>{
      if(!vm[vr.product_id])vm[vr.product_id]=[]
      const exists=vm[vr.product_id].find((x:any)=>x.name===vr.name)
      if(!exists)vm[vr.product_id].push(vr)
    })
    setVariantsMap(vm)
    const enriched=(p.data||[]).map((prod:any)=>{
      if(prod.has_sizes){
        const pv=vm[prod.id]||[]
        return{...prod,stock:pv.reduce((s:number,vr:any)=>s+(Number(vr.stock)||0),0)}
      }
      return prod
    })
    setProducts(enriched)
    setSellers(s.data||[])
  }
  async function loadCustomers(){
    const{data}=await supabase.from('customers').select('id,name,phone').order('name')
    setCustomers(data||[])
  }
  function searchCustomers(q:string){
    setCustomerName(q)
    // Só reseta o cliente selecionado se o usuário apagou/mudou o nome
    if(!q||q!==selectedCustomer?.name)setSelectedCustomer(null)
    if(!q){setCustSearch(customers.slice(0,8));setShowCustDrop(true);return}
    const r=customers.filter((c:any)=>c.name.toLowerCase().includes(q.toLowerCase())||(c.phone||'').includes(q)).slice(0,8)
    setCustSearch(r);setShowCustDrop(r.length>0)
  }
  async function selectCustomer(cust:any){
    setCustomerName(cust.name)
    // Busca contagem real só de pedidos finalizados
    const{data:ords}=await supabase.from('orders')
      .select('id',{count:'exact'})
      .eq('customer_id',cust.id)
      .in('status',['completed','delivered'])
    const realCount=ords?.length||0
    setSelectedCustomer({...cust,order_count:realCount,total_orders:realCount})
    setCustSearch([]);setShowCustDrop(false)
  }
  function handleProductClick(p:any){
    if(p.has_sizes){
      const pv=variantsMap[p.id]||[]
      if(!pv.some((v:any)=>v.stock>0)){toast.error('Todos os sabores estão esgotados');return}
      setVariantPickerModal(p);setPickerVariant('');setPickerQty(1)
    }else{
      addToCart(p)
    }
  }
  function addVariantToCart(){
    if(!variantPickerModal||!pickerVariant)return
    const pv=variantsMap[variantPickerModal.id]||[]
    const v=pv.find((x:any)=>x.id===pickerVariant)
    if(!v)return
    const price=(variantPickerModal.is_promo&&variantPickerModal.promo_price?Number(variantPickerModal.promo_price):Number(variantPickerModal.price))+(Number(v.price_modifier)||0)
    const cartId=variantPickerModal.id+'__'+v.id
    for(let i=0;i<Math.max(1,pickerQty);i++){
      addToCart({...variantPickerModal,id:cartId,name:variantPickerModal.name+' — '+v.name,stock:v.stock,price,_variantId:v.id})
    }
    setVariantPickerModal(null)
  }
  function addToCart(p:any){
    if(p.stock<=0&&!p.has_sizes){toast.error('Produto esgotado');return}
    setCart(prev=>{
      const ex=prev.find(i=>i.id===p.id)
      if(ex){
        if(ex.qty>=p.stock){toast.error('Estoque máximo atingido');return prev}
        return prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i)
      }
      return[...prev,{id:p.id,name:p.name,price:p.is_promo&&p.promo_price?Number(p.promo_price):Number(p.price),stock:p.stock,qty:1,_variantId:p._variantId}]
    })
  }
  function removeFromCart(id:string){setCart(prev=>prev.filter(i=>i.id!==id))}
  function updateQty(id:string,delta:number){
    setCart(prev=>prev.map(i=>{
      if(i.id!==id)return i
      const nq=i.qty+delta
      if(nq<=0)return null as any
      if(nq>i.stock){toast.error('Estoque máximo: '+i.stock);return i}
      return{...i,qty:nq}
    }).filter(Boolean))
  }
  const subtotal=cart.reduce((s,i)=>s+i.price*i.qty,0)
  const total=Math.max(0,subtotal-discount+acrescimo)
  async function applyCoupon(){
    if(!couponCode.trim())return
    setCouponLoading(true)
    const{data}=await supabase.from('coupons').select('*').eq('code',couponCode.toUpperCase()).eq('active',true).maybeSingle()
    if(!data){toast.error('Cupom inválido');setCouponLoading(false);return}
    const disc=data.discount_type==='pct'?subtotal*(data.discount_value/100):data.discount_value
    setDiscount(disc);setCouponData(data)
    toast.success('Cupom aplicado: -'+fmt(disc))
    setCouponLoading(false)
  }
  async function finishSale(){
    if(cart.length===0){toast.error('Carrinho vazio');return}
    const totalPaid=payments.reduce((s,p)=>s+p.amount,0)
    if(totalPaid<total-0.01){toast.error('Pagamento insuficiente: faltam '+fmt(total-totalPaid));return}
    if(!cash.isOpen){toast.error('Abra o caixa antes de vender');return}
    setProcessing(true)
    try{
      const{data:order,error}=await supabase.from('orders').insert({
        status:'completed',type:'pdv',subtotal,total,
        discount,payment_method:payments[0]?.method||'pix',
        customer_name:customerName||null,
        customer_id:selectedCustomer?.id||null,
        seller_id:activeSellerId||null,
        cash_register_id:cash?.current?.id||null
      }).select().single()
      if(error||!order)throw error||new Error('Erro ao criar pedido')
      await supabase.from('order_items').insert(cart.map(i=>({
        order_id:order.id,product_id:i.id.split('__')[0],
        product_name:i.name,quantity:i.qty,unit_price:i.price,
        total_price:i.price*i.qty,variant_id:i._variantId||null
      })))
      await supabase.from('order_payments').insert(payments.filter(p=>p.amount>0).map(p=>({order_id:order.id,method:p.method,amount:p.amount})))
      // Update stock
      for(const item of cart){
        if(item._variantId){
          const{data:vr}=await supabase.from('product_variants').select('stock').eq('id',item._variantId).single()
          if(vr)await supabase.from('product_variants').update({stock:Math.max(0,vr.stock-item.qty)}).eq('id',item._variantId)
        }else{
          const pid=item.id.split('__')[0]
          const{data:pr}=await supabase.from('products').select('stock').eq('id',pid).single()
          if(pr)await supabase.from('products').update({stock:Math.max(0,pr.stock-item.qty)}).eq('id',pid)
        }
      }
      // Update customer loyalty
      if(selectedCustomer?.id){
        await supabase.from('customers').update({last_purchase:new Date().toISOString()}).eq('id',selectedCustomer.id)
      }
      setLastOrder(order);setCart([]);setDiscount(0);setAcrescimo(0);setCouponCode('');setCouponData(null)
      setCustomerName('');setSelectedCustomer(null);setPayments([{method:'pix',amount:0}])
      toast.success('Venda #'+order.order_number+' finalizada!')
      await loadData()
      try{await supabase.from('audit_log').insert({table_name:'orders',record_id:order.id,action:'INSERT',new_data:{total,customer:customerName},user_name:'Admin'})}catch{}
    }catch(e:any){toast.error(e.message||'Erro ao finalizar')}
    finally{setProcessing(false)}
  }
  function printLast(){
    if(!lastOrder)return
    printReceipt({
      ...lastOrder,
      items:cart.map(i=>({
        product_name:i.name,
        quantity:i.qty,
        unit_price:i.price,
        total_price:i.price*i.qty
      })),
      payments:[{method:payments[0]?.method||'pix',amount:lastOrder.total}]
    })
  }
  const filtered=products.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase()))
  return(
    <div style={{display:'flex',height:'100%',background:'var(--bg)',overflow:'hidden'}}>
      {/* Product grid */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,background:'var(--surface)'}}>
          <ShoppingCart size={18} color='var(--neon)'/>
          <h1 className='font-bangers neon-text-sm' style={{fontSize:22,letterSpacing:1}}>PDV</h1>
          <div style={{position:'relative',flex:1}}>
            <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
            <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar produto...' style={{paddingLeft:28,fontSize:13,width:'100%'}}/>
          </div>
          {sellers.length>0&&(
            <select value={activeSellerId||''} onChange={e=>setActiveSellerId(e.target.value||null)} style={{fontSize:12,padding:'6px 8px',maxWidth:140}}>
              <option value=''>Vendedor...</option>
              {sellers.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:12,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8,alignContent:'start'}}>
          {filtered.map((p:any)=>{
            const inCart=cart.find(i=>i.id===p.id||i.id.startsWith(p.id+'__'))
            const stockOk=p.stock>0
            return(
              <div key={p.id} onClick={()=>stockOk&&handleProductClick(p)} className='card' style={{padding:10,cursor:stockOk?'pointer':'not-allowed',opacity:stockOk?1:0.5,transition:'all 0.15s',border:inCart?'1px solid var(--neon)':'1px solid var(--border)'}}>
                {p.image_url&&<img src={p.image_url} alt='' style={{width:'100%',height:72,objectFit:'cover',borderRadius:6,marginBottom:6}}/>}
                <p style={{fontSize:11,fontWeight:600,color:'var(--white)',lineHeight:1.3,marginBottom:4}}>{p.name}</p>
                {p.has_sizes&&<p style={{fontSize:9,color:'#7c3aed',marginBottom:2}}>{(variantsMap[p.id]||[]).filter((v:any)=>v.stock>0).length} sabores</p>}
                <p style={{fontSize:13,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(p.is_promo&&p.promo_price?p.promo_price:p.price)}</p>
                <p style={{fontSize:10,color:p.stock<=3?'#ff5555':'var(--muted)'}}>Estq: {p.stock}</p>
                {!stockOk&&<p style={{fontSize:9,color:'#ff3333',fontWeight:700}}>ESGOTADO</p>}
              </div>
            )
          })}
          {filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:40,color:'var(--muted)'}}>Nenhum produto</div>}
        </div>
      </div>
      {/* Cart panel */}
      <div style={{width:300,borderLeft:'1px solid var(--border)',display:'flex',flexDirection:'column',background:'var(--surface)'}}>
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>
          <p style={{fontSize:11,color:'var(--muted)',marginBottom:6,fontWeight:600,letterSpacing:0.5}}>CLIENTE</p>
          <div style={{position:'relative'}}>
            <User size={12} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',pointerEvents:'none'}}/>
            <input
              value={customerName}
              onChange={e=>searchCustomers(e.target.value)}
              onFocus={()=>{setCustSearch(customers.slice(0,8));setShowCustDrop(true)}}
              onBlur={()=>setTimeout(()=>setShowCustDrop(false),160)}
              placeholder='Nome do cliente (opcional)'
              style={{paddingLeft:26,fontSize:12,width:'100%',borderColor:selectedCustomer?'var(--neon)':undefined}}
            />
            {showCustDrop&&custSearch.length>0&&(
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:'var(--surface)',border:'1px solid var(--neon-dim)',borderRadius:8,zIndex:100,boxShadow:'0 4px 20px rgba(0,0,0,0.5)',overflow:'hidden',marginTop:2,maxHeight:200,overflowY:'auto'}}>
                {custSearch.map((cust:any)=>(
                  <div key={cust.id} onMouseDown={()=>selectCustomer(cust)} style={{padding:'7px 12px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.04)'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(0,255,65,0.06)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                    <span style={{fontSize:12,color:'var(--white)'}}>{cust.name}</span>
                    {cust.phone&&<span style={{fontSize:10,color:'var(--muted)'}}>{cust.phone}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'8px 10px'}}>
          {cart.length===0?(
            <div style={{textAlign:'center',padding:32,color:'var(--muted)'}}>
              <ShoppingCart size={28} style={{opacity:0.2,marginBottom:8}}/>
              <p style={{fontSize:12}}>Carrinho vazio</p>
            </div>
          ):cart.map(item=>(
            <div key={item.id} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:11,color:'var(--white)',fontWeight:500,lineHeight:1.3}}>{item.name}</p>
                <p style={{fontSize:11,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(item.price)}</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                <button onClick={()=>updateQty(item.id,-1)} style={{width:20,height:20,borderRadius:4,border:'1px solid var(--border)',background:'transparent',color:'var(--white)',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={9}/></button>
                <span style={{fontSize:12,fontWeight:700,color:'var(--white)',minWidth:16,textAlign:'center' as const}}>{item.qty}</span>
                <button onClick={()=>updateQty(item.id,1)} style={{width:20,height:20,borderRadius:4,border:'1px solid var(--border)',background:'transparent',color:'var(--white)',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={9}/></button>
                <button onClick={()=>removeFromCart(item.id)} style={{width:20,height:20,borderRadius:4,border:'none',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={9}/></button>
              </div>
            </div>
          ))}
        </div>
        <div style={{padding:'8px 12px',borderTop:'1px solid var(--border)'}}>
          {/* Coupon */}
          <div style={{display:'flex',gap:6,marginBottom:8}}>
            <div style={{position:'relative',flex:1}}>
              <Tag size={10} style={{position:'absolute',left:7,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
              <input value={couponCode} onChange={e=>setCouponCode(e.target.value.toUpperCase())} placeholder='CUPOM' style={{paddingLeft:22,fontSize:11,width:'100%'}}/>
            </div>
            <button onClick={applyCoupon} disabled={couponLoading||!couponCode} style={{padding:'5px 10px',borderRadius:6,border:'1px solid var(--neon-dim)',background:'transparent',color:'var(--neon)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>OK</button>
          </div>
          {/* Discount */}
          {discount>0&&<p style={{fontSize:11,color:'#f59e0b',marginBottom:6}}>Desconto: -{fmt(discount)}</p>}
          {/* Desconto/Acréscimo */}
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <button onClick={()=>setDiscountModal('discount')} style={{flex:1,padding:'7px 10px',borderRadius:8,background:discount>0?'rgba(0,255,65,0.15)':'#1a1a1a',border:discount>0?'1px solid #00ff41':'1px solid #2a2a2a',color:discount>0?'#00ff41':'#888',cursor:'pointer',fontSize:12,fontWeight:600}}>
              {discount>0?('Desc -'+discount.toFixed(2)):'Desconto'}
            </button>
            <button onClick={()=>setDiscountModal('acrescimo')} style={{flex:1,padding:'7px 10px',borderRadius:8,background:acrescimo>0?'rgba(245,158,11,0.15)':'#1a1a1a',border:acrescimo>0?'1px solid #f59e0b':'1px solid #2a2a2a',color:acrescimo>0?'#f59e0b':'#888',cursor:'pointer',fontSize:12,fontWeight:600}}>
              {acrescimo>0?('Acresc +'+acrescimo.toFixed(2)):'+Acrescimo'}
            </button>
            <span style={{fontSize:11,color:'var(--muted)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(subtotal)}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            <span style={{fontSize:16,fontWeight:700,color:'var(--white)',fontFamily:'Bangers,cursive',letterSpacing:0.5}}>TOTAL</span>
            <span style={{fontSize:18,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(total)}</span>
          </div>
          {/* Payments */}
          <p style={{fontSize:10,color:'var(--muted)',marginBottom:4,fontWeight:600,letterSpacing:0.5}}>PAGAMENTO</p>
          {payments.map((pay,idx)=>(
            <div key={idx} style={{display:'flex',gap:5,marginBottom:5,alignItems:'center'}}>
              <select value={pay.method} onChange={e=>setPayments(ps=>ps.map((p,i)=>i===idx?{...p,method:e.target.value}:p))} style={{flex:1,fontSize:11,padding:'4px 6px'}}>
                {['pix','dinheiro','debito','credito','fiado'].map(m=><option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
              </select>
              <input type='number' value={pay.amount||''} onChange={e=>setPayments(ps=>ps.map((p,i)=>i===idx?{...p,amount:parseFloat(e.target.value)||0}:p))} placeholder='0,00' style={{width:72,fontSize:11,textAlign:'right' as const}}/>
              {payments.length>1&&<button onClick={()=>setPayments(ps=>ps.filter((_,i)=>i!==idx))} style={{background:'none',border:'none',color:'#ff3333',cursor:'pointer',padding:2}}><X size={11}/></button>}
            </div>
          ))}
          <button onClick={()=>setPayments(ps=>[...ps,{method:'pix',amount:0}])} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--muted)',background:'none',border:'none',cursor:'pointer',padding:'2px 0',marginBottom:8}}>
            <Plus size={10}/>Forma de pagamento
          </button>
          {/* Quick fill */}
          {cart.length>0&&(
            <button onClick={()=>setPayments(ps=>ps.map((p,i)=>i===0?{...p,amount:total}:p))} style={{width:'100%',padding:'4px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:10,marginBottom:6}}>
              Preencher total: {fmt(total)}
            </button>
          )}
          {/* Finish */}
          <button onClick={finishSale} disabled={processing||cart.length===0} className='btn-neon-fill' style={{width:'100%',fontSize:14,padding:'10px',opacity:cart.length===0?0.4:1}}>
            <Check size={13} style={{display:'inline',marginRight:5}}/>
            {processing?'PROCESSANDO...':'FINALIZAR VENDA'}
          </button>
          {lastOrder&&(
            <button onClick={printLast} style={{width:'100%',marginTop:4,padding:'6px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
              <Printer size={11}/>Reimprimir #{lastOrder.order_number}
            </button>
          )}
        </div>
      </div>
      {/* Variant picker modal */}
      {discountModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div style={{background:'#161616',borderRadius:16,padding:24,width:300,border:'1px solid #2a2a2a'}}>
            <h3 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#00ff41',letterSpacing:1,marginBottom:16}}>
              {discountModal==='discount'?'DESCONTO':'ACRÉSCIMO'}
            </h3>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <button onClick={()=>setDiscountType('pct')} style={{flex:1,padding:'8px',borderRadius:8,border:discountType==='pct'?'2px solid #00ff41':'1px solid #333',background:discountType==='pct'?'rgba(0,255,65,0.1)':'transparent',color:discountType==='pct'?'#00ff41':'#888',cursor:'pointer',fontSize:13}}>%</button>
              <button onClick={()=>setDiscountType('fixed')} style={{flex:1,padding:'8px',borderRadius:8,border:discountType==='fixed'?'2px solid #00ff41':'1px solid #333',background:discountType==='fixed'?'rgba(0,255,65,0.1)':'transparent',color:discountType==='fixed'?'#00ff41':'#888',cursor:'pointer',fontSize:13}}>R$</button>
            </div>
            <input autoFocus type='number' min='0' value={discountValue} onChange={e=>setDiscountValue(e.target.value)}
              placeholder={discountType==='pct'?'Ex: 10 (%)':'Ex: 5.00 (R$)'}
              style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #333',background:'#1a1a1a',color:'#fff',fontSize:15,boxSizing:'border-box' as const,outline:'none'}}/>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button onClick={()=>{setDiscountModal(null);setDiscountValue('')}} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #333',background:'transparent',color:'#888',cursor:'pointer',fontSize:13}}>Cancelar</button>
              <button onClick={()=>{
                const val=parseFloat(discountValue)||0
                const calc=discountType==='pct'?subtotal*(val/100):val
                if(discountModal==='discount')setDiscount(Math.min(subtotal,calc))
                else setAcrescimo(calc)
                setDiscountModal(null);setDiscountValue('')
              }} style={{flex:2,padding:'10px',borderRadius:10,border:'none',background:'#00ff41',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1}}>APLICAR</button>
            </div>
          </div>
        </div>
      )}
      {variantPickerModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:400,padding:24,border:'1px solid var(--neon-dim)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div>
                <h2 className='font-bangers neon-text-sm' style={{fontSize:20}}>ESCOLHA O SABOR</h2>
                <p style={{fontSize:12,color:'var(--muted)'}}>{variantPickerModal.name} — {fmt(variantPickerModal.is_promo&&variantPickerModal.promo_price?variantPickerModal.promo_price:variantPickerModal.price)}</p>
              </div>
              <button onClick={()=>setVariantPickerModal(null)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20,lineHeight:1}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:260,overflowY:'auto',marginBottom:14}}>
              {(variantsMap[variantPickerModal.id]||[]).filter((v:any)=>v.stock>0).map((v:any)=>(
                <button key={v.id} onClick={()=>setPickerVariant(v.id)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:8,border:pickerVariant===v.id?'2px solid var(--neon)':'1px solid var(--border)',background:pickerVariant===v.id?'var(--neon-glow)':'transparent',cursor:'pointer',textAlign:'left' as const}}>
                  <span style={{fontSize:13,color:pickerVariant===v.id?'var(--neon)':'var(--white)',fontWeight:pickerVariant===v.id?700:400}}>{v.name}</span>
                  <span style={{fontSize:11,color:'var(--muted)'}}>estq: {v.stock}</span>
                </button>
              ))}
              {(variantsMap[variantPickerModal.id]||[]).filter((v:any)=>v.stock===0).map((v:any)=>(
                <div key={v.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderRadius:8,border:'1px solid var(--border)',opacity:0.4}}>
                  <span style={{fontSize:13,color:'var(--muted)'}}>{v.name}</span>
                  <span style={{fontSize:11,color:'#ff3333'}}>Esgotado</span>
                </div>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <span style={{fontSize:12,color:'var(--muted)'}}>Qtd:</span>
              <button onClick={()=>setPickerQty(q=>Math.max(1,q-1))} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--white)',cursor:'pointer'}}>-</button>
              <span style={{fontSize:14,fontWeight:700,color:'var(--white)',minWidth:18,textAlign:'center' as const}}>{pickerQty}</span>
              <button onClick={()=>{const v=(variantsMap[variantPickerModal.id]||[]).find((x:any)=>x.id===pickerVariant);if(!pickerVariant||pickerQty<(v?.stock||1))setPickerQty(q=>q+1)}} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--white)',cursor:'pointer'}}>+</button>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setVariantPickerModal(null)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={addVariantToCart} disabled={!pickerVariant} className='btn-neon-fill' style={{flex:2,fontSize:14,opacity:pickerVariant?1:0.4}}>ADICIONAR</button>
            </div>
          </div>
        </div>
      )}
      {/* Cash register modal */}
      {cash.openModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div className='card' style={{padding:28,width:300,border:'1px solid var(--neon-dim)'}}>
            <h2 className='font-bangers neon-text-sm' style={{fontSize:22,marginBottom:12}}>ABRIR CAIXA</h2>
            <p style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>Saldo inicial (R$)</p>
            <input type='number' min='0' step='0.01' value={cash.openBal} onChange={e=>cash.setOpenBal(e.target.value)} placeholder='0,00' autoFocus style={{fontSize:20,textAlign:'center' as const,fontFamily:'JetBrains Mono,monospace',marginBottom:16,width:'100%'}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>cash.setOpenModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={cash.openCash} className='btn-neon-fill' style={{flex:2,fontSize:14}}>ABRIR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}