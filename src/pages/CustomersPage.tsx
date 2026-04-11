import{useState,useEffect}from 'react'
import{Users,Search,Phone,ShoppingBag,TrendingUp,ChevronDown,ChevronUp,Trash2,Calendar}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Customer={id:string;name:string;phone:string;email?:string;address?:string;neighborhood?:string;zip_code?:string;orders_count:number;total_spent:number;created_at:string;updated_at:string}
type Order={id:string;order_number:number;total:number;type:string;status:string;created_at:string}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function CustomersPage(){
  const[customers,setCustomers]=useState<Customer[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[expanded,setExpanded]=useState<string|null>(null)
  const[ordersCache,setOrdersCache]=useState<Record<string,Order[]>>({})

  useEffect(()=>{load()},[]) 

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('customers').select('*').order('updated_at',{ascending:false})
    setCustomers(data||[])
    setLoading(false)
  }

  async function expand(id:string){
    if(expanded===id){setExpanded(null);return}
    setExpanded(id)
    if(!ordersCache[id]){
      const{data}=await supabase.from('orders').select('id,order_number,total,type,status,created_at').eq('customer_phone',(customers.find(c=>c.id===id)?.phone||'')).order('created_at',{ascending:false}).limit(20)
      setOrdersCache(c=>({...c,[id]:data||[]}))
    }
  }

  async function deleteCustomer(id:string){
    if(!confirm('Remover cliente?'))return
    await supabase.from('customers').delete().eq('id',id)
    toast.success('Cliente removido')
    load()
  }

  const filtered=customers.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search.replace(/\D/g,'')))
  const totalRevenue=customers.reduce((s,c)=>s+Number(c.total_spent),0)

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <Users size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>CLIENTES</h1>
        <div style={{position:'relative',flex:1,maxWidth:240}}>
          <Search size={13} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Nome ou telefone...' style={{paddingLeft:26,fontSize:13}}/>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:20}}>
          <div><p style={{fontSize:18,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{customers.length}</p><p style={{fontSize:10,color:'var(--muted)'}}>clientes</p></div>
          <div><p style={{fontSize:18,fontWeight:700,color:'#f59e0b',fontFamily:'JetBrains Mono,monospace'}}>{fmt(totalRevenue)}</p><p style={{fontSize:10,color:'var(--muted)'}}>receita total</p></div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        filtered.length===0?(
          <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}><Users size={40} style={{opacity:0.3,marginBottom:12}}/><p style={{fontFamily:'Bangers,cursive',fontSize:18}}>NENHUM CLIENTE</p><p style={{fontSize:12,marginTop:6}}>Os clientes aparecem automaticamente ao fazer pedidos no Delivery ou Catalogo.</p></div>
        ):filtered.map(customer=>(
          <div key={customer.id} className='card' style={{marginBottom:8,overflow:'hidden'}}>
            <div onClick={()=>expand(customer.id)} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',flexWrap:'wrap'}}>
              <div style={{width:40,height:40,borderRadius:12,background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bangers,cursive',fontSize:18,color:'var(--neon)',flexShrink:0}}>
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:14,fontWeight:600,color:'var(--white)'}}>{customer.name}</p>
                <div style={{display:'flex',gap:10,marginTop:2,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:3}}><Phone size={10}/>{customer.phone}</span>
                  {customer.neighborhood&&<span style={{fontSize:11,color:'var(--muted)'}}>{customer.neighborhood}</span>}
                  <span style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:3}}><Calendar size={10}/>Desde {new Date(customer.created_at).toLocaleDateString('pt-BR',{month:'2-digit',year:'2-digit'})}</span>
                </div>
              </div>
              <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:15,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(customer.total_spent))}</p>
                  <p style={{fontSize:10,color:'var(--muted)'}}>total gasto</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontSize:15,fontWeight:700,color:'var(--white)'}}>{customer.orders_count}</p>
                  <p style={{fontSize:10,color:'var(--muted)'}}>pedidos</p>
                </div>
                {customer.orders_count>0&&<div style={{textAlign:'right'}}>
                  <p style={{fontSize:13,fontWeight:600,color:'#f59e0b',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(customer.total_spent)/customer.orders_count)}</p>
                  <p style={{fontSize:10,color:'var(--muted)'}}>ticket medio</p>
                </div>}
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <button onClick={e=>{e.stopPropagation();deleteCustomer(customer.id)}} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',padding:4,borderRadius:6,opacity:0.5}}><Trash2 size={14}/></button>
                {expanded===customer.id?<ChevronUp size={14} color='var(--muted)'/>:<ChevronDown size={14} color='var(--muted)'/>}
              </div>
            </div>
            {expanded===customer.id&&(
              <div style={{borderTop:'1px solid var(--border)',padding:'10px 16px'}}>
                {customer.address&&<p style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>{customer.address}{customer.neighborhood?', '+customer.neighborhood:''}</p>}
                <p style={{fontSize:11,color:'var(--muted)',marginBottom:8,fontWeight:600}}>ULTIMOS PEDIDOS</p>
                {(ordersCache[customer.id]||[]).length===0
                  ?<p style={{fontSize:12,color:'var(--muted)'}}>Buscando historico...</p>
                  :(ordersCache[customer.id]||[]).map(o=>(
                    <div key={o.id} style={{display:'flex',alignItems:'center',gap:10,padding:'5px 0',borderBottom:'1px solid rgba(26,46,26,0.3)'}}>
                      <span style={{fontSize:11,color:'var(--neon)',minWidth:36,fontFamily:'JetBrains Mono,monospace'}}>#{o.order_number}</span>
                      <span style={{fontSize:11,color:'var(--muted)',flex:1}}>{new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                      <span style={{fontSize:10,padding:'1px 7px',borderRadius:10,background:o.type==='pdv'?'rgba(0,255,65,0.1)':'rgba(6,182,212,0.1)',color:o.type==='pdv'?'var(--neon)':'#06b6d4'}}>{o.type==='pdv'?'PDV':'Delivery'}</span>
                      <span style={{fontSize:12,fontWeight:600,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(o.total))}</span>
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