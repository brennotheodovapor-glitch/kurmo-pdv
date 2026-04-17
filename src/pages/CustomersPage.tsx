import{useState,useEffect}from 'react'
import{Users,Search,Phone,ShoppingBag,Gift,ChevronDown,ChevronUp,Award}from 'lucide-react'
import{supabase}from '@/lib/supabase'

type Customer={id:string;name:string;phone:string;address?:string;neighborhood?:string;orders_count:number;total_spent:number;created_at:string}
type Order={id:string;order_number:number;total:number;status:string;type:string;created_at:string}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const GOAL=5

export default function CustomersPage(){
  const[customers,setCustomers]=useState<Customer[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[expanded,setExpanded]=useState<string|null>(null)
  const[ordersMap,setOrdersMap]=useState<Record<string,Order[]>>({})
  const[loadingId,setLoadingId]=useState<string|null>(null)

  useEffect(()=>{load()},[])

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('customers').select('*').order('total_spent',{ascending:false})
    setCustomers(data||[])
    setLoading(false)
  }

  async function toggle(c:Customer){
    if(expanded===c.id){setExpanded(null);return}
    setExpanded(c.id)
    if(ordersMap[c.id])return
    setLoadingId(c.id)
    try{
      const phone=c.phone.replace(/\D/g,'')
      // Search by phone (with and without formatting) OR by name
      const{data}=await supabase.from('orders')
        .select('id,order_number,total,status,type,created_at')
        .in('status',['completed','delivered'])
        .or('customer_phone.eq.'+phone+',customer_phone.ilike.%'+phone+'%,customer_name.ilike.%'+c.name.split(' ')[0]+'%')
        .order('created_at',{ascending:false})
        .limit(50)
      setOrdersMap(m=>({...m,[c.id]:data||[]}))
    }catch(e){
      setOrdersMap(m=>({...m,[c.id]:[]}))
    }finally{
      setLoadingId(null)
    }
  }

  const filtered=customers.filter(c=>
    !search||c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search)
  )

  const totalRevenue=customers.reduce((s,c)=>s+Number(c.total_spent),0)
  const avgTicket=customers.length>0?totalRevenue/customers.length:0

  function loyalty(count:number){
    const inCycle=count%GOAL
    const cycles=Math.floor(count/GOAL)
    const readyForBrinde=count>0&&inCycle===0
    return{inCycle,cycles,readyForBrinde,next:readyForBrinde?0:GOAL-inCycle}
  }

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',flexShrink:0}}>
        <Users size={18} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:24}}>CLIENTES</h1>
        <div style={{position:'relative',flex:1,minWidth:160,maxWidth:300}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar nome ou telefone...' style={{paddingLeft:30,fontSize:13}}/>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',background:'var(--surface)',flexShrink:0}}>
        <div style={{flex:1,padding:'10px 14px',borderRight:'1px solid var(--border)'}}>
          <p style={{fontSize:18,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{customers.length}</p>
          <p style={{fontSize:10,color:'var(--muted)'}}>Clientes</p>
        </div>
        <div style={{flex:1,padding:'10px 14px',borderRight:'1px solid var(--border)'}}>
          <p style={{fontSize:18,fontWeight:700,color:'#f59e0b',fontFamily:'JetBrains Mono,monospace'}}>{fmt(totalRevenue)}</p>
          <p style={{fontSize:10,color:'var(--muted)'}}>Receita total</p>
        </div>
        <div style={{flex:1,padding:'10px 14px',borderRight:'1px solid var(--border)'}}>
          <p style={{fontSize:18,fontWeight:700,color:'#06b6d4',fontFamily:'JetBrains Mono,monospace'}}>{fmt(avgTicket)}</p>
          <p style={{fontSize:10,color:'var(--muted)'}}>Ticket médio</p>
        </div>
        <div style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:6}}>
          <Gift size={14} color='#f59e0b'/>
          <div>
            <p style={{fontSize:11,fontWeight:600,color:'#f59e0b',fontFamily:'Bangers,cursive',letterSpacing:0.5}}>FIDELIDADE</p>
            <p style={{fontSize:9,color:'var(--muted)'}}>Brinde a cada {GOAL} compras</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{flex:1,overflowY:'auto',padding:'10px 14px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        filtered.length===0?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}><Users size={32} style={{opacity:0.2,marginBottom:8}}/><p>Nenhum cliente</p></div>:
        filtered.map(c=>{
          // Use actual loaded completed orders count when available, fallback to DB count
          const cos=ordersMap[c.id]||[]
          const realCount=ordersMap.hasOwnProperty(c.id)?cos.length:(c.orders_count||0)
          const loy=loyalty(realCount)
          const isExp=expanded===c.id

          return(
            <div key={c.id} className='card' style={{marginBottom:8,overflow:'hidden'}}>
              <div onClick={()=>toggle(c)} style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:12,cursor:'pointer'}}>
                {/* Avatar */}
                <div style={{width:40,height:40,borderRadius:12,background:loy.readyForBrinde?'rgba(245,158,11,0.15)':'rgba(0,255,65,0.08)',border:loy.readyForBrinde?'1px solid #f59e0b':'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative'}}>
                  <span style={{fontSize:16,fontWeight:700,color:loy.readyForBrinde?'#f59e0b':'var(--neon)',fontFamily:'Bangers,cursive'}}>{c.name.charAt(0).toUpperCase()}</span>
                  {loy.readyForBrinde&&<div style={{position:'absolute',top:-4,right:-4,width:14,height:14,background:'#f59e0b',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}><Gift size={8} color='#000'/></div>}
                </div>

                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <p style={{fontSize:14,fontWeight:600,color:'var(--white)'}}>{c.name}</p>
                    {loy.readyForBrinde&&<span style={{fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:20,background:'rgba(245,158,11,0.15)',color:'#f59e0b',display:'flex',alignItems:'center',gap:3}}><Gift size={9}/>DAR BRINDE!</span>}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginTop:2,flexWrap:'wrap'}}>
                    <span style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:3}}><Phone size={9}/>{c.phone}</span>
                    <span style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:3}}><ShoppingBag size={9}/>{c.orders_count||0} compras</span>
                  </div>
                  {/* Loyalty bar */}
                  {(c.orders_count||0)>0&&(
                    <div style={{marginTop:5}}>
                      <div style={{display:'flex',gap:3,marginBottom:2}}>
                        {Array.from({length:GOAL}).map((_,i)=>(
                          <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<(loy.readyForBrinde?GOAL:loy.inCycle)?'#f59e0b':'var(--border)'}}/>
                        ))}
                      </div>
                      <p style={{fontSize:9,color:'var(--muted)'}}>
                        {loy.readyForBrinde
                          ?'🎁 Brinde disponível!'+(loy.cycles>1?' ('+loy.cycles+'x)':'')
                          :loy.next===1?'⚡ Falta 1 compra para o brinde!'
                          :'Faltam '+loy.next+' para o brinde'+(loy.cycles>0?' — '+loy.cycles+'x já ganhou':'')}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{textAlign:'right',flexShrink:0}}>
                  <p style={{fontSize:15,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(c.total_spent)||0)}</p>
                  <p style={{fontSize:10,color:'var(--muted)'}}>total gasto</p>
                </div>
                {isExp?<ChevronUp size={14} color='var(--muted)'/>:<ChevronDown size={14} color='var(--muted)'/>}
              </div>

              {/* Orders history */}
              {isExp&&(
                <div style={{borderTop:'1px solid var(--border)',padding:'10px 14px',background:'rgba(0,0,0,0.2)'}}>
                  <p style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:0.5,marginBottom:8,fontFamily:'Bangers,cursive'}}>HISTÓRICO DE COMPRAS FINALIZADAS</p>
                  {loadingId===c.id
                    ?<p style={{fontSize:12,color:'var(--muted)',textAlign:'center',padding:12}}>Carregando...</p>
                    :cos.length===0
                      ?<p style={{fontSize:12,color:'var(--muted)',textAlign:'center',padding:12}}>Nenhuma compra finalizada</p>
                      :cos.map((o,idx)=>(
                        <div key={o.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:idx<cos.length-1?'1px solid rgba(26,46,26,0.4)':'none'}}>
                          <div style={{width:22,height:22,borderRadius:6,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <span style={{fontSize:9,fontWeight:700,color:'#f59e0b'}}>{cos.length-idx}</span>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <span style={{fontSize:12,fontWeight:600,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>#{o.order_number}</span>
                              <span style={{fontSize:10,padding:'1px 6px',borderRadius:4,background:o.type==='delivery'?'rgba(6,182,212,0.1)':'rgba(0,255,65,0.08)',color:o.type==='delivery'?'#06b6d4':'var(--neon)'}}>{o.type==='delivery'?'Delivery':'PDV'}</span>
                            </div>
                            <p style={{fontSize:10,color:'var(--muted)',marginTop:1}}>
                              {new Date(o.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'})} às {new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                            </p>
                          </div>
                          <span style={{fontSize:13,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(o.total))}</span>
                        </div>
                      ))
                  }
                  {cos.length>0&&(
                    <div style={{marginTop:8,padding:'8px 12px',background:'rgba(245,158,11,0.06)',borderRadius:8,border:'1px solid rgba(245,158,11,0.15)',display:'flex',alignItems:'center',gap:8}}>
                      <Award size={14} color='#f59e0b'/>
                      <div style={{flex:1}}>
                        <p style={{fontSize:11,color:'#f59e0b',fontWeight:600}}>
                          {loy.readyForBrinde
                            ?'🎁 BRINDE DISPONÍVEL!'+(loy.cycles>1?' ('+loy.cycles+'x já ganhou)':'')
                            :loy.next===1?'⚡ Falta 1 compra para o brinde!'
                            :'Faltam '+loy.next+' compras para o próximo brinde'+(loy.cycles>0?' — '+loy.cycles+'x já ganhou':'')}
                        </p>
                        <p style={{fontSize:9,color:'var(--muted)'}}>{cos.length} compras • {loy.inCycle}/{GOAL} no ciclo atual</p>
                      </div>
                      {loy.readyForBrinde&&(
                        <span style={{padding:'4px 10px',borderRadius:6,background:'#f59e0b',fontSize:11,fontWeight:700,color:'#000',fontFamily:'Bangers,cursive',letterSpacing:0.5}}>DAR BRINDE</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}