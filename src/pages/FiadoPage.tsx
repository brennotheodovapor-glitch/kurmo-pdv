import{useState,useEffect}from 'react'
import{CreditCard,Plus,X,Check,Search,Edit2,Trash2,DollarSign,AlertTriangle,Clock,CheckCircle}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Credit={id:string;customer_name:string;customer_phone?:string;description?:string;amount:number;paid_amount:number;status:string;due_date?:string;notes?:string;created_at:string}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const EMPTY={customer_name:'',customer_phone:'',description:'',amount:0,paid_amount:0,status:'open',due_date:'',notes:''}

export default function FiadoPage(){
  const[credits,setCredits]=useState<Credit[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[filter,setFilter]=useState<'all'|'open'|'partial'|'paid'>('open')
  const[modal,setModal]=useState(false)
  const[payModal,setPayModal]=useState<Credit|null>(null)
  const[edit,setEdit]=useState<Credit|null>(null)
  const[form,setForm]=useState(EMPTY)
  const[payValue,setPayValue]=useState('')
  const[saving,setSaving]=useState(false)

  useEffect(()=>{load()},[])

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('credit_sales').select('*').order('created_at',{ascending:false})
    setCredits(data||[])
    setLoading(false)
  }

  function openNew(){setEdit(null);setForm(EMPTY);setModal(true)}
  function openEdit(c:Credit){
    setEdit(c)
    setForm({customer_name:c.customer_name,customer_phone:c.customer_phone||'',description:c.description||'',amount:c.amount,paid_amount:c.paid_amount,status:c.status,due_date:c.due_date||'',notes:c.notes||''})
    setModal(true)
  }

  async function save(){
    if(!form.customer_name.trim()){toast.error('Nome obrigatório');return}
    if(!form.amount||form.amount<=0){toast.error('Valor obrigatório');return}
    setSaving(true)
    const payload={
      customer_name:form.customer_name.trim(),
      customer_phone:form.customer_phone||null,
      description:form.description||null,
      amount:Number(form.amount),
      paid_amount:Number(form.paid_amount)||0,
      status:Number(form.paid_amount)>=Number(form.amount)?'paid':Number(form.paid_amount)>0?'partial':'open',
      due_date:form.due_date||null,
      notes:form.notes||null,
      updated_at:new Date().toISOString()
    }
    if(edit){
      const{error}=await supabase.from('credit_sales').update(payload).eq('id',edit.id)
      if(error){toast.error(error.message);setSaving(false);return}
      toast.success('Fiado atualizado!')
    }else{
      const{error}=await supabase.from('credit_sales').insert(payload)
      if(error){toast.error(error.message);setSaving(false);return}
      toast.success('Fiado registrado!')
    }
    setSaving(false);setModal(false);load()
  }

  async function registerPayment(){
    if(!payModal)return
    const value=parseFloat(payValue)||0
    if(value<=0){toast.error('Informe o valor pago');return}
    const newPaid=Math.min(Number(payModal.paid_amount)+value,Number(payModal.amount))
    const newStatus=newPaid>=Number(payModal.amount)?'paid':newPaid>0?'partial':'open'
    setSaving(true)
    const{error}=await supabase.from('credit_sales').update({paid_amount:newPaid,status:newStatus,updated_at:new Date().toISOString()}).eq('id',payModal.id)
    if(error){toast.error(error.message);setSaving(false);return}
    toast.success(newStatus==='paid'?'Fiado quitado! ✅':'Pagamento registrado!')
    setSaving(false);setPayModal(null);setPayValue('');load()
  }

  async function del(id:string,name:string){
    if(!confirm('Remover fiado de '+name+'?'))return
    await supabase.from('credit_sales').delete().eq('id',id)
    toast.success('Removido');load()
  }

  const filtered=credits.filter(c=>{
    if(filter!=='all'&&c.status!==filter)return false
    if(search&&!c.customer_name.toLowerCase().includes(search.toLowerCase())&&!(c.customer_phone||'').includes(search))return false
    return true
  })

  const totalAberto=credits.filter(c=>c.status!=='paid').reduce((s,c)=>s+(Number(c.amount)-Number(c.paid_amount)),0)
  const totalPago=credits.filter(c=>c.status==='paid').length
  const totalAbertos=credits.filter(c=>c.status!=='paid').length

  const STATUS_COLOR:Record<string,string>={open:'#ff3333',partial:'#f59e0b',paid:'#10b981'}
  const STATUS_LABEL:Record<string,string>={open:'Em aberto',partial:'Parcial',paid:'Quitado'}
  const STATUS_ICON:Record<string,any>={open:AlertTriangle,partial:Clock,paid:CheckCircle}

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',flexShrink:0}}>
        <CreditCard size={18} color='#f59e0b'/>
        <h1 className='font-bangers' style={{fontSize:24,color:'#f59e0b',letterSpacing:1}}>FIADO</h1>
        <div style={{position:'relative',flex:1,minWidth:160,maxWidth:280}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar cliente...' style={{paddingLeft:30,fontSize:13}}/>
        </div>
        <div style={{display:'flex',gap:5}}>
          {(['all','open','partial','paid'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:'4px 10px',borderRadius:8,border:filter===f?'1px solid #f59e0b':'1px solid var(--border)',background:filter===f?'rgba(245,158,11,0.1)':'transparent',color:filter===f?'#f59e0b':'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>
              {f==='all'?'Todos':f==='open'?'Abertos':f==='partial'?'Parcial':'Quitados'}
            </button>
          ))}
        </div>
        <button onClick={openNew} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:8,border:'none',background:'#f59e0b',color:'#000',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive',fontWeight:700,marginLeft:'auto'}}>
          <Plus size={13}/>NOVO FIADO
        </button>
      </div>

      {/* Stats */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',background:'var(--surface)',flexShrink:0}}>
        <div style={{flex:1,padding:'10px 16px',borderRight:'1px solid var(--border)'}}>
          <p style={{fontSize:20,fontWeight:700,color:'#ff3333',fontFamily:'JetBrains Mono,monospace'}}>{fmt(totalAberto)}</p>
          <p style={{fontSize:10,color:'var(--muted)'}}>Total em aberto</p>
        </div>
        <div style={{flex:1,padding:'10px 16px',borderRight:'1px solid var(--border)'}}>
          <p style={{fontSize:20,fontWeight:700,color:'#f59e0b'}}>{totalAbertos}</p>
          <p style={{fontSize:10,color:'var(--muted)'}}>Clientes devendo</p>
        </div>
        <div style={{flex:1,padding:'10px 16px'}}>
          <p style={{fontSize:20,fontWeight:700,color:'#10b981'}}>{totalPago}</p>
          <p style={{fontSize:10,color:'var(--muted)'}}>Quitados</p>
        </div>
      </div>

      {/* List */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        filtered.length===0?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}><CreditCard size={32} style={{opacity:0.2,marginBottom:8}}/><p>Nenhum fiado {filter!=='all'?'nesta categoria':''}</p></div>:
        filtered.map(cr=>{
          const saldo=Number(cr.amount)-Number(cr.paid_amount)
          const StatusIcon=STATUS_ICON[cr.status]||AlertTriangle
          const isOverdue=cr.due_date&&cr.status!=='paid'&&new Date(cr.due_date)<new Date()
          return(
            <div key={cr.id} className='card' style={{marginBottom:8,padding:'12px 14px',borderLeft:'3px solid '+(STATUS_COLOR[cr.status]||'var(--border)'),(isOverdue?{boxShadow:'0 0 8px rgba(255,51,51,0.2)'}:{}) as any}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
                    <p style={{fontSize:14,fontWeight:700,color:'var(--white)'}}>{cr.customer_name}</p>
                    {cr.customer_phone&&<p style={{fontSize:11,color:'var(--muted)'}}>{cr.customer_phone}</p>}
                    <span style={{fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:20,background:STATUS_COLOR[cr.status]+'22',color:STATUS_COLOR[cr.status],display:'flex',alignItems:'center',gap:3}}>
                      <StatusIcon size={9}/>{STATUS_LABEL[cr.status]}
                    </span>
                    {isOverdue&&<span style={{fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:20,background:'rgba(255,51,51,0.15)',color:'#ff3333'}}>VENCIDO</span>}
                  </div>
                  {cr.description&&<p style={{fontSize:12,color:'var(--muted)',marginBottom:3}}>{cr.description}</p>}
                  {cr.due_date&&<p style={{fontSize:11,color:isOverdue?'#ff3333':'var(--muted)'}}>Vence: {new Date(cr.due_date+'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <p style={{fontSize:18,fontWeight:700,color:cr.status==='paid'?'#10b981':'#ff3333',fontFamily:'JetBrains Mono,monospace'}}>{fmt(saldo)}</p>
                  <p style={{fontSize:10,color:'var(--muted)'}}>de {fmt(Number(cr.amount))}</p>
                  {Number(cr.paid_amount)>0&&<p style={{fontSize:10,color:'#10b981'}}>pago: {fmt(Number(cr.paid_amount))}</p>}
                </div>
              </div>
              {/* Actions */}
              <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                {cr.status!=='paid'&&(
                  <button onClick={()=>{setPayModal(cr);setPayValue(String(saldo))}} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:7,border:'none',background:'#10b981',color:'#fff',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',fontWeight:700}}>
                    <DollarSign size={11}/>REGISTRAR PAGAMENTO
                  </button>
                )}
                <button onClick={()=>openEdit(cr)} style={{display:'flex',alignItems:'center',gap:4,padding:'6px 10px',borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12}}><Edit2 size={11}/></button>
                <button onClick={()=>del(cr.id,cr.customer_name)} style={{display:'flex',alignItems:'center',gap:4,padding:'6px 10px',borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',fontSize:12}}><Trash2 size={11}/></button>
              </div>
            </div>
          )
        })}
      </div>

      {/* NEW/EDIT MODAL */}
      {modal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:50}}>
          <div className='card' style={{width:'100%',maxWidth:480,padding:20,margin:12,border:'1px solid #f59e0b',borderRadius:16,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <h2 className='font-bangers' style={{fontSize:22,color:'#f59e0b'}}>{edit?'EDITAR':'NOVO'} FIADO</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={18}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>CLIENTE *</label><input value={form.customer_name} onChange={e=>setForm(f=>({...f,customer_name:e.target.value}))} placeholder='Nome do cliente'/></div>
              <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>TELEFONE</label><input value={form.customer_phone} onChange={e=>setForm(f=>({...f,customer_phone:e.target.value}))} placeholder='(27) 99999-9999' type='tel'/></div>
              <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>DESCRIÇÃO</label><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder='O que foi fiado?'/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>VALOR TOTAL *</label><input type='number' min='0' step='0.01' value={form.amount||''} onChange={e=>setForm(f=>({...f,amount:parseFloat(e.target.value)||0}))} placeholder='0,00'/></div>
                <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>JÁ PAGOU</label><input type='number' min='0' step='0.01' value={form.paid_amount||''} onChange={e=>setForm(f=>({...f,paid_amount:parseFloat(e.target.value)||0}))} placeholder='0,00'/></div>
              </div>
              <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>DATA DE VENCIMENTO</label><input type='date' value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))}/></div>
              <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>OBSERVAÇÕES</label><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder='Anotações...'/></div>
            </div>
            {form.amount>0&&(
              <div style={{padding:'7px 12px',background:'var(--surface)',borderRadius:7,display:'flex',justifyContent:'space-between',marginTop:10,fontSize:12}}>
                <span style={{color:'var(--muted)'}}>Saldo devedor</span>
                <span style={{fontWeight:700,color:'#f59e0b',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Math.max(0,(form.amount||0)-(form.paid_amount||0)))}</span>
              </div>
            )}
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={save} disabled={saving} style={{flex:2,padding:10,borderRadius:8,border:'none',background:'#f59e0b',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14,opacity:saving?0.7:1}}>
                <Check size={13} style={{display:'inline',marginRight:5}}/>{saving?'SALVANDO...':'SALVAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAY MODAL */}
      {payModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:380,padding:22,border:'1px solid #10b981',borderRadius:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <h2 className='font-bangers' style={{fontSize:22,color:'#10b981'}}>REGISTRAR PAGAMENTO</h2>
              <button onClick={()=>{setPayModal(null);setPayValue('')}} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={18}/></button>
            </div>
            <p style={{fontSize:13,color:'var(--white)',marginBottom:4}}>{payModal.customer_name}</p>
            <p style={{fontSize:11,color:'var(--muted)',marginBottom:14}}>{payModal.description}</p>
            <div style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'var(--surface)',borderRadius:8,marginBottom:14}}>
              <span style={{fontSize:12,color:'var(--muted)'}}>Saldo devedor</span>
              <span style={{fontSize:14,fontWeight:700,color:'#ff3333',fontFamily:'JetBrains Mono,monospace'}}>{fmt(Number(payModal.amount)-Number(payModal.paid_amount))}</span>
            </div>
            <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4}}>VALOR RECEBIDO *</label>
            <input type='number' min='0' step='0.01' value={payValue} onChange={e=>setPayValue(e.target.value)} placeholder='0,00' autoFocus style={{fontSize:22,textAlign:'center',fontFamily:'JetBrains Mono,monospace',marginBottom:10}}/>
            <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
              {[25,50,100].map(v=>(
                <button key={v} onClick={()=>setPayValue(String(v))} style={{padding:'4px 10px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12}}>{fmt(v)}</button>
              ))}
              <button onClick={()=>setPayValue(String(Number(payModal.amount)-Number(payModal.paid_amount)))} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #10b981',background:'rgba(16,185,129,0.08)',color:'#10b981',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>TUDO</button>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setPayModal(null);setPayValue('')}} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={registerPayment} disabled={saving} style={{flex:2,padding:10,borderRadius:8,border:'none',background:'#10b981',color:'#fff',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14,opacity:saving?0.7:1}}>
                <Check size={13} style={{display:'inline',marginRight:5}}/>{saving?'SALVANDO...':'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}