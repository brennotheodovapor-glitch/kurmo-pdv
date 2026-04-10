import{useState,useEffect}from 'react'
import{DollarSign,Unlock,Lock,Clock,TrendingUp,AlertCircle,ChevronDown,ChevronUp,Check}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type CR={id:string;opened_at:string;closed_at:string|null;opening_balance:number;closing_balance:number|null;status:'open'|'closed';notes:string|null}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function CashRegisterPage(){
  const[regs,setRegs]=useState<CR[]>([])
  const[current,setCurrent]=useState<CR|null>(null)
  const[loading,setLoading]=useState(true)
  const[openModal,setOpenModal]=useState(false)
  const[closeModal,setCloseModal]=useState(false)
  const[openBal,setOpenBal]=useState('')
  const[closeBal,setCloseBal]=useState('')
  const[closeNotes,setCloseNotes]=useState('')
  const[saving,setSaving]=useState(false)
  const[expanded,setExpanded]=useState<string|null>(null)
  const[salesMap,setSalesMap]=useState<Record<string,{total:number;count:number}>>({})

  useEffect(()=>{load()},[]) 

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('cash_registers').select('*').order('opened_at',{ascending:false}).limit(30)
    const list=data||[]
    setRegs(list)
    setCurrent(list.find(r=>r.status==='open')||null)
    if(list.length){
      const{data:orders}=await supabase.from('orders').select('cash_register_id,total,status').in('cash_register_id',list.map(r=>r.id))
      const map:Record<string,{total:number;count:number}>={}
      ;(orders||[]).filter(o=>o.status==='completed'||o.status==='delivered').forEach(o=>{
        if(!map[o.cash_register_id])map[o.cash_register_id]={total:0,count:0}
        map[o.cash_register_id].total+=Number(o.total)
        map[o.cash_register_id].count++
      })
      setSalesMap(map)
    }
    setLoading(false)
  }

  async function openCash(){
    setSaving(true)
    const{error}=await supabase.from('cash_registers').insert({opening_balance:parseFloat(openBal)||0,status:'open'})
    if(error){toast.error(error.message);setSaving(false);return}
    toast.success('Caixa aberto!')
    setOpenModal(false);setOpenBal('');load();setSaving(false)
  }

  async function closeCash(){
    if(!current)return
    setSaving(true)
    const sales=salesMap[current.id]
    const expected=(current.opening_balance||0)+(sales?.total||0)
    const{error}=await supabase.from('cash_registers').update({
      status:'closed',closed_at:new Date().toISOString(),
      closing_balance:parseFloat(closeBal)||expected,
      notes:closeNotes||null
    }).eq('id',current.id)
    if(error){toast.error(error.message);setSaving(false);return}
    toast.success('Caixa fechado!')
    setCloseModal(false);setCloseBal('');setCloseNotes('');load();setSaving(false)
  }

  const salesNow=current?salesMap[current.id]:null
  const expectedNow=current?(current.opening_balance||0)+(salesNow?.total||0):0

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>

      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <DollarSign size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>CONTROLE DE CAIXA</h1>
        {current
          ?<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(0,255,65,0.1)',border:'1px solid rgba(0,255,65,0.3)',color:'var(--neon)',fontFamily:'Bangers,cursive',letterSpacing:1}}>ABERTO</span>
          :<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(255,51,51,0.1)',border:'1px solid rgba(255,51,51,0.3)',color:'#ff3333',fontFamily:'Bangers,cursive',letterSpacing:1}}>FECHADO</span>
        }
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          {current
            ?<button onClick={()=>setCloseModal(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:13,letterSpacing:1}}><Lock size={13}/>FECHAR CAIXA</button>
            :<button onClick={()=>setOpenModal(true)} className='btn-neon-fill' style={{display:'flex',alignItems:'center',gap:6,fontSize:13,padding:'8px 16px'}}><Unlock size={13}/>ABRIR CAIXA</button>
          }
        </div>
      </div>

      {current&&(
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',background:'rgba(0,255,65,0.02)'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:12,maxWidth:850,marginBottom:10}}>
            {[
              {l:'Saldo Abertura',v:fmt(current.opening_balance||0),c:'var(--muted)'},
              {l:'Vendas do Dia',v:fmt(salesNow?.total||0),c:'var(--neon)'},
              {l:'Pedidos Hoje',v:String(salesNow?.count||0),c:'#06b6d4'},
              {l:'Saldo Esperado',v:fmt(expectedNow),c:'#f59e0b'},
            ].map((k,i)=>(
              <div key={i} className='card' style={{padding:'12px 16px'}}>
                <p style={{fontSize:20,fontWeight:700,color:k.c,fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p>
                <p style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{k.l}</p>
              </div>
            ))}
          </div>
          <p style={{fontSize:12,color:'var(--muted)',display:'flex',alignItems:'center',gap:5}}>
            <Clock size={12}/>Aberto em: {new Date(current.opened_at).toLocaleString('pt-BR')}
          </p>
        </div>
      )}

      {!current&&!loading&&(
        <div style={{padding:'16px 20px',background:'rgba(255,170,0,0.04)',borderBottom:'1px solid rgba(255,170,0,0.15)',display:'flex',alignItems:'center',gap:10}}>
          <AlertCircle size={16} color='#ffaa00'/>
          <p style={{fontSize:13,color:'#ffaa00'}}>Caixa fechado. Abra o caixa antes de comecar a vender.</p>
        </div>
      )}

      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        <p style={{fontSize:11,color:'var(--muted)',letterSpacing:1,marginBottom:12,fontWeight:600}}>HISTORICO DE CAIXAS</p>
        {loading
          ?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>
          :regs.filter(r=>r.status==='closed').length===0
          ?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}><DollarSign size={36} style={{opacity:0.3,marginBottom:8}}/><p>Nenhum caixa fechado ainda</p></div>
          :regs.filter(r=>r.status==='closed').map(r=>{
            const s=salesMap[r.id]
            const expected=(r.opening_balance||0)+(s?.total||0)
            const diff=r.closing_balance!=null?r.closing_balance-expected:null
            return(
              <div key={r.id} className='card' style={{marginBottom:10,overflow:'hidden'}}>
                <div onClick={()=>setExpanded(expanded===r.id?null:r.id)} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',flexWrap:'wrap'}}>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{new Date(r.opened_at).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p>
                    <p style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                      {new Date(r.opened_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                      {r.closed_at?' - '+new Date(r.closed_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''}
                    </p>
                  </div>
                  <div style={{textAlign:'center'}}><p style={{fontSize:14,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(s?.total||0)}</p><p style={{fontSize:10,color:'var(--muted)'}}>vendas</p></div>
                  <div style={{textAlign:'center'}}><p style={{fontSize:14,fontWeight:700,color:'var(--white)'}}>{s?.count||0}</p><p style={{fontSize:10,color:'var(--muted)'}}>pedidos</p></div>
                  {diff!=null&&<span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,background:diff>=0?'rgba(0,255,65,0.1)':'rgba(255,51,51,0.1)',color:diff>=0?'var(--neon)':'#ff3333'}}>{diff>=0?'+':''}{fmt(diff)}</span>}
                  {expanded===r.id?<ChevronUp size={14} color='var(--muted)'/>:<ChevronDown size={14} color='var(--muted)'/>}
                </div>
                {expanded===r.id&&(
                  <div style={{padding:'12px 16px',borderTop:'1px solid var(--border)',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
                    {[
                      {l:'Saldo Abertura',v:fmt(r.opening_balance||0)},
                      {l:'Total Vendas',v:fmt(s?.total||0)},
                      {l:'Saldo Esperado',v:fmt(expected)},
                      {l:'Saldo Fechamento',v:fmt(r.closing_balance||0)},
                    ].map((k,i)=>(
                      <div key={i} style={{padding:'8px 12px',background:'var(--surface)',borderRadius:8}}>
                        <p style={{fontSize:10,color:'var(--muted)',marginBottom:3}}>{k.l}</p>
                        <p style={{fontSize:13,fontWeight:600,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p>
                      </div>
                    ))}
                    {r.notes&&<div style={{gridColumn:'1/-1',padding:'8px 12px',background:'var(--surface)',borderRadius:8,fontSize:12,color:'var(--muted)'}}><strong>Obs:</strong> {r.notes}</div>}
                  </div>
                )}
              </div>
            )
          })
        }
      </div>

      {openModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:380,padding:24,border:'2px solid var(--neon)',boxShadow:'0 0 40px rgba(0,255,65,0.15)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <div style={{width:44,height:44,borderRadius:12,background:'var(--neon-glow)',display:'flex',alignItems:'center',justifyContent:'center'}}><Unlock size={22} color='var(--neon)'/></div>
              <div><h2 className='font-bangers neon-text-sm' style={{fontSize:22}}>ABRIR CAIXA</h2><p style={{fontSize:12,color:'var(--muted)'}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p></div>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,letterSpacing:1}}>SALDO INICIAL EM CAIXA (R$)</label>
              <input type='number' min='0' step='0.01' value={openBal} onChange={e=>setOpenBal(e.target.value)} placeholder='0,00' autoFocus style={{fontSize:20,textAlign:'center',fontFamily:'JetBrains Mono,monospace',letterSpacing:2}}/>
              <p style={{fontSize:11,color:'var(--muted)',marginTop:5}}>Quanto dinheiro tem no caixa agora?</p>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setOpenModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={openCash} disabled={saving} className='btn-neon-fill' style={{flex:2,fontSize:15}}><Unlock size={13} style={{display:'inline',marginRight:6}}/>{saving?'ABRINDO...':'ABRIR CAIXA'}</button>
            </div>
          </div>
        </div>
      )}

      {closeModal&&current&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:420,padding:24,border:'2px solid #ff3333',boxShadow:'0 0 40px rgba(255,51,51,0.1)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,51,51,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><Lock size={22} color='#ff3333'/></div>
              <div><h2 className='font-bangers' style={{fontSize:22,color:'#ff3333'}}>FECHAR CAIXA</h2><p style={{fontSize:12,color:'var(--muted)'}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
              {[
                {l:'Saldo Abertura',v:fmt(current.opening_balance||0)},
                {l:'Total Vendas',v:fmt(salesNow?.total||0)},
                {l:'Pedidos',v:String(salesNow?.count||0)},
                {l:'Saldo Esperado',v:fmt(expectedNow)},
              ].map((k,i)=>(
                <div key={i} style={{padding:'8px 12px',background:'var(--surface)',borderRadius:8}}><p style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>{k.l}</p><p style={{fontSize:13,fontWeight:600,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p></div>
              ))}
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>SALDO FISICO CONTADO (R$)</label>
              <input type='number' min='0' step='0.01' value={closeBal} onChange={e=>setCloseBal(e.target.value)} placeholder={String(expectedNow.toFixed(2))} autoFocus style={{fontSize:16,textAlign:'center',fontFamily:'JetBrains Mono,monospace'}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>OBSERVACOES (opcional)</label>
              <textarea value={closeNotes} onChange={e=>setCloseNotes(e.target.value)} placeholder='Sangria, diferenca, ocorrencias...' rows={2} style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text)',fontSize:13,resize:'none',outline:'none',boxSizing:'border-box' as const}}/>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setCloseModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={closeCash} disabled={saving} style={{flex:2,padding:11,borderRadius:8,border:'none',background:'#ff3333',color:'white',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15,opacity:saving?0.7:1}}><Lock size={13} style={{display:'inline',marginRight:6}}/>{saving?'FECHANDO...':'FECHAR CAIXA'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}