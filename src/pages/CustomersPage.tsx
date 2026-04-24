import{useState,useEffect,useMemo}from 'react'
import{supabase}from '@/lib/supabase'
import{Search,Edit2,Trash2,X,MapPin,User,Star,ChevronDown,ChevronUp,Plus}from 'lucide-react'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
type Cust={id:string;name:string;phone:string;address:string;neighborhood:string;orders_count:number;total_spent:number}

export default function CustomersPage(){
  const[list,setList]=useState<Cust[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[open,setOpen]=useState<string|null>(null)
  const[editId,setEditId]=useState<string|null>(null)
  const[eName,setEName]=useState('')
  const[ePhone,setEPhone]=useState('')
  const[eAddr,setEAddr]=useState('')
  const[eNeigh,setENeigh]=useState('')
  const[delId,setDelId]=useState<string|null>(null)
  const[delName,setDelName]=useState('')
  const[addOpen,setAddOpen]=useState(false)
  const[aName,setAName]=useState('')
  const[aPhone,setAPhone]=useState('')
  const[aAddr,setAAddr]=useState('')
  const[aNeigh,setANeigh]=useState('')
  const[saving,setSaving]=useState(false)
  const[loyalMap,setLoyalMap]=useState<Record<string,number>>({})
  const GOAL=10

  useEffect(()=>{load()},[])

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('customers')
      .select('id,name,phone,address,neighborhood,orders_count,total_spent')
      .order('name')
    const custs=(data||[]) as Cust[]
    setList(custs)
    if(custs.length>0){
      const ids=custs.map(c=>c.id)
      const{data:ords}=await supabase.from('orders')
        .select('customer_id')
        .in('customer_id',ids)
        .in('status',['completed','delivered'])
      const m:Record<string,number>={}
      ;(ords||[]).forEach((o:any)=>{m[o.customer_id]=(m[o.customer_id]||0)+1})
      setLoyalMap(m)
    }
    setLoading(false)
  }

  function openEdit(c:Cust){
    setEditId(c.id);setEName(c.name||'');setEPhone(c.phone||'');setEAddr(c.address||'');setENeigh(c.neighborhood||'')
  }

  async function saveEdit(){
    if(!editId||!eName.trim()||!ePhone.trim()){alert('Nome e telefone obrigatorios');return}
    setSaving(true)
    const ph=ePhone.replace(/\D/g,'')
    const{error}=await supabase.from('customers').update({name:eName.trim(),phone:ph,address:eAddr,neighborhood:eNeigh}).eq('id',editId)
    if(error){alert('Erro ao salvar: '+error.message);setSaving(false);return}
    setList(prev=>prev.map(c=>c.id===editId?{...c,name:eName.trim(),phone:ph,address:eAddr,neighborhood:eNeigh}:c))
    setEditId(null);setSaving(false)
  }

  function openDelete(c:Cust){setDelId(c.id);setDelName(c.name)}

  async function doDelete(){
    if(!delId)return
    setSaving(true)
    const{data:linked}=await supabase.from('orders').select('id').eq('customer_id',delId).limit(1)
    if(linked&&linked.length>0){setSaving(false);setDelId(null);alert('Cliente tem pedidos vinculados e nao pode ser excluido.');return}
    const{error}=await supabase.from('customers').delete().eq('id',delId)
    if(error){alert('Erro: '+error.message);setSaving(false);return}
    setList(prev=>prev.filter(c=>c.id!==delId));setDelId(null);setSaving(false)
  }

  async function doAdd(){
    if(!aName.trim()||!aPhone.trim()){alert('Nome e telefone obrigatorios');return}
    setSaving(true)
    const ph=aPhone.replace(/\D/g,'')
    const{data,error}=await supabase.from('customers')
      .insert({name:aName.trim(),phone:ph,address:aAddr,neighborhood:aNeigh,orders_count:0,total_spent:0})
      .select('id,name,phone,address,neighborhood,orders_count,total_spent').single()
    if(error){alert('Erro: '+error.message);setSaving(false);return}
    if(data)setList(prev=>[...prev,data as Cust].sort((a,b)=>a.name.localeCompare(b.name)))
    setAddOpen(false);setAName('');setAPhone('');setAAddr('');setANeigh('');setSaving(false)
  }

  const filtered=useMemo(()=>list.filter(c=>{
    if(!search)return true
    const s=search.toLowerCase()
    return c.name?.toLowerCase().includes(s)||c.phone?.includes(s)||c.neighborhood?.toLowerCase().includes(s)
  }),[list,search])

  const S:React.CSSProperties={width:'100%',background:'#1c1c1c',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'11px 14px',fontSize:14,outline:'none',boxSizing:'border-box'}
  const LBL:React.CSSProperties={fontSize:11,color:'#888',fontWeight:600,letterSpacing:0.5,marginBottom:4,display:'block'}

  return(
    <div style={{padding:'16px 12px',maxWidth:680,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <User size={20} color='var(--neon)'/>
        <h1 style={{fontFamily:'Bangers,cursive',fontSize:22,color:'var(--neon)',letterSpacing:2,margin:0,flex:1}}>CLIENTES</h1>
        <span style={{fontSize:12,color:'#555'}}>{filtered.length}</span>
        <button onClick={()=>setAddOpen(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:'var(--neon)',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14,color:'#000'}}><Plus size={14}/>NOVO</button>
      </div>
      <div style={{position:'relative',marginBottom:14}}>
        <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#555'}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar...' style={{...S,paddingLeft:36}}/>
      </div>
      {loading?<p style={{textAlign:'center',padding:40,color:'#555'}}>Carregando...</p>:filtered.length===0?<p style={{textAlign:'center',padding:40,color:'#555'}}>Nenhum cliente</p>:
      filtered.map(c=>{
        const stamps=loyalMap[c.id]||0;const pct=Math.min(100,Math.round(stamps/GOAL*100));const isOpen=open===c.id
        return(
          <div key={c.id} style={{background:'#161616',borderRadius:12,marginBottom:8,border:'1px solid #1e1e1e'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',cursor:'pointer'}} onClick={()=>setOpen(isOpen?null:c.id)}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'rgba(0,255,65,0.1)',border:'1px solid rgba(0,255,65,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontFamily:'Bangers,cursive',fontSize:15,color:'var(--neon)'}}>{(c.name||'?')[0].toUpperCase()}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:14,fontWeight:600,color:'#fff',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</p>
                <p style={{fontSize:12,color:'#888',margin:'1px 0 0'}}>{c.phone}</p>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{fontSize:12,color:'var(--neon)',fontWeight:700,margin:0,fontFamily:'JetBrains Mono,monospace'}}>{fmt(c.total_spent||0)}</p>
                <p style={{fontSize:10,color:'#555',margin:0}}>{stamps} finalizados</p>
              </div>
              {isOpen?<ChevronUp size={14} color='#555'/>:<ChevronDown size={14} color='#555'/>}
            </div>
            {isOpen&&(
              <div style={{padding:'0 14px 14px',borderTop:'1px solid #1e1e1e'}}>
                <div style={{marginTop:10,marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:11,color:'#888',display:'flex',alignItems:'center',gap:4}}><Star size={10} color='#f59e0b'/>Fidelidade ({stamps}/{GOAL})</span>
                    <span style={{fontSize:11,color:'#f59e0b'}}>{pct}%</span>
                  </div>
                  <div style={{height:6,borderRadius:3,background:'#2a2a2a'}}><div style={{height:'100%',width:pct+'%',background:'linear-gradient(90deg,#f59e0b,#f97316)',borderRadius:3}}/></div>
                  {stamps>=GOAL&&<p style={{fontSize:11,color:'#f59e0b',margin:'4px 0 0'}}>Meta atingida!</p>}
                </div>
                {c.neighborhood&&<p style={{fontSize:12,color:'#888',margin:'0 0 2px',display:'flex',alignItems:'center',gap:5}}><MapPin size={10}/>{c.neighborhood}</p>}
                {c.address&&<p style={{fontSize:12,color:'#666',margin:'0 0 2px'}}>{c.address}</p>}
                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <button onClick={e=>{e.stopPropagation();openEdit(c)}} style={{flex:2,padding:'8px',borderRadius:8,border:'1px solid #3b82f6',background:'rgba(59,130,246,0.1)',color:'#3b82f6',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontWeight:600}}><Edit2 size={13}/>Editar</button>
                  <button onClick={e=>{e.stopPropagation();openDelete(c)}} style={{flex:1,padding:'8px',borderRadius:8,border:'1px solid rgba(255,51,51,0.3)',background:'rgba(255,51,51,0.08)',color:'#ff5555',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={13}/></button>
                </div>
              </div>
            )}
          </div>
        )
      })}
      {editId&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div style={{background:'#161616',borderRadius:16,padding:24,width:'100%',maxWidth:420,border:'1px solid #2a2a2a'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
              <Edit2 size={16} color='#3b82f6'/>
              <h2 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#3b82f6',margin:0,flex:1}}>EDITAR CLIENTE</h2>
              <button onClick={()=>setEditId(null)} style={{background:'#222',border:'none',borderRadius:8,width:30,height:30,cursor:'pointer',color:'#888',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div><span style={LBL}>Nome *</span><input value={eName} onChange={e=>setEName(e.target.value)} style={S}/></div>
              <div><span style={LBL}>WhatsApp *</span><input value={ePhone} onChange={e=>setEPhone(e.target.value)} style={S} inputMode='numeric'/></div>
              <div><span style={LBL}>Endereco</span><input value={eAddr} onChange={e=>setEAddr(e.target.value)} style={S}/></div>
              <div><span style={LBL}>Bairro</span><input value={eNeigh} onChange={e=>setENeigh(e.target.value)} style={S}/></div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:20}}>
              <button onClick={()=>setEditId(null)} style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid #2a2a2a',background:'transparent',color:'#888',cursor:'pointer'}}>Cancelar</button>
              <button onClick={saveEdit} disabled={saving} style={{flex:2,padding:'12px',borderRadius:10,border:'none',background:saving?'#333':'#3b82f6',color:saving?'#555':'#fff',cursor:saving?'not-allowed':'pointer',fontFamily:'Bangers,cursive',fontSize:16}}>{saving?'SALVANDO...':'SALVAR'}</button>
            </div>
          </div>
        </div>
      )}
      {delId&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div style={{background:'#161616',borderRadius:16,padding:24,width:'100%',maxWidth:360,border:'1px solid rgba(255,51,51,0.2)'}}>
            <div style={{textAlign:'center',marginBottom:20}}>
              <Trash2 size={32} color='#ff5555' style={{margin:'0 auto 12px',display:'block'}}/>
              <h2 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#ff5555',marginBottom:8}}>EXCLUIR</h2>
              <p style={{fontSize:14,color:'#ccc',margin:0}}>{delName}</p>
              <p style={{fontSize:12,color:'#666',marginTop:6}}>Clientes com pedidos nao podem ser excluidos.</p>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setDelId(null)} style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid #2a2a2a',background:'transparent',color:'#888',cursor:'pointer'}}>Cancelar</button>
              <button onClick={doDelete} disabled={saving} style={{flex:1,padding:'12px',borderRadius:10,border:'none',background:saving?'#333':'#ff5555',color:saving?'#555':'#fff',cursor:saving?'not-allowed':'pointer',fontFamily:'Bangers,cursive',fontSize:16}}>{saving?'...':'EXCLUIR'}</button>
            </div>
          </div>
        </div>
      )}
      {addOpen&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div style={{background:'#161616',borderRadius:16,padding:24,width:'100%',maxWidth:420,border:'1px solid #2a2a2a'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
              <Plus size={16} color='var(--neon)'/>
              <h2 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'var(--neon)',margin:0,flex:1}}>NOVO CLIENTE</h2>
              <button onClick={()=>setAddOpen(false)} style={{background:'#222',border:'none',borderRadius:8,width:30,height:30,cursor:'pointer',color:'#888',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div><span style={LBL}>Nome *</span><input value={aName} onChange={e=>setAName(e.target.value)} style={S}/></div>
              <div><span style={LBL}>WhatsApp *</span><input value={aPhone} onChange={e=>setAPhone(e.target.value)} style={S} inputMode='numeric'/></div>
              <div><span style={LBL}>Endereco</span><input value={aAddr} onChange={e=>setAAddr(e.target.value)} style={S}/></div>
              <div><span style={LBL}>Bairro</span><input value={aNeigh} onChange={e=>setANeigh(e.target.value)} style={S}/></div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:20}}>
              <button onClick={()=>setAddOpen(false)} style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid #2a2a2a',background:'transparent',color:'#888',cursor:'pointer'}}>Cancelar</button>
              <button onClick={doAdd} disabled={saving} style={{flex:2,padding:'12px',borderRadius:10,border:'none',background:saving?'#333':'var(--neon)',color:saving?'#555':'#000',cursor:saving?'not-allowed':'pointer',fontFamily:'Bangers,cursive',fontSize:16}}>{saving?'SALVANDO...':'ADICIONAR'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}