import{useState,useEffect}from 'react'
import{QrCode,ExternalLink,Copy,Check,RefreshCw,ShoppingBag,Clock,CheckCircle,XCircle,Eye,Truck,Phone}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Order={id:string;order_number:number;customer_name:string;customer_phone:string;status:string;total:number;created_at:string;notes:string|null}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const STATUS_COLORS:Record<string,string>={pending:'#ffaa00',accepted:'#06b6d4',preparing:'#7c3aed',ready:'#00ff41',delivering:'#f59e0b',delivered:'#10b981',cancelled:'#ff3333',completed:'#00ff41'}
const STATUS_LABELS:Record<string,string>={pending:'AGUARDANDO',accepted:'ACEITO',preparing:'PREPARANDO',ready:'PRONTO',delivering:'SAIU',delivered:'ENTREGUE',cancelled:'CANCELADO',completed:'CONCLUIDO'}
const NEXT_STATUS:Record<string,string>={pending:'accepted',accepted:'preparing',preparing:'ready',ready:'delivering',delivering:'delivered'}

export default function MenuPage(){
  const MENU_URL=window.location.origin+'/menu'
  const[copied,setCopied]=useState(false)
  const[orders,setOrders]=useState<Order[]>([])
  const[loading,setLoading]=useState(true)
  const[tab,setTab]=useState<'qr'|'orders'>('qr')
  const[expanded,setExpanded]=useState<string|null>(null)
  const[itemsCache,setItemsCache]=useState<Record<string,any[]>>({})

  useEffect(()=>{
    loadOrders()
    // Realtime subscription for new orders
    const ch=supabase.channel('delivery_orders').on('postgres_changes',{event:'*',schema:'public',table:'orders',filter:'type=eq.delivery'},()=>loadOrders()).subscribe()
    return()=>{supabase.removeChannel(ch)}
  },[])

  async function loadOrders(){
    setLoading(true)
    const{data}=await supabase.from('orders').select('*').eq('type','delivery').order('created_at',{ascending:false}).limit(50)
    setOrders(data||[]);setLoading(false)
  }

  async function expandOrder(id:string){
    if(expanded===id){setExpanded(null);return}
    setExpanded(id)
    if(!itemsCache[id]){
      const{data}=await supabase.from('order_items').select('*').eq('order_id',id)
      setItemsCache(c=>({...c,[id]:data||[]}))
    }
  }

  async function updateStatus(id:string,status:string){
    await supabase.from('orders').update({status}).eq('id',id)
    toast.success('Status atualizado!')
    loadOrders()
  }

  function copyLink(){
    navigator.clipboard.writeText(MENU_URL)
    setCopied(true);toast.success('Link copiado!')
    setTimeout(()=>setCopied(false),2000)
  }

  const pendingCount=orders.filter(o=>['pending','accepted','preparing','ready','delivering'].includes(o.status)).length

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <QrCode size={20} color="var(--neon)"/>
        <h1 className="font-bangers neon-text-sm" style={{fontSize:26}}>CARDAPIO DIGITAL</h1>
        <div style={{display:'flex',gap:8,marginLeft:'auto'}}>
          <button onClick={()=>setTab('qr')} style={{padding:'7px 16px',borderRadius:8,border:tab==='qr'?'1px solid var(--neon)':'1px solid var(--border)',background:tab==='qr'?'var(--neon-glow)':'transparent',color:tab==='qr'?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',letterSpacing:1}}>
            QR CODE & LINK
          </button>
          <button onClick={()=>setTab('orders')} style={{padding:'7px 16px',borderRadius:8,border:tab==='orders'?'1px solid var(--neon)':'1px solid var(--border)',background:tab==='orders'?'var(--neon-glow)':'transparent',color:tab==='orders'?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',letterSpacing:1,position:'relative'}}>
            PEDIDOS DELIVERY
            {pendingCount>0&&<span style={{position:'absolute',top:-6,right:-6,background:'#ffaa00',color:'#000',borderRadius:'50%',width:18,height:18,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{pendingCount}</span>}
          </button>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
        {tab==='qr'?(
          <div style={{maxWidth:680,margin:'0 auto'}}>
            {/* URL Card */}
            <div className="card" style={{padding:24,marginBottom:16}}>
              <p style={{fontSize:12,color:'var(--muted)',letterSpacing:1,marginBottom:10}}>LINK DO CARDAPIO — envie para seus clientes</p>
              <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:200,padding:'11px 14px',background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)',fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'var(--neon)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {MENU_URL}
                </div>
                <button onClick={copyLink} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:10,border:'1px solid var(--border)',background:copied?'var(--neon-glow)':'var(--card)',color:copied?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:13,whiteSpace:'nowrap'}}>
                  {copied?<><Check size={14}/>Copiado!</>:<><Copy size={14}/>Copiar link</>}
                </button>
                <a href={MENU_URL} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:10,border:'1px solid var(--neon)',background:'var(--neon-glow)',color:'var(--neon)',textDecoration:'none',fontSize:13,whiteSpace:'nowrap'}}>
                  <ExternalLink size={14}/>Ver cardapio
                </a>
              </div>
            </div>

            {/* QR Code */}
            <div className="card" style={{padding:24,marginBottom:16,display:'flex',gap:24,alignItems:'flex-start',flexWrap:'wrap'}}>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:12,color:'var(--muted)',letterSpacing:1,marginBottom:12}}>QR CODE</p>
                {/* QR via Google Charts API */}
                <div style={{padding:12,background:'white',borderRadius:12,display:'inline-block'}}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(MENU_URL)}`} alt="QR Code" style={{width:200,height:200,display:'block'}}/>
                </div>
                <p style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Escaneie para abrir o cardapio</p>
                <a href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(MENU_URL)}`} download="qrcode-cardapio.png" target="_blank" style={{display:'inline-block',marginTop:8,fontSize:12,color:'var(--neon)',textDecoration:'none',border:'1px solid var(--border)',borderRadius:8,padding:'5px 12px'}}>
                  ⬇ Baixar QR Code
                </a>
              </div>
              <div style={{flex:1,minWidth:200}}>
                <p style={{fontSize:12,color:'var(--muted)',letterSpacing:1,marginBottom:12}}>COMO USAR</p>
                {[
                  {n:'1',t:'Imprima ou exiba o QR Code no balcao ou embalagens'},
                  {n:'2',t:'O cliente escaneia com a camera do celular'},
                  {n:'3',t:'Escolhe os produtos e faz o pedido com endereco'},
                  {n:'4',t:'O pedido aparece aqui em Pedidos Delivery em tempo real'},
                  {n:'5',t:'Voce atualiza o status: Aceito → Preparando → Saiu para entrega'},
                ].map(s=>(
                  <div key={s.n} style={{display:'flex',gap:10,marginBottom:10,alignItems:'flex-start'}}>
                    <div style={{width:22,height:22,borderRadius:'50%',background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'var(--neon)',flexShrink:0}}>{s.n}</div>
                    <p style={{fontSize:13,color:'var(--text)',lineHeight:1.4}}>{s.t}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview card */}
            <div className="card" style={{padding:20}}>
              <p style={{fontSize:12,color:'var(--muted)',letterSpacing:1,marginBottom:12}}>DICA — adicione fotos nos produtos</p>
              <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6}}>
                Produtos com fotos vendem muito mais no cardapio digital. Acesse <strong style={{color:'var(--neon)'}}>Produtos</strong> no menu lateral e clique no icone de foto para adicionar imagens. As fotos aparecem automaticamente no cardapio.
              </p>
            </div>
          </div>
        ):(
          /* Delivery Orders */
          <div style={{maxWidth:720,margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
              <div style={{display:'flex',gap:16}}>
                {[{s:'pending',l:'Aguardando'},{s:'accepted',l:'Aceitos'},{s:'preparing',l:'Preparando'},{s:'ready',l:'Prontos'},{s:'delivering',l:'A caminho'}].map(st=>{
                  const n=orders.filter(o=>o.status===st.s).length
                  return n>0?<div key={st.s} style={{textAlign:'center'}}><p style={{fontSize:18,fontWeight:700,color:STATUS_COLORS[st.s],fontFamily:'JetBrains Mono,monospace'}}>{n}</p><p style={{fontSize:10,color:'var(--muted)'}}>{st.l}</p></div>:null
                })}
              </div>
              <button onClick={loadOrders} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--card)',color:'var(--muted)',cursor:'pointer',fontSize:12}}>
                <RefreshCw size={13}/>Atualizar
              </button>
            </div>

            {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
            orders.length===0?<div style={{textAlign:'center',padding:64,color:'var(--muted)'}}><ShoppingBag size={40} style={{opacity:0.3,marginBottom:12}}/><p>Nenhum pedido de delivery ainda</p><p style={{fontSize:12,marginTop:4}}>Compartilhe o link do cardapio para receber pedidos</p></div>:
            orders.map(o=>(
              <div key={o.id} className="card" style={{marginBottom:10,overflow:'hidden',borderLeft:'3px solid '+(STATUS_COLORS[o.status]||'var(--border)')}}>
                <div onClick={()=>expandOrder(o.id)} style={{padding:'12px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,color:'var(--neon)',minWidth:36}}>#{o.order_number}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{o.customer_name}</p>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:2,flexWrap:'wrap'}}>
                      <span style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:3}}><Phone size={10}/>{o.customer_phone}</span>
                      <span style={{fontSize:11,color:'var(--muted)'}}>{new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,background:(STATUS_COLORS[o.status]||'#888')+'20',color:STATUS_COLORS[o.status]||'#888',whiteSpace:'nowrap'}}>{STATUS_LABELS[o.status]||o.status}</span>
                  <span style={{fontSize:15,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(o.total)}</span>
                </div>
                {expanded===o.id&&(
                  <div style={{padding:'0 16px 14px',borderTop:'1px solid var(--border)'}}>
                    {o.notes&&<div style={{padding:'8px 12px',background:'var(--surface)',borderRadius:8,marginBottom:10,fontSize:12,color:'var(--text)',display:'flex',alignItems:'flex-start',gap:6}}><Truck size={12} style={{flexShrink:0,marginTop:2,color:'var(--muted)'}}/><span><strong>Endereco:</strong> {o.notes}</span></div>}
                    <div style={{marginBottom:12}}>
                      {(itemsCache[o.id]||[]).map(i=>(
                        <div key={i.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0'}}>
                          <span style={{color:'var(--text)'}}>{i.quantity}x {i.product_name}</span>
                          <span style={{color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(i.total_price)}</span>
                        </div>
                      ))}
                    </div>
                    {/* Action buttons */}
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {NEXT_STATUS[o.status]&&(
                        <button onClick={()=>updateStatus(o.id,NEXT_STATUS[o.status])} style={{flex:2,padding:'8px 12px',borderRadius:8,border:'1px solid var(--neon)',background:'var(--neon-glow)',color:'var(--neon)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',letterSpacing:1}}>
                          ✓ {STATUS_LABELS[NEXT_STATUS[o.status]]}
                        </button>
                      )}
                      {o.status!=='cancelled'&&o.status!=='delivered'&&o.status!=='completed'&&(
                        <button onClick={()=>updateStatus(o.id,'cancelled')} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',letterSpacing:1}}>
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}