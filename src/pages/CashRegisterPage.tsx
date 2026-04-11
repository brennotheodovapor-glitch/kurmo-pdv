import toast from 'react-hot-toast'
import{useState,useEffect}from 'react'
import{DollarSign,Unlock,Lock,Clock,ChevronDown,ChevronUp,AlertCircle,Calendar,MinusCircle,PlusCircle,Minus,Plus,ArrowDownCircle,ArrowUpCircle}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import{useCashRegister}from '@/hooks/useCashRegister'

type CR={id:string;opened_at:string;closed_at:string|null;opening_balance:number;closing_balance:number|null;status:'open'|'closed';notes:string|null}
// salesMap: total=todas vendas, cash=so dinheiro, pix, debito, credito
type SalesData={total:number;count:number;cash:number;pix:number;debito:number;credito:number}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const todayStr=()=>new Date().toISOString().split('T')[0]
const monthStr=()=>new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split('T')[0]

export default function CashRegisterPage(){
  const cash=useCashRegister()
  const[regs,setRegs]=useState<CR[]>([])
  const[loading,setLoading]=useState(true)
  const[salesMap,setSalesMap]=useState<Record<string,SalesData>>({})
  const[expanded,setExpanded]=useState<string|null>(null)
  const[dateFrom,setDateFrom]=useState(monthStr())
  const[entriesModal,setEntriesModal]=useState(false)
  const[entryType,setEntryType]=useState<'withdrawal'|'deposit'>('withdrawal')
  const[entryAmount,setEntryAmount]=useState('')
  const[entryReason,setEntryReason]=useState('')
  const[savingEntry,setSavingEntry]=useState(false)
  const[sangriaModal,setSangriaModal]=useState(false)
  const[sangriaType,setSangriaType]=useState<'withdrawal'|'deposit'>('withdrawal')
  const[sangriaAmount,setSangriaAmount]=useState('')
  const[sangriaReason,setSangriaReason]=useState('')
  const[sangriaLoading,setSangriaLoading]=useState(false)
  const[dateTo,setDateTo]=useState(todayStr())

  useEffect(()=>{loadRegs()},[dateFrom,dateTo])
  useEffect(()=>{if(cash.current!==undefined)loadRegs()},[cash.current])

  async function saveEntry(){
    if(!cash.current){toast.error('Nenhum caixa aberto');return}
    if(!entryAmount||parseFloat(entryAmount)<=0){toast.error('Informe o valor');return}
    if(!entryReason.trim()){toast.error('Informe o motivo');return}
    setSavingEntry(true)
    const{error}=await supabase.from('cash_register_entries').insert({cash_register_id:cash.current.id,type:entryType,amount:parseFloat(entryAmount),reason:entryReason})
    if(error){toast.error(error.message);setSavingEntry(false);return}
    toast.success(entryType==='withdrawal'?'Sangria registrada!':'Suprimento registrado!')
    setEntryAmount('');setEntryReason('');setEntriesModal(false);setSavingEntry(false)
  }

  async function loadRegs(){
    setLoading(true)
    const{data:regsData}=await supabase.from('cash_registers').select('*').gte('opened_at',dateFrom+'T00:00:00').lte('opened_at',dateTo+'T23:59:59').order('opened_at',{ascending:false})
    const list=regsData||[]
    setRegs(list)
    if(list.length){
      const ids=list.map(r=>r.id)
      // Load orders for these registers
      const{data:orders}=await supabase.from('orders').select('id,cash_register_id,total,status').in('cash_register_id',ids)
      const validOrders=(orders||[]).filter(o=>['completed','delivered'].includes(o.status))
      const orderIds=validOrders.map(o=>o.id)
      // Load payments to split by method
      let payments:any[]=[]
      if(orderIds.length>0){
        const{data:pays}=await supabase.from('order_payments').select('order_id,method,amount').in('order_id',orderIds)
        payments=pays||[]
      }
      const map:Record<string,SalesData>={}
      validOrders.forEach(o=>{
        if(!map[o.cash_register_id])map[o.cash_register_id]={total:0,count:0,cash:0,pix:0,debito:0,credito:0}
        map[o.cash_register_id].total+=Number(o.total)
        map[o.cash_register_id].count++
      })
      payments.forEach(p=>{
        // find which register this order belongs to
        const order=validOrders.find(o=>o.id===p.order_id)
        if(!order)return
        const regId=order.cash_register_id
        if(!map[regId])return
        const amt=Number(p.amount)
        if(p.method==='dinheiro')map[regId].cash+=amt
        else if(p.method==='pix')map[regId].pix+=amt
        else if(p.method==='debito')map[regId].debito+=amt
        else if(p.method==='credito')map[regId].credito+=amt
      })
      setSalesMap(map)
    }
    setLoading(false)
  }

  const salesNow=cash.current?salesMap[cash.current.id]:null
  // Saldo esperado = abertura + somente dinheiro (PIX/cartao nao entra no caixa fisico)
  const expectedNow=cash.current?(Number(cash.current.opening_balance)||0)+(salesNow?.cash||0):0
  const totalRevenueNow=salesNow?.total||0

  // Period totals
  const periodRevenue=Object.values(salesMap).reduce((s,v)=>s+v.total,0)
  const periodCount=Object.values(salesMap).reduce((s,v)=>s+v.count,0)
  const periodDays=regs.filter(r=>r.status==='closed').length
  const periodCash=Object.values(salesMap).reduce((s,v)=>s+v.cash,0)
  const periodPix=Object.values(salesMap).reduce((s,v)=>s+v.pix,0)
  const periodDebito=Object.values(salesMap).reduce((s,v)=>s+v.debito,0)
  const periodCredito=Object.values(salesMap).reduce((s,v)=>s+v.credito,0)

  async function saveSangria(){
    if(!cash.current){toast.error('Caixa fechado');return}
    const amount=parseFloat(sangriaAmount)
    if(!amount||amount<=0){toast.error('Informe o valor');return}
    setSangriaLoading(true)
    const{error}=await supabase.from('cash_register_entries').insert({cash_register_id:cash.current.id,type:sangriaType,amount,reason:sangriaReason||null})
    if(error){toast.error(error.message);setSangriaLoading(false);return}
    toast.success(sangriaType==='withdrawal'?'Sangria registrada!':'Suprimento registrado!')
    setSangriaModal(false);setSangriaAmount('');setSangriaReason('')
    setSangriaLoading(false)
  }

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
            ?<><button onClick={()=>{setSangriaType('withdrawal');setSangriaModal(true)}} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,border:'1px solid #ffaa00',background:'rgba(255,170,0,0.1)',color:'#ffaa00',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:13}}><ArrowDownCircle size={13}/>SANGRIA</button>
          <button onClick={()=>{setSangriaType('deposit');setSangriaModal(true)}} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,border:'1px solid #10b981',background:'rgba(16,185,129,0.1)',color:'#10b981',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:13}}><ArrowUpCircle size={13}/>SUPRIMENTO</button>
          <button onClick={()=>cash.setCloseModal(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:8,border:'1px solid #ff3333',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:13}}><Lock size={13}/>FECHAR CAIXA</button></>
            :<button onClick={()=>cash.setOpenModal(true)} className='btn-neon-fill' style={{display:'flex',alignItems:'center',gap:6,fontSize:13,padding:'8px 16px'}}><Unlock size={13}/>ABRIR CAIXA</button>
          }
          {cash.current&&(
            <button onClick={()=>{setEntriesModal(true);setEntryType('withdrawal')}} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:8,border:'1px solid #f59e0b',background:'rgba(245,158,11,0.08)',color:'#f59e0b',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:12}}>
              <Minus size={13}/>SANGRIA / SUPRIMENTO
            </button>
          )}
        </div>
      </div>

      {/* Current cash panel */}
      {cash.current&&(
        <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'rgba(0,255,65,0.02)'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:10,maxWidth:1000,marginBottom:10}}>
            {[
              {l:'Abertura',v:fmt(Number(cash.current.opening_balance)||0),c:'var(--muted)',tip:''},
              {l:'Total Vendas',v:fmt(totalRevenueNow),c:'var(--neon)',tip:'Todas as formas'},
              {l:'Dinheiro',v:fmt(salesNow?.cash||0),c:'#10b981',tip:'Entra no caixa'},
              {l:'PIX',v:fmt(salesNow?.pix||0),c:'#06b6d4',tip:'Nao entra no caixa'},
              {l:'Debito',v:fmt(salesNow?.debito||0),c:'#7c3aed',tip:'Nao entra no caixa'},
              {l:'Credito',v:fmt(salesNow?.credito||0),c:'#f59e0b',tip:'Nao entra no caixa'},
              {l:'Saldo Esperado',v:fmt(expectedNow),c:'#ffaa00',tip:'Abertura + Dinheiro'},
            ].map((k,i)=>(
              <div key={i} className='card' style={{padding:'10px 14px'}}>
                <p style={{fontSize:17,fontWeight:700,color:k.c,fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p>
                <p style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{k.l}</p>
                {k.tip&&<p style={{fontSize:9,color:'var(--muted)',opacity:0.6,marginTop:1}}>{k.tip}</p>}
              </div>
            ))}
          </div>
          <p style={{fontSize:12,color:'var(--muted)',display:'flex',alignItems:'center',gap:5}}><Clock size={12}/>Aberto em: {new Date(cash.current.opened_at).toLocaleString('pt-BR')}</p>
          <p style={{fontSize:11,color:'var(--muted)',marginTop:3,opacity:0.7}}>* Saldo esperado = saldo de abertura + vendas em dinheiro (PIX e cartoes nao entram no caixa fisico)</p>
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
      <div style={{padding:'10px 20px',borderBottom:'1px solid var(--border)',background:'var(--card)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <Calendar size={14} color='var(--muted)'/>
        {[{k:'today',l:'Hoje'},{k:'week',l:'7 dias'},{k:'month',l:'Este mes'}].map(p=>(
          <button key={p.k} onClick={()=>{
            const d=new Date()
            if(p.k==='today'){setDateFrom(todayStr());setDateTo(todayStr())}
            else if(p.k==='week'){const w=new Date(d);w.setDate(d.getDate()-7);setDateFrom(w.toISOString().split('T')[0]);setDateTo(todayStr())}
            else{setDateFrom(monthStr());setDateTo(todayStr())}
          }} style={{padding:'5px 10px',borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>
            {p.l}
          </button>
        ))}
        <span style={{fontSize:11,color:'var(--muted)'}}>De</span>
        <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
        <span style={{fontSize:11,color:'var(--muted)'}}>Ate</span>
        <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{fontSize:12,padding:'5px 8px',width:130}}/>
        {periodDays>0&&(
          <div style={{marginLeft:'auto',display:'flex',gap:12,flexWrap:'wrap'}}>
            {[
              {l:'Total',v:fmt(periodRevenue),c:'var(--neon)'},
              {l:'Dinheiro',v:fmt(periodCash),c:'#10b981'},
              {l:'PIX',v:fmt(periodPix),c:'#06b6d4'},
              {l:'Debito',v:fmt(periodDebito),c:'#7c3aed'},
              {l:'Credito',v:fmt(periodCredito),c:'#f59e0b'},
              {l:'Pedidos',v:String(periodCount),c:'var(--muted)'},
            ].map((k,i)=>(
              <div key={i} style={{textAlign:'center'}}>
                <p style={{fontSize:13,fontWeight:700,color:k.c,fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p>
                <p style={{fontSize:9,color:'var(--muted)'}}>{k.l}</p>
              </div>
            ))}
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
            const expectedR=(Number(r.opening_balance)||0)+(s?.cash||0)
            const diff=r.closing_balance!=null?Number(r.closing_balance)-expectedR:null
            return(
              <div key={r.id} className='card' style={{marginBottom:10,overflow:'hidden',borderLeft:'3px solid '+(diff==null?'var(--border)':diff>=0?'var(--neon)':'#ff3333')}}>
                <div onClick={()=>setExpanded(expanded===r.id?null:r.id)} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',flexWrap:'wrap'}}>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{new Date(r.opened_at).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p>
                    <p style={{fontSize:11,color:'var(--muted)',marginTop:2,display:'flex',alignItems:'center',gap:5}}><Clock size={10}/>{new Date(r.opened_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}{r.closed_at?' - '+new Date(r.closed_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''}</p>
                  </div>
                  <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
                    <div style={{textAlign:'right'}}><p style={{fontSize:13,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(s?.total||0)}</p><p style={{fontSize:9,color:'var(--muted)'}}>total vendas</p></div>
                    <div style={{textAlign:'right'}}><p style={{fontSize:13,fontWeight:700,color:'#10b981',fontFamily:'JetBrains Mono,monospace'}}>{fmt(s?.cash||0)}</p><p style={{fontSize:9,color:'var(--muted)'}}>dinheiro</p></div>
                    <div style={{textAlign:'right'}}><p style={{fontSize:13,fontWeight:700,color:'var(--white)'}}>{s?.count||0}</p><p style={{fontSize:9,color:'var(--muted)'}}>pedidos</p></div>
                  </div>
                  {diff!=null&&<span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,background:diff>=0?'rgba(0,255,65,0.1)':'rgba(255,51,51,0.1)',color:diff>=0?'var(--neon)':'#ff3333'}}>{diff>=0?'+':''}{fmt(diff)}</span>}
                  {expanded===r.id?<ChevronUp size={14} color='var(--muted)'/>:<ChevronDown size={14} color='var(--muted)'/>}
                </div>
                {expanded===r.id&&(
                  <div style={{padding:'12px 16px',borderTop:'1px solid var(--border)',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10}}>
                    {[
                      {l:'Saldo Abertura',v:fmt(Number(r.opening_balance)||0)},
                      {l:'Total Vendas',v:fmt(s?.total||0)},
                      {l:'Dinheiro',v:fmt(s?.cash||0)},
                      {l:'PIX',v:fmt(s?.pix||0)},
                      {l:'Debito',v:fmt(s?.debito||0)},
                      {l:'Credito',v:fmt(s?.credito||0)},
                      {l:'Saldo Esperado',v:fmt(expectedR)},
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

      {sangriaModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:400,padding:24,border:'2px solid '+(sangriaType==='withdrawal'?'#ffaa00':'#10b981')}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              {sangriaType==='withdrawal'?<ArrowDownCircle size={22} color='#ffaa00'/>:<ArrowUpCircle size={22} color='#10b981'/>}
              <h2 className='font-bangers' style={{fontSize:22,color:sangriaType==='withdrawal'?'#ffaa00':'#10b981'}}>{sangriaType==='withdrawal'?'SANGRIA DE CAIXA':'SUPRIMENTO DE CAIXA'}</h2>
            </div>
            <p style={{fontSize:11,color:'var(--muted)',marginBottom:14}}>{sangriaType==='withdrawal'?'Registre uma retirada de dinheiro do caixa fisico.':'Registre uma entrada avulsa de dinheiro no caixa.'}</p>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>VALOR (R$) *</label>
            <input type='number' min='0.01' step='0.01' value={sangriaAmount} onChange={e=>setSangriaAmount(e.target.value)} placeholder='0,00' autoFocus style={{fontSize:20,textAlign:'center' as const,fontFamily:'JetBrains Mono,monospace',marginBottom:12}}/>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>MOTIVO (opcional)</label>
            <input value={sangriaReason} onChange={e=>setSangriaReason(e.target.value)} placeholder={sangriaType==='withdrawal'?'Ex: Pagamento de fornecedor':'Ex: Troco inicial'} style={{fontSize:13,marginBottom:16}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setSangriaModal(false);setSangriaAmount('');setSangriaReason('')}} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={saveSangria} disabled={sangriaLoading} style={{flex:2,padding:11,borderRadius:8,border:'none',background:sangriaType==='withdrawal'?'#ffaa00':'#10b981',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15,opacity:sangriaLoading?0.7:1}}>{sangriaLoading?'SALVANDO...':sangriaType==='withdrawal'?'REGISTRAR SANGRIA':'REGISTRAR SUPRIMENTO'}</button>
            </div>
          </div>
        </div>
      )}
      {cash.openModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:380,padding:24,border:'2px solid #ffaa00',boxShadow:'0 0 40px rgba(255,170,0,0.15)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
              <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,170,0,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><Unlock size={22} color='#ffaa00'/></div>
              <div><h2 className='font-bangers' style={{fontSize:22,color:'#ffaa00'}}>ABRIR CAIXA</h2><p style={{fontSize:12,color:'var(--muted)'}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p></div>
            </div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,letterSpacing:1}}>SALDO INICIAL EM CAIXA (R$)</label>
            <input type='number' min='0' step='0.01' value={cash.openBal} onChange={e=>cash.setOpenBal(e.target.value)} placeholder='0,00' autoFocus style={{fontSize:20,textAlign:'center',fontFamily:'JetBrains Mono,monospace',marginBottom:6}}/>
            <p style={{fontSize:11,color:'var(--muted)',marginBottom:18}}>Quanto dinheiro (fisico) tem no caixa agora?</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>cash.setOpenModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={cash.openCash} disabled={cash.saving} style={{flex:2,padding:11,borderRadius:8,border:'none',background:'#ffaa00',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:16,opacity:cash.saving?0.7:1}}>{cash.saving?'ABRINDO...':'ABRIR CAIXA'}</button>
            </div>
          </div>
        </div>
      )}

      {cash.closeModal&&cash.current&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:460,padding:24,border:'2px solid #ff3333',boxShadow:'0 0 40px rgba(255,51,51,0.1)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,51,51,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><Lock size={22} color='#ff3333'/></div>
              <div><h2 className='font-bangers' style={{fontSize:22,color:'#ff3333'}}>FECHAR CAIXA</h2><p style={{fontSize:12,color:'var(--muted)'}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}</p></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:6}}>
              {[
                {l:'Abertura',v:fmt(Number(cash.current.opening_balance)||0),c:'var(--muted)'},
                {l:'Dinheiro',v:fmt(salesNow?.cash||0),c:'#10b981'},
                {l:'PIX',v:fmt(salesNow?.pix||0),c:'#06b6d4'},
                {l:'Debito+Cred',v:fmt((salesNow?.debito||0)+(salesNow?.credito||0)),c:'#7c3aed'},
              ].map((k,i)=>(
                <div key={i} style={{padding:'8px 10px',background:'var(--surface)',borderRadius:8,textAlign:'center'}}>
                  <p style={{fontSize:12,fontWeight:700,color:k.c,fontFamily:'JetBrains Mono,monospace'}}>{k.v}</p>
                  <p style={{fontSize:9,color:'var(--muted)',marginTop:2}}>{k.l}</p>
                </div>
              ))}
            </div>
            <div style={{padding:'8px 12px',background:'rgba(255,170,0,0.06)',borderRadius:8,marginBottom:14,fontSize:12,color:'#ffaa00',display:'flex',justifyContent:'space-between'}}>
              <span>Saldo esperado (abertura + dinheiro)</span>
              <strong style={{fontFamily:'JetBrains Mono,monospace'}}>{fmt(expectedNow)}</strong>
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

      {/* Sangria / Suprimento Modal */}
      {entriesModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:400,padding:24,border:'1px solid var(--border-bright)'}}>
            <h2 className='font-bangers' style={{fontSize:20,color:'var(--white)',marginBottom:16}}>SANGRIA / SUPRIMENTO</h2>
            <div style={{display:'flex',gap:8,marginBottom:16}}>
              <button onClick={()=>setEntryType('withdrawal')} style={{flex:1,padding:'10px',borderRadius:8,border:entryType==='withdrawal'?'1px solid #ff3333':'1px solid var(--border)',background:entryType==='withdrawal'?'rgba(255,51,51,0.1)':'transparent',color:entryType==='withdrawal'?'#ff3333':'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <Minus size={14}/>SANGRIA (saida)
              </button>
              <button onClick={()=>setEntryType('deposit')} style={{flex:1,padding:'10px',borderRadius:8,border:entryType==='deposit'?'1px solid #10b981':'1px solid var(--border)',background:entryType==='deposit'?'rgba(16,185,129,0.1)':'transparent',color:entryType==='deposit'?'#10b981':'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <Plus size={14}/>SUPRIMENTO (entrada)
              </button>
            </div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>VALOR (R$) *</label>
            <input type='number' min='0.01' step='0.01' value={entryAmount} onChange={e=>setEntryAmount(e.target.value)} placeholder='0,00' autoFocus style={{fontSize:18,textAlign:'center',fontFamily:'JetBrains Mono,monospace',marginBottom:12,width:'100%'}}/>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>MOTIVO *</label>
            <input value={entryReason} onChange={e=>setEntryReason(e.target.value)} placeholder={entryType==='withdrawal'?'Troco para entregador, pagamento...':'Abertura adicional, fundo de troco...'} style={{marginBottom:16,width:'100%'}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setEntriesModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={saveEntry} disabled={savingEntry} style={{flex:2,padding:11,borderRadius:8,border:'none',background:entryType==='withdrawal'?'#f59e0b':'#10b981',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15,opacity:savingEntry?0.7:1}}>{savingEntry?'SALVANDO...':(entryType==='withdrawal'?'REGISTRAR SANGRIA':'REGISTRAR SUPRIMENTO')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}