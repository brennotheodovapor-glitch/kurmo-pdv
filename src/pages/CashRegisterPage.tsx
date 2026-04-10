import{useState,useEffect}from 'react'
import{DollarSign,Lock,Unlock,Clock,TrendingUp,ShoppingCart,AlertCircle,Check,X,ChevronDown,ChevronUp}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type CashRegister={id:string;opened_at:string;closed_at:string|null;opening_balance:number;closing_balance:number|null;status:'open'|'closed';notes:string|null}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function CashRegisterPage(){
  const[registers,setRegisters]=useState<CashRegister[]>([])
  const[current,setCurrent]=useState<CashRegister|null>(null)
  const[loading,setLoading]=useState(true)
  const[openModal,setOpenModal]=useState(false)
  const[closeModal,setCloseModal]=useState(false)
  const[openBalance,setOpenBalance]=useState('')
  const[closeBalance,setCloseBalance]=useState('')
  const[closeNotes,setCloseNotes]=useState('')
  const[saving,setSaving]=useState(false)
  const[expanded,setExpanded]=useState<string|null>(null)
  const[salesByRegister,setSalesByRegister]=useState<Record<string,{total:number;count:number}>>({})

  useEffect(()=>{load()},[]) 

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('cash_registers').select('*').order('opened_at',{ascending:false}).limit(30)
    const regs=data||[]
    setRegisters(regs)
    const open=regs.find(r=>r.status==='open')||null
    setCurrent(open)
    // Load sales totals per register
    if(regs.length>0){
      const ids=regs.map(r=>"'"+r.id+"'")
      const{data:orders}=await supabase.from('orders').select('cash_register_id,total,status').in('cash_register_id',regs.map(r=>r.id))
      const map:Record<string,{total:number;count:number}>={}
      ;(orders||[]).filter(o=>o.status==='completed').forEach(o=>{
        if(!map[o.cash_register_id])map[o.cash_register_id]={total:0,count:0}
        map[o.cash_register_id].total+=o.total
        map[o.cash_register_id].count++
      })
      setSalesByRegister(map)
    }
    setLoading(false)
  }

  async function openCash(){
    setSaving(true)
    const{error}=await supabase.from('cash_registers').insert({opening_balance:parseFloat(openBalance)||0,status:'open'})
    if(error){toast.error('Erro: '+error.message);setSaving(false);return}
    toast.success('Caixa aberto!')
    setOpenModal(false);setOpenBalance('');load()
    setSaving(false)
  }

  async function closeCash(){
    if(!current)return
    setSaving(true)
    const sales=salesByRegister[current.id]
    const expected=(current.opening_balance||0)+(sales?.total||0)
    const{error}=await supabase.from('cash_registers').update({status:'closed',closed_at:new Date().toISOString(),closing_balance:parseFloat(closeBalance)||expected,notes:closeNotes||null}).eq('id',current.id)
    if(error){toast.error('Erro: '+error.message);setSaving(false);return}
    toast.success('Caixa fechado!')
    setCloseModal(false);setCloseBalance('');setCloseNotes('');load()
    setSaving(false)
  }

  function diffLabel(r:CashRegister){
    const sales=salesByRegister[r.id]
    if(!r.closed_at||r.closing_balance==null||!sales)return null
    const expected=(r.opening_balance||0)+sales.total
    const diff=r.closing_balance-expected
    return{diff,positive:diff>=0}
  }

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <DollarSign size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>CONTROLE DE CAIXA</h1>
        {current&&<span style={{fontSize:12,padding:'4px 12px',borderRadius:20,background:'rgba(0,255,65,0.1)',border:'1px solid rgba(0,255,65,0.3)',color:'var(--neon)',fontFamily:'Bangers,cursive',letterSpacing:1}}>CAIXA ABERTO</span>}
        {!current&&!loading&&<span style={{fontSize:12,padding:'4px 12px',borderRadius:20,background:'rgba(255,51,51,0.1)',border:'1px solid rgba(255,51,51,0.3)',color:'#ff3333',fontFamily:'Bangers,cursive',letterSpacing:1}}>CAIXA FECHADO</span>}
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          {current?(
            <button onClick={()=>setCloseModal(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14,letterSpacing:1}}>
              <Lock size={14}/>FECHAR CAIXA
            </button>
          ):(
            <button onClick={()=>setOpenModal(true)} className='btn-neon-fill' style={{display:'flex',alignItems:'center',gap:6,fontSize:14,padding:'8px 16px'}}>
              <Unlock size={14}/>ABRIR CAIXA
            </button>
          )}
        </div>
      </div>

      {/* Current cash summary */}
      {current&&(
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',background:'rgba(0,255,65,0.03)'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,maxWidth:900}}>
            {[
              {label:'Saldo de Abertura',value:fmt(current.opening_balance||0),color:'var(--muted)'},
              {label:'Vendas do Dia',value:fmt(salesByRegister[current.id]?.total||0),color:'var(--neon)'},
              {label:'Pedidos',value:String(salesByRegister[current.id]?.count||0),color:'#06b6d4'},
              {label:'Saldo Esperado',value:fmt((current.opening_balance||0)+(salesByRegister[current.id]?.total||0)),color:'#f59e0b'},
            ].map((k,i)=>(
              <div key={i} className='card' style={{padding:'14px 16px'}}>
                <p style={{fontSize:18,fontWeight:700,color:k.color,fontFamily:'JetBrains Mono,monospace'}}>{k.value}</p>
                <p style={{fontSize:11,color:'var(--muted)',marginTop:3}}>{k.label}</p>
              </div>
            ))}
          </div>
          <p style={{fontSize:12,color:'var(--muted)',marginTop:10,display:'flex',alignItems:'center',gap:5}}><Clock size={12}/>Aberto em: {new Date(current.opened_at).toLocaleString('pt-BR')}</p>
        </div>
      )}

      {!current&&!loading&&(
        <div style={{padding:'24px 20px',background:'rgba(255,170,0,0.04)',borderBottom:'1px solid rgba(255,170,0,0.15)',display:'flex',alignItems:'center',gap:12}}>
          <AlertCircle size={18} color='#ffaa00'/>
          <p style={{fontSize:13,color:'#ffaa00'}}>O caixa esta fechado. Abra o caixa antes de comecar a vender.</p>
        </div>
      )}

      {/* History */}
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        <p style={{fontSize:11,color:'var(--muted)',letterSpacing:1,marginBottom:12}}>HISTORICO DE CAIXAS</p>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        registers.filter(r=>r.status==='closed').length===0&&!current?(
          <div style={{textAlign:'center',padding:48,color:'var(--muted)'}}><DollarSign size={36} style={{opacity:0.3,marginBottom:8}}/><p>Nenhum caixa registrado</p></div>
        ):
        registers.filter(r=>r.status==='closed').map(r=>{
          const sales=salesByRegister[r.id]
          const d=diffLabel(r)
          return(
            <div key={r.id} className='card' style={{marginBottom:10,overflow:'hidden'}}>
              <div onClick={()=>setExpanded(expanded===r.id?null:r.id)} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{new Date(r.opened_at).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p>
                  <p style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{new Date(r.opened_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} - {r.closed_at?new Date(r.closed_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''}</p>
                </div>
                <div style={{textAlign:'center'}}><p style={{fontSize:15,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(sales?.total||0)}</p><p style={{fontSize:10,color:'var(--muted)'}}>vendas</p></div>
                <div style={{textAlign:'center'}}><p style={{fontSize:15,fontWeight:700,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{sales?.count||0}</p><p style={{fontSize:10,color:'var(--muted)'}}>pedidos</p></div>
                {d&&<span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,background:d.positive?'rgba(0,255,65,0.1)':'rgba(255,51,51,0.1)',color:d.positive?'var(--neon)':'#ff3333'}}>{d.positive?'+':''}{fmt(d.diff)}</span>}
                {expanded===r.id?<ChevronUp size={14} color='var(--muted)'/>:<ChevronDown size={14} color='var(--muted)'/>}
              </div>
              {expanded===r.id&&(
                <div style={{padding:'0 16px 14px',borderTop:'1px solid var(--border)',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,paddingTop:12}}>
                  {[
                    {l:'Saldo Abertura',v:fmt(r.opening_balance||0)},
                    {l:'Total Vendas',v:fmt(sales?.total||0)},
                    {l:'Saldo Esperado',v:fmt((r.opening_balance||0)+(sales?.total||0))},
                    {l:'Saldo Fechamento',v:fmt(r.closing_balance||0)},
                  ].map((k,i)=>(
                    <div key={i} style={{padding:'8px 12px',background:'var(--surface)',borderRadius:8}}><p style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>{k.l}</p><p style={{fontSize:14,fontWeight:600,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p></div>
                  ))}
                  {r.notes&&<div style={{gridColumn:'1/-1',padding:'8px 12px',background:'var(--surface)',borderRadius:8,fontSize:12,color:'var(--muted)'}}><strong>Obs:</strong> {r.notes}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* OPEN MODAL */}
      {openModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:400,padding:24,border:'2px solid var(--neon)',boxShadow:'0 0 40px rgba(0,255,65,0.2)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <div style={{width:44,height:44,borderRadius:12,background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',display:'flex',alignItems:'center',justifyContent:'center'}}><Unlock size={22} color='var(--neon)'/></div>
              <div><h2 className='font-bangers neon-text-sm' style={{fontSize:22}}>ABRIR CAIXA</h2><p style={{fontSize:12,color:'var(--muted)'}}>Inicio do dia — {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})}</p></div>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,letterSpacing:1}}>SALDO INICIAL (dinheiro em caixa)</label>
              <input type='number' min='0' step='0.01' value={openBalance} onChange={e=>setOpenBalance(e.target.value)} placeholder='R$ 0,00' autoFocus style={{fontSize:18,textAlign:'center',fontFamily:'JetBrains Mono,monospace',letterSpacing:2}}/>
              <p style={{fontSize:11,color:'var(--muted)',marginTop:5}}>Quanto tem no caixa antes de comecar a vender hoje?</p>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setOpenModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={openCash} disabled={saving} className='btn-neon-fill' style={{flex:2,fontSize:15}}>
                <Unlock size={14} style={{display:'inline',marginRight:6}}/>{saving?'ABRINDO...':'ABRIR CAIXA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSE MODAL */}
      {closeModal&&current&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:440,padding:24,border:'2px solid #ff3333',boxShadow:'0 0 40px rgba(255,51,51,0.15)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,51,51,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><Lock size={22} color='#ff3333'/></div>
              <div><h2 className='font-bangers' style={{fontSize:22,color:'#ff3333'}}>FECHAR CAIXA</h2><p style={{fontSize:12,color:'var(--muted)'}}>Fim do dia — {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})}</p></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {[
                {l:'Saldo Abertura',v:fmt(current.opening_balance||0)},
                {l:'Total Vendas',v:fmt(salesByRegister[current.id]?.total||0)},
                {l:'Pedidos',v:String(salesByRegister[current.id]?.count||0)},
                {l:'Saldo Esperado',v:fmt((current.opening_balance||0)+(salesByRegister[current.id]?.total||0))},
              ].map((k,i)=>(
                <div key={i} style={{padding:'8px 12px',background:'var(--surface)',borderRadius:8}}><p style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>{k.l}</p><p style={{fontSize:13,fontWeight:600,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p></div>
              ))}
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>SALDO FISICO EM CAIXA (contagem real)</label>
              <input type='number' min='0' step='0.01' value={closeBalance} onChange={e=>setCloseBalance(e.target.value)} placeholder={fmt((current.opening_balance||0)+(salesByRegister[current.id]?.total||0))} autoFocus style={{fontSize:16,textAlign:'center',fontFamily:'JetBrains Mono,monospace'}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>OBSERVACOES (opcional)</label>
              <textarea value={closeNotes} onChange={e=>setCloseNotes(e.target.value)} placeholder='Sangria, diferenca, ocorrencias...' rows={2} style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text)',fontSize:13,resize:'none',outline:'none',boxSizing:'border-box' as const}}/>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setCloseModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={closeCash} disabled={saving} style={{flex:2,padding:11,borderRadius:8,border:'none',background:'#ff3333',color:'white',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15,opacity:saving?0.7:1}}>
                <Lock size={13} style={{display:'inline',marginRight:6}}/>{saving?'FECHANDO...':'FECHAR CAIXA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}