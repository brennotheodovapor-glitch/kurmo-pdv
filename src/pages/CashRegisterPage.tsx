import{useState,useEffect}from 'react'
import{DollarSign,Unlock,Lock,Clock,ChevronDown,ChevronUp,AlertCircle,Calendar,TrendingUp}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import{useCashRegister}from '@/hooks/useCashRegister'
import toast from 'react-hot-toast'

type CR={id:string;opened_at:string;closed_at:string|null;opening_balance:number;closing_balance:number|null;status:'open'|'closed';notes:string|null}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const today=()=>new Date().toISOString().split('T')[0]
const monthStart=()=>new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split('T')[0]

export default function CashRegisterPage(){
  const cash=useCashRegister()
  const[regs,setRegs]=useState<CR[]>([])
  const[loading,setLoading]=useState(true)
  const[salesMap,setSalesMap]=useState<Record<string,{total:number;count:number}>>({})
  const[expanded,setExpanded]=useState<string|null>(null)
  const[dateFrom,setDateFrom]=useState(monthStart())
  const[dateTo,setDateTo]=useState(today())

  useEffect(()=>{loadRegs()},[dateFrom,dateTo])
  // Reload when cash changes
  useEffect(()=>{if(cash.current!==undefined)loadRegs()},[cash.current])

  async function loadRegs(){
    setLoading(true)
    const{data}=await supabase.from('cash_registers').select('*')
      .gte('opened_at',dateFrom+'T00:00:00')
      .lte('opened_at',dateTo+'T23:59:59')
      .order('opened_at',{ascending:false})
    const list=data||[]
    setRegs(list)
    if(list.length){
      const{data:orders}=await supabase.from('orders').select('cash_register_id,total,status').in('cash_register_id',list.map(r=>r.id))
      const map:Record<string,{total:number;count:number}>={}
      ;(orders||[]).filter(o=>['completed','delivered'].includes(o.status)).forEach(o=>{
        if(!map[o.cash_register_id])map[o.cash_register_id]={total:0,count:0}
        map[o.cash_register_id].total+=Number(o.total)
        map[o.cash_register_id].count++
      })
      setSalesMap(map)
    }
    setLoading(false)
  }

  const salesNow=cash.current?salesMap[cash.current.id]:null
  const expectedNow=cash.current?(Number(cash.current.opening_balance)||0)+(salesNow?.total||0):0
  // Period totals
  const periodTotal=Object.values(salesMap).reduce((s,v)=>s+v.total,0)
  const periodCount=Object.values(salesMap).reduce((s,v)=>s+v.count,0)
  const periodDays=regs.filter(r=>r.status==='closed').length

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>

      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <DollarSign size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>CONTROLE DE CAIXA</h1>
        {cash.current
          ?<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(0,255,65,0.1)',border:'1px solid rgba(0,255,65,0.3)',color:'var(--neon)',fontFamily:'Bangers,cursive',letterSpacing:1}}>ABERTO</span>
          :<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(255,51,51,0.1)',border:'1px solid rgba(255,51,51,0.3)',color:'#ff3333',fontFamily:'Bangers,cursive',letterSpacing:1}}>FECHADO</span>
        }
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          {cash.current
            ?<button onClick={()=>cash.setCloseModal(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:13}}><Lock size={13}/>FECHAR CAIXA</button>
            :<button onClick={()=>cash.setOpenModal(true)} className='btn-neon-fill' style={{display:'flex',alignItems:'center',gap:6,fontSize:13,padding:'8px 16px'}}><Unlock size={13}/>ABRIR CAIXA</button>
          }
        </div>
      </div>

      {cash.current&&(
        <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'rgba(0,255,65,0.02)'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:12,maxWidth:860,marginBottom:10}}>
            {[
              {l:'Saldo Abertura',v:fmt(Number(cash.current.opening_balance)||0),c:'var(--muted)'},
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
          <p style={{fontSize:12,color:'var(--muted)',display:'flex',alignItems:'center',gap:5}}><Clock size={12}/>Aberto em: {new Date(cash.current.opened_at).toLocaleString('pt-BR')}</p>
        </div>
      )}

      {!cash.current&&cash.current!==undefined&&(
        <div style={{padding:'12px 20px',background:'rgba(255,170,0,0.04)',borderBottom:'1px solid rgba(255,170,0,0.15)',display:'flex',alignItems:'center',gap:10}}>
          <AlertCircle size={16} color='#ffaa00'/>
          <p style={{fontSize:13,color:'#ffaa00'}}>Caixa fechado. Abra o caixa antes de comecar a vender.</p>
          <button onClick={()=>cash.setOpenModal(true)} style={{marginLeft:'auto',padding:'5px 14px',borderRadius:8,border:'1px solid #ffaa00',background:'rgba(255,170,0,0.08)',color:'#ffaa00',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:12}}>ABRIR AGORA</button>
        </div>
      )}

      {/* Date filter */}
      <div style={{padding:'10px 20px',borderBottom:'1px solid var(--border)',background:'var(--card)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <Calendar size={14} color='var(--muted)'/>
        {[{k:'today',l:'Hoje'},{k:'week',l:'7 dias'},{k:'month',l:'Este mes'},{k:'all',l:'Tudo'}].map(p=>(
          <button key={p.k} onClick={()=>{
            const d=new Date()
            if(p.k==='today'){setDateFrom(today());setDateTo(today())}
            else if(p.k==='week'){const w=new Date(d);w.setDate(d.getDate()-7);setDateFrom(w.toISOString().split('T')[0]);setDateTo(today())}
            else if(p.k==='month'){setDateFrom(monthStart());setDateTo(today())}
            else{setDateFrom('2020-01-01');setDateTo(today())}
          }} style={{padding:'5px 10px',borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>
            {p.l}
          </button>
        ))}
        <span style={{fontSize:11,color:'var(--muted)'}}>De</span>
        <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
        <span style={{fontSize:11,color:'var(--muted)'}}>Ate</span>
        <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
        {periodDays>0&&(
          <div style={{marginLeft:'auto',display:'flex',gap:16}}>
            <div><p style={{fontSize:14,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(periodTotal)}</p><p style={{fontSize:10,color:'var(--muted)'}}>total periodo</p></div>
            <div><p style={{fontSize:14,fontWeight:700,color:'#06b6d4'}}>{periodCount}</p><p style={{fontSize:10,color:'var(--muted)'}}>pedidos</p></div>
            <div><p style={{fontSize:14,fontWeight:700,color:'var(--muted)'}}>{periodDays}</p><p style={{fontSize:10,color:'var(--muted)'}}>caixas</p></div>
          </div>
        )}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {loading
          ?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>
          :regs.filter(r=>r.status==='closed').length===0&&!cash.current
          ?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}><DollarSign size={36} style={{opacity:0.3,marginBottom:8}}/><p>Nenhum caixa no periodo</p></div>
          :regs.filter(r=>r.status==='closed').map(r=>{
            const s=salesMap[r.id]
            const expected=(Number(r.opening_balance)||0)+(s?.total||0)
            const diff=r.closing_balance!=null?Number(r.closing_balance)-expected:null
            return(
              <div key={r.id} className='card' style={{marginBottom:10,overflow:'hidden',borderLeft:'3px solid '+(diff==null?'var(--border)':diff>=0?'var(--neon)':'#ff3333')}}>
                <div onClick={()=>setExpanded(expanded===r.id?null:r.id)} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',flexWrap:'wrap'}}>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{new Date(r.opened_at).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p>
                    <p style={{fontSize:11,color:'var(--muted)',marginTop:2,display:'flex',alignItems:'center',gap:5}}><Clock size={10}/>{new Date(r.opened_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}{r.closed_at?' - '+new Date(r.closed_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''}</p>
                  </div>
                  <div style={{textAlign:'right'}}><p style={{fontSize:15,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(s?.total||0)}</p><p style={{fontSize:10,color:'var(--muted)'}}>{s?.count||0} pedidos</p></div>
                  {diff!=null&&<span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,background:diff>=0?'rgba(0,255,65,0.1)':'rgba(255,51,51,0.1)',color:diff>=0?'var(--neon)':'#ff3333'}}>{diff>=0?'+':''}{fmt(diff)}</span>}
                  {expanded===r.id?<ChevronUp size={14} color='var(--muted)'/>:<ChevronDown size={14} color='var(--muted)'/>}
                </div>
                {expanded===r.id&&(
                  <div style={{padding:'12px 16px',borderTop:'1px solid var(--border)',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
                    {[
                      {l:'Saldo Abertura',v:fmt(Number(r.opening_balance)||0)},
                      {l:'Total Vendas',v:fmt(s?.total||0)},
                      {l:'Saldo Esperado',v:fmt(expected)},
                      {l:'Saldo Fechamento',v:fmt(Number(r.closing_balance)||0)},
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

      {/* Open modal */}
      {cash.openModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:380,padding:24,border:'2px solid #ffaa00',boxShadow:'0 0 40px rgba(255,170,0,0.15)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
              <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,170,0,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><Unlock size={22} color='#ffaa00'/></div>
              <div><h2 className='font-bangers' style={{fontSize:22,color:'#ffaa00'}}>ABRIR CAIXA</h2><p style={{fontSize:12,color:'var(--muted)'}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p></div>
            </div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,letterSpacing:1}}>SALDO INICIAL EM CAIXA (R$)</label>
            <input type='number' min='0' step='0.01' value={cash.openBal} onChange={e=>cash.setOpenBal(e.target.value)} placeholder='0,00' autoFocus style={{fontSize:20,textAlign:'center',fontFamily:'JetBrains Mono,monospace',marginBottom:6}}/>
            <p style={{fontSize:11,color:'var(--muted)',marginBottom:18}}>Quanto dinheiro tem no caixa agora?</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>cash.setOpenModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={cash.openCash} disabled={cash.saving} style={{flex:2,padding:11,borderRadius:8,border:'none',background:'#ffaa00',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:16,opacity:cash.saving?0.7:1}}>{cash.saving?'ABRINDO...':'ABRIR CAIXA'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Close modal */}
      {cash.closeModal&&cash.current&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:420,padding:24,border:'2px solid #ff3333',boxShadow:'0 0 40px rgba(255,51,51,0.1)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,51,51,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><Lock size={22} color='#ff3333'/></div>
              <div><h2 className='font-bangers' style={{fontSize:22,color:'#ff3333'}}>FECHAR CAIXA</h2><p style={{fontSize:12,color:'var(--muted)'}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
              {[
                {l:'Saldo Abertura',v:fmt(Number(cash.current.opening_balance)||0)},
                {l:'Vendas Hoje',v:fmt(salesNow?.total||0)},
                {l:'Pedidos',v:String(salesNow?.count||0)},
                {l:'Saldo Esperado',v:fmt(expectedNow)},
              ].map((k,i)=>(
                <div key={i} style={{padding:'8px 12px',background:'var(--surface)',borderRadius:8}}>
                  <p style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>{k.l}</p>
                  <p style={{fontSize:13,fontWeight:600,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p>
                </div>
              ))}
            </div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>SALDO FISICO CONTADO (R$)</label>
            <input type='number' min='0' step='0.01' value={cash.closeBal} onChange={e=>cash.setCloseBal(e.target.value)} placeholder={String(expectedNow.toFixed(2))} autoFocus style={{fontSize:16,textAlign:'center',fontFamily:'JetBrains Mono,monospace',marginBottom:10}}/>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>OBSERVACOES</label>
            <textarea value={cash.closeNotes} onChange={e=>cash.setCloseNotes(e.target.value)} placeholder='Sangria, diferenca, ocorrencias...' rows={2} style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text)',fontSize:13,resize:'none',outline:'none',boxSizing:'border-box' as const,marginBottom:14}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>cash.setCloseModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={()=>cash.closeCash(expectedNow)} disabled={cash.saving} style={{flex:2,padding:11,borderRadius:8,border:'none',background:'#ff3333',color:'white',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15,opacity:cash.saving?0.7:1}}>{cash.saving?'FECHANDO...':'FECHAR CAIXA'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}