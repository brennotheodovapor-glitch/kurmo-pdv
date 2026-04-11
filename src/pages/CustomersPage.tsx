import{useState,useEffect}from 'react'
import{Users,Search,ChevronDown,ChevronUp,Phone,ShoppingBag,TrendingUp,Clock,Trash2}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function CustomersPage(){
  const[customers,setCustomers]=useState<any[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[expanded,setExpanded]=useState<string|null>(null)
  const[orders,setOrders]=useState<Record<string,any[]>>({})

  useEffect(()=>{load()},[]) 

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('customers').select('*').order('orders_count',{ascending:false})
    setCustomers(data||[])
    setLoading(false)
  }

  async function expand(id:string){
    if(expanded===id){setExpanded(null);return}
    setExpanded(id)
    if(!orders[id]){
      const{data}=await supabase.from('orders').select('id,order_number,total,status,type,created_at').eq('customer_phone',(customers.find(c=>c.id===id)?.phone||'')).order('created_at',{ascending:false}).limit(20)
      setOrders(o=>({...o,[id]:data||[]}))
    }
  }

  async function deleteCustomer(id:string){
    if(!confirm('Remover este cliente?'))return
    await supabase.from('customers').delete().eq('id',id)
    toast.success('Cliente removido');load()
  }

  const filtered=customers.filter(c=>!search||(c.name||'').toLowerCase().includes(search.toLowerCase())||c.phone?.includes(search))
  const totalSpent=customers.reduce((s,c)=>s+Number(c.total_spent||0),0)
  const totalOrders=customers.reduce((s,c)=>s+(c.orders_count||0),0)

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <Users size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>CLIENTES</h1>
        <div style={{position:'relative',maxWidth:220,flex:1}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar por nome ou tel...' style={{paddingLeft:28,fontSize:13}}/>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:16}}>
          {[{l:'Total clientes',v:String(customers.length),c:'var(--neon)'},{l:'Pedidos',v:String(totalOrders),c:'#06b6d4'},{l:'Receita',v:fmt(totalSpent),c:'#f59e0b'}].map((k,i)=>(
            <div key={i} style={{textAlign:'center'}}><p style={{fontSize:16,fontWeight:700,color:k.c,fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p><p style={{fontSize:10,color:'var(--muted)'}}>{k.l}</p></div>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        filtered.length===0?(
          <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}><Users size={48} style={{opacity:0.3,marginBottom:12}}/><p style={{fontFamily:'Bangers,cursive',fontSize:18}}>NENHUM CLIENTE</p><p style={{fontSize:13,marginTop:6}}>Clientes sao salvos automaticamente ao fazer pedidos pelo Delivery ou Catalogo.</p></div>
        ):filtered.map(c=>(
          <div key={c.id} className='card' style={{marginBottom:8,overflow:'hidden',borderLeft:'3px solid '+(c.orders_count>=10?'#f59e0b':c.orders_count>=5?'#06b6d4':'var(--border)')}}> 
            <div onClick={()=>expand(c.id)} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',flexWrap:'wrap'}}>
              <div style={{width:40,height:40,borderRadius:12,background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:16,fontWeight:700,color:'var(--neon)'}}>{(c.name||'?')[0].toUpperCase()}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:14,fontWeight:600,color:'var(--white)'}}>{c.name}</p>
                <div style={{display:'flex',gap:10,marginTop:2,flexWrap:'wrap'}}>
                  <span style={{fontSize:12,color:'var(--muted)',display:'flex',alignItems:'center',gap:3}}><Phone size={10}/>{c.phone}</span>
                  {c.neighborhood&&<span style={{fontSize:11,color:'var(--muted)'}}>{c.neighborhood}</span>}
                  {c.updated_at&&<span style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:3}}><Clock size={10}/>Ultimo: {new Date(c.updated_at).toLocaleDateString('pt-BR')}</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:16,alignItems:'center'}}>
                <div style={{textAlign:'center'}}><p style={{fontSize:16,fontWeight:700,color:'var(--white)'}}>{c.orders_count||0}</p><p style={{fontSize:10,color:'var(--muted)'}}>pedidos</p></div>
                <div style={{textAlign:'center'}}><p style={{fontSize:14,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(c.total_spent)||0)}</p><p style={{fontSize:10,color:'var(--muted)'}}>total gasto</p></div>
                <button onClick={e=>{e.stopPropagation();deleteCustomer(c.id)}} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',padding:4,opacity:0.5}}><Trash2 size={14}/></button>
                {expanded===c.id?<ChevronUp size={14} color='var(--muted)'/>:<ChevronDown size={14} color='var(--muted)'/>}
              </div>
            </div>
            {expanded===c.id&&(
              <div style={{padding:'0 16px 12px',borderTop:'1px solid var(--border)'}}>
                {c.address&&<p style={{fontSize:12,color:'var(--muted)',padding:'8px 0'}}>{c.address}{c.complement?' - '+c.complement:''}{c.neighborhood?', '+c.neighborhood:''}</p>}
                {c.reference&&<p style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>Ref: {c.reference}</p>}
                <p style={{fontSize:11,color:'var(--muted)',letterSpacing:1,marginBottom:6,marginTop:4}}>HISTORICO DE PEDIDOS</p>
                {(orders[c.id]||[]).length===0
                  ?<p style={{fontSize:12,color:'var(--muted)'}}>Nenhum pedido encontrado</p>
                  :(orders[c.id]||[]).map(o=>(
                    <div key={o.id} style={{display:'flex',alignItems:'center',gap:10,padding:'5px 0',borderBottom:'1px solid rgba(26,46,26,0.4)'}}>
                      <span style={{fontSize:11,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace',minWidth:32}}>#{o.order_number}</span>
                      <span style={{fontSize:11,color:'var(--muted)',flex:1}}>{new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                      <span style={{fontSize:11,padding:'2px 7px',borderRadius:6,background:o.type==='delivery'?'rgba(6,182,212,0.1)':'rgba(0,255,65,0.1)',color:o.type==='delivery'?'#06b6d4':'var(--neon)'}}>{o.type==='delivery'?'Delivery':'PDV'}</span>
                      <span style={{fontSize:12,fontWeight:600,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(o.total)}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}