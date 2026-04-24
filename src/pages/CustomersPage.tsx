import{useState,useEffect,useMemo,useCallback}from 'react'
import{supabase}from '@/lib/supabase'
import{Search,Edit2,Trash2,X,MapPin,User,Star,ChevronDown,ChevronUp,Plus}from 'lucide-react'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
type Cust={id:string;name:string;phone:string;address:string;neighborhood:string;orders_count:number;total_spent:number;created_at:string;hidden:boolean}
const INP:React.CSSProperties={width:'100%',background:'#1c1c1c',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'11px 14px',fontSize:14,outline:'none',boxSizing:'border-box'}
const LBL:React.CSSProperties={fontSize:11,color:'#888',fontWeight:600,letterSpacing:0.5,marginBottom:4,display:'block'}

// Componente Fields FORA do componente principal para evitar re-mount a cada render
function Fields({name,phone,address,neighborhood,onChange}:{name:string;phone:string;address:string;neighborhood:string;onChange:(k:string,v:string)=>void}){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div><span style={LBL}>NOME *</span><input value={name} onChange={e=>onChange('name',e.target.value)} placeholder='Nome completo' style={INP} autoFocus/></div>
      <div><span style={LBL}>WHATSAPP *</span><input value={phone} onChange={e=>onChange('phone',e.target.value)} placeholder='(27) 99999-9999' style={INP}/></div>
      <div><span style={LBL}>ENDERECO</span><input value={address} onChange={e=>onChange('address',e.target.value)} placeholder='Rua, numero' style={INP}/></div>
      <div><span style={LBL}>BAIRRO</span><input value={neighborhood} onChange={e=>onChange('neighborhood',e.target.value)} placeholder='Bairro' style={INP}/></div>
    </div>
  )
}

export default function CustomersPage(){
  const[list,setList]=useState<Cust[]>([])
  const[loading,setLoading]=useState(true)
  const[q,setQ]=useState('')
  const[open,setOpen]=useState<string|null>(null)
  const[editC,setEditC]=useState<Cust|null>(null)
  const[ef,setEf]=useState({name:'',phone:'',address:'',neighborhood:''})
  const[delC,setDelC]=useState<Cust|null>(null)
  const[addOpen,setAddOpen]=useState(false)
  const[af,setAf]=useState({name:'',phone:'',address:'',neighborhood:''})
  const[busy,setBusy]=useState(false)
  const[loyalty,setLoyalty]=useState<Record<string,number>>({})
  const GOAL=5

  useEffect(()=>{load()},[])

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('customers').select('id,name,phone,address,neighborhood,orders_count,total_spent,created_at,hidden').eq('hidden',false).order('name')
    const custs=(data||[]) as Cust[]
    setList(custs)
    if(custs.length>0){
      const ids=custs.map(c=>c.id)
      const{data:ords}=await supabase.from('orders').select('customer_id').in('customer_id',ids).in('status',['completed','delivered'])
      const m:Record<string,number>={}
      ;(ords||[]).forEach((o:any)=>{m[o.customer_id]=(m[o.customer_id]||0)+1})
      setLoyalty(m)
    }
    setLoading(false)
  }

  const onEfChange=useCallback((k:string,v:string)=>setEf(p=>({...p,[k]:v})),[])
  const onAfChange=useCallback((k:string,v:string)=>setAf(p=>({...p,[k]:v})),[])

  async function doEdit(){
    if(!editC||!ef.name.trim()||!ef.phone.trim()){alert('Nome e WhatsApp obrigatorios');return}
    setBusy(true)
    const ph=ef.phone.replace(/\D/g,'')
    const{error}=await supabase.from('customers').update({name:ef.name.trim(),phone:ph,address:ef.address,neighborhood:ef.neighborhood}).eq('id',editC.id)
    if(error){alert('Erro: '+error.message);setBusy(false);return}
    setList(prev=>prev.map(c=>c.id===editC.id?{...c,name:ef.name.trim(),phone:ph,address:ef.address,neighborhood:ef.neighborhood}:c))
    setEditC(null)
    setBusy(false)
  }

  async function doDelete(){
    if(!delC)return
    setBusy(true)
    const{data:linked}=await supabase.from('orders').select('id').eq('customer_id',delC.id).limit(1)
    if(linked&&linked.length>0){
      // Soft delete — esconder
      const{error}=await supabase.from('customers').update({hidden:true}).eq('id',delC.id)
      if(!error)setList(prev=>prev.filter(c=>c.id!==delC.id))
      setDelC(null);setBusy(false)
      return
    }
    const{error}=await supabase.from('customers').delete().eq('id',delC.id)
    if(error){alert('Erro: '+error.message);setBusy(false);return}
    setList(prev=>prev.filter(c=>c.id!==delC.id))
    setDelC(null);setBusy(false)
  }

  async function doAdd(){
    if(!af.name.trim()||!af.phone.trim()){alert('Nome e WhatsApp obrigatorios');return}
    setBusy(true)
    const{data,error}=await supabase.from('customers').insert({name:af.name.trim(),phone:af.phone.replace(/\D/g,''),address:af.address,neighborhood:af.neighborhood,orders_count:0,total_spent:0,hidden:false}).select().single()
    if(error){alert('Erro: '+error.message);setBusy(false);return}
    setList(prev=>[...prev,data as Cust].sort((a,b)=>a.name.localeCompare(b.name)))
    setAddOpen(false);setAf({name:'',phone:'',address:'',neighborhood:''});setBusy(false)
  }

  const filtered=useMemo(()=>list.filter(c=>{
    if(!q)return true
    const s=q.toLowerCase()
    return c.name?.toLowerCase().includes(s)||c.phone?.includes(s)||c.neighborhood?.toLowerCase().includes(s)
  }),[list,q])

  return(
    <div style={{padding:'16px 12px',maxWidth:640,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <User size={18} color='#00ff41'/>
        <h1 style={{fontFamily:'Bangers,cursive',fontSize:22,color:'#00ff41',letterSpacing:2,margin:0,flex:1}}>CLIENTES</h1>
        <span style={{fontSize:12,color:'#555'}}>{filtered.length}</span>
        <button onClick={()=>{setAddOpen(true);setAf({name:'',phone:'',address:'',neighborhood:''})}} style={{padding:'8px 14px',borderRadius:10,background:'#00ff41',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14,color:'#000',display:'flex',alignItems:'center',gap:6}}><Plus size={14}/>NOVO</button>
      </div>
      <div style={{position:'relative',marginBottom:12}}>
        <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#555'}}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder='Buscar nome, telefone ou bairro...' style={{...INP,paddingLeft:34}}/>
      </div>

      {loading?<p style={{textAlign:'center',padding:40,color:'#555'}}>Carregando...</p>:
      filtered.length===0?<p style={{textAlign:'center',padding:40,color:'#555'}}>Nenhum cliente</p>:
      filtered.map(c=>{
        const stamps=loyalty[c.id]||0
        const pct=Math.min(100,(stamps/GOAL)*100)
        const isOpen=open===c.id
        return(
          <div key={c.id} style={{background:'#161616',borderRadius:12,marginBottom:8,border:'1px solid #1e1e1e'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',cursor:'pointer'}} onClick={()=>setOpen(isOpen?null:c.id)}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(0,255,65,0.1)',border:'1px solid rgba(0,255,65,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontFamily:'Bangers,cursive',fontSize:14,color:'#00ff41'}}>{(c.name||'?')[0].toUpperCase()}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:14,fontWeight:600,color:'#fff',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</p>
                <p style={{fontSize:12,color:'#888',margin:'1px 0 0'}}>{c.phone}</p>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{fontSize:12,color:'#00ff41',fontWeight:700,margin:0,fontFamily:'monospace'}}>{fmt(c.total_spent||0)}</p>
                <p style={{fontSize:10,color:'#555',margin:0}}>{stamps}/{GOAL} fidelidade</p>
              </div>
              {isOpen?<ChevronUp size={13} color='#555'/>:<ChevronDown size={13} color='#555'/>}
            </div>
            {isOpen&&(
              <div style={{padding:'0 14px 14px',borderTop:'1px solid #1e1e1e'}}>
                <div style={{marginTop:10,marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:11,color:'#888',display:'flex',alignItems:'center',gap:4}}><Star size={9} color='#f59e0b'/>Fidelidade</span>
                    <span style={{fontSize:11,color:pct>=100?'#00ff41':'#f59e0b'}}>{stamps}/{GOAL} {pct>=100?'✅ META!':''}</span>
                  </div>
                  <div style={{height:5,borderRadius:3,background:'#2a2a2a'}}>
                    <div style={{height:'100%',width:pct+'%',background:pct>=100?'#00ff41':'linear-gradient(90deg,#f59e0b,#f97316)',borderRadius:3}}/>
                  </div>
                </div>
                {c.neighborhood&&<p style={{fontSize:12,color:'#888',margin:'0 0 2px',display:'flex',alignItems:'center',gap:4}}><MapPin size={10}/>{c.neighborhood}</p>}
                {c.address&&<p style={{fontSize:12,color:'#666',margin:0}}>{c.address}</p>}
                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <button onClick={()=>{setEditC(c);setEf({name:c.name||'',phone:c.phone||'',address:c.address||'',neighborhood:c.neighborhood||''})}}
                    style={{flex:2,padding:'9px',borderRadius:8,border:'1px solid #3b82f6',background:'rgba(59,130,246,0.1)',color:'#3b82f6',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontWeight:600}}>
                    <Edit2 size={12}/>Editar
                  </button>
                  <button onClick={()=>setDelC(c)} style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid rgba(255,51,51,0.3)',background:'rgba(255,51,51,0.08)',color:'#ff5555',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {editC&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:16}}>
          <div style={{background:'#161616',borderRadius:16,padding:24,width:'100%',maxWidth:420,border:'1px solid #2a2a2a',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#3b82f6',letterSpacing:1,margin:0,flex:1}}>EDITAR CLIENTE</h2>
              <button onClick={()=>setEditC(null)} style={{background:'#222',border:'none',borderRadius:8,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#888'}}><X size={13}/></button>
            </div>
            <Fields name={ef.name} phone={ef.phone} address={ef.address} neighborhood={ef.neighborhood} onChange={onEfChange}/>
            <div style={{display:'flex',gap:8,marginTop:18}}>
              <button onClick={()=>setEditC(null)} style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid #2a2a2a',background:'transparent',color:'#888',cursor:'pointer'}}>Cancelar</button>
              <button onClick={doEdit} disabled={busy} style={{flex:2,padding:'12px',borderRadius:10,border:'none',background:busy?'#333':'#3b82f6',color:busy?'#666':'#fff',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1}}>{busy?'SALVANDO...':'SALVAR'}</button>
            </div>
          </div>
        </div>
      )}

      {delC&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:16}}>
          <div style={{background:'#161616',borderRadius:16,padding:24,width:'100%',maxWidth:340,border:'1px solid rgba(255,51,51,0.2)',textAlign:'center'}}>
            <Trash2 size={28} color='#ff5555' style={{margin:'0 auto 12px'}}/>
            <h2 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#ff5555',letterSpacing:1,marginBottom:8}}>EXCLUIR</h2>
            <p style={{fontSize:14,color:'#ccc',margin:'0 0 6px'}}>{delC.name}</p>
            <p style={{fontSize:12,color:'#666',margin:'0 0 18px'}}>Com pedidos: sera ocultado. Sem pedidos: excluido.</p>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setDelC(null)} style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid #2a2a2a',background:'transparent',color:'#888',cursor:'pointer'}}>Cancelar</button>
              <button onClick={doDelete} disabled={busy} style={{flex:1,padding:'12px',borderRadius:10,border:'none',background:busy?'#333':'#ff5555',color:busy?'#666':'#fff',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:16}}>{busy?'...':'EXCLUIR'}</button>
            </div>
          </div>
        </div>
      )}

      {addOpen&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60,padding:16}}>
          <div style={{background:'#161616',borderRadius:16,padding:24,width:'100%',maxWidth:420,border:'1px solid #2a2a2a',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#00ff41',letterSpacing:1,margin:0,flex:1}}>NOVO CLIENTE</h2>
              <button onClick={()=>setAddOpen(false)} style={{background:'#222',border:'none',borderRadius:8,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#888'}}><X size={13}/></button>
            </div>
            <Fields name={af.name} phone={af.phone} address={af.address} neighborhood={af.neighborhood} onChange={onAfChange}/>
            <div style={{display:'flex',gap:8,marginTop:18}}>
              <button onClick={()=>setAddOpen(false)} style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid #2a2a2a',background:'transparent',color:'#888',cursor:'pointer'}}>Cancelar</button>
              <button onClick={doAdd} disabled={busy} style={{flex:2,padding:'12px',borderRadius:10,border:'none',background:busy?'#333':'#00ff41',color:busy?'#666':'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:16}}>{busy?'SALVANDO...':'ADICIONAR'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}