import{useState,useEffect}from 'react'
import{MapPin,Plus,Edit2,Trash2,X,Check,ChevronDown,ChevronUp,Search,CheckSquare,Square,Pencil}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Zone={id:string;name:string;fee:number;min_time:number;max_time:number;active:boolean}

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function DeliveryZonesPage(){
  const[zones,setZones]=useState<Zone[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[modal,setModal]=useState(false)
  const[edit,setEdit]=useState<Zone|null>(null)
  const[form,setForm]=useState({name:'',fee:0,min_time:30,max_time:60})
  const[saving,setSaving]=useState(false)
  // Bulk edit
  const[selected,setSelected]=useState<Set<string>>(new Set())
  const[bulkModal,setBulkModal]=useState(false)
  const[bulkFee,setBulkFee]=useState('')
  const[bulkMinTime,setBulkMinTime]=useState('')
  const[bulkMaxTime,setBulkMaxTime]=useState('')
  const[bulkSaving,setBulkSaving]=useState(false)

  useEffect(()=>{load()},[])

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('delivery_zones').select('*').order('name')
    setZones(data||[])
    setLoading(false)
  }

  function openNew(){setEdit(null);setForm({name:'',fee:0,min_time:30,max_time:60});setModal(true)}
  function openEdit(z:Zone){setEdit(z);setForm({name:z.name,fee:z.fee,min_time:z.min_time,max_time:z.max_time});setModal(true)}

  async function save(){
    if(!form.name.trim()){toast.error('Informe o nome');return}
    setSaving(true)
    if(edit){
      const{error}=await supabase.from('delivery_zones').update({...form}).eq('id',edit.id)
      if(error){toast.error(error.message);setSaving(false);return}
      toast.success('Atualizado!')
    }else{
      const{error}=await supabase.from('delivery_zones').insert({...form,active:true})
      if(error){toast.error(error.message);setSaving(false);return}
      toast.success('Bairro adicionado!')
    }
    setSaving(false);setModal(false);load()
  }

  async function del(id:string){
    if(!confirm('Remover bairro?'))return
    await supabase.from('delivery_zones').delete().eq('id',id)
    toast.success('Removido');load()
  }

  async function toggle(z:Zone){
    await supabase.from('delivery_zones').update({active:!z.active}).eq('id',z.id)
    load()
  }

  // BULK EDIT
  function toggleSelect(id:string){
    setSelected(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n})
  }
  function selectAll(){
    if(selected.size===filtered.length)setSelected(new Set())
    else setSelected(new Set(filtered.map(z=>z.id)))
  }

  async function applyBulk(){
    if(selected.size===0){toast.error('Selecione pelo menos um bairro');return}
    if(!bulkFee&&!bulkMinTime&&!bulkMaxTime){toast.error('Preencha pelo menos um campo');return}
    setBulkSaving(true)
    const upd:any={}
    if(bulkFee!=='')upd.fee=parseFloat(bulkFee)
    if(bulkMinTime!=='')upd.min_time=parseInt(bulkMinTime)
    if(bulkMaxTime!=='')upd.max_time=parseInt(bulkMaxTime)
    const ids=[...selected]
    // Update in batches
    let errors=0
    for(const id of ids){
      const{error}=await supabase.from('delivery_zones').update(upd).eq('id',id)
      if(error)errors++
    }
    if(errors>0)toast.error(errors+' erros ao salvar')
    else toast.success('✅ '+ids.length+' bairros atualizados!')
    setBulkSaving(false);setBulkModal(false)
    setSelected(new Set());setBulkFee('');setBulkMinTime('');setBulkMaxTime('')
    load()
  }

  const filtered=zones.filter(z=>!search||z.name.toLowerCase().includes(search.toLowerCase()))
  const totalActive=zones.filter(z=>z.active).length
  const avgFee=zones.length>0?(zones.reduce((s,z)=>s+Number(z.fee),0)/zones.length):0

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {/* Header */}
      <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',flexShrink:0}}>
        <MapPin size={18} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:24}}>BAIRROS E FRETES</h1>
        <span style={{fontSize:12,color:'var(--muted)'}}>{zones.length} bairros</span>
        <div style={{position:'relative',flex:1,minWidth:150,maxWidth:260}}>
          <Search size={13} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar bairro...' style={{paddingLeft:28,fontSize:13}}/>
        </div>
        {selected.size>0&&(
          <button onClick={()=>setBulkModal(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,border:'1px solid #f59e0b',background:'rgba(245,158,11,0.1)',color:'#f59e0b',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive',letterSpacing:0.5}}>
            <Pencil size={13}/> EDITAR {selected.size} SELECIONADOS
          </button>
        )}
        <button onClick={openNew} className='btn-neon-fill' style={{fontSize:13,padding:'7px 14px',display:'flex',alignItems:'center',gap:5,marginLeft:selected.size>0?0:'auto'}}>
          <Plus size={13}/>NOVO BAIRRO
        </button>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--border)',background:'var(--surface)',flexShrink:0}}>
        {[
          {label:'Total de bairros',val:String(zones.length),color:'var(--neon)'},
          {label:'Frete médio',val:fmt(avgFee),color:'#f59e0b'},
          {label:'Bairros ativos',val:String(totalActive),color:'#10b981'},
        ].map((s,i)=>(
          <div key={i} style={{flex:1,padding:'10px 16px',borderRight:'1px solid var(--border)'}}>
            <p style={{fontSize:18,fontWeight:700,color:s.color,fontFamily:'JetBrains Mono,monospace'}}>{s.val}</p>
            <p style={{fontSize:10,color:'var(--muted)'}}>{s.label}</p>
          </div>
        ))}
        {/* Select all */}
        <div style={{padding:'10px 16px',display:'flex',alignItems:'center'}}>
          <button onClick={selectAll} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:7,border:'1px solid var(--border)',background:selected.size===filtered.length&&filtered.length>0?'var(--neon-glow)':'transparent',color:selected.size===filtered.length&&filtered.length>0?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>
            {selected.size===filtered.length&&filtered.length>0?<CheckSquare size={13}/>:<Square size={13}/>}
            {selected.size>0?selected.size+' selecionados':'SELECIONAR TODOS'}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{flex:1,overflowY:'auto',padding:'10px 14px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        filtered.map(z=>(
          <div key={z.id} className='card' style={{marginBottom:6,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,opacity:z.active?1:0.5,borderLeft:selected.has(z.id)?'3px solid var(--neon)':'3px solid transparent',cursor:'pointer'}}
            onClick={()=>toggleSelect(z.id)}>
            {/* Checkbox */}
            <div style={{flexShrink:0,color:selected.has(z.id)?'var(--neon)':'var(--muted)'}}>
              {selected.has(z.id)?<CheckSquare size={16}/>:<Square size={16}/>}
            </div>
            <div style={{width:8,height:8,borderRadius:'50%',background:z.active?'#10b981':'#ff3333',flexShrink:0}}/>
            <p style={{flex:1,fontSize:14,fontWeight:600,color:'var(--white)'}}>{z.name}</p>
            <span style={{fontSize:14,fontWeight:700,color:'#f59e0b',fontFamily:'JetBrains Mono,monospace',minWidth:60,textAlign:'right'}}>{fmt(z.fee)}</span>
            <span style={{fontSize:11,color:'var(--muted)',minWidth:70,textAlign:'center'}}>{z.min_time}-{z.max_time} min</span>
            <button onClick={e=>{e.stopPropagation();toggle(z)}} style={{fontSize:10,padding:'3px 8px',borderRadius:6,border:z.active?'1px solid #10b981':'1px solid #ff3333',background:z.active?'rgba(16,185,129,0.1)':'rgba(255,51,51,0.1)',color:z.active?'#10b981':'#ff3333',cursor:'pointer',fontFamily:'Bangers,cursive',whiteSpace:'nowrap'}}>{z.active?'ATIVO':'INATIVO'}</button>
            <button onClick={e=>{e.stopPropagation();openEdit(z)}} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={12}/></button>
            <button onClick={e=>{e.stopPropagation();del(z.id)}} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={12}/></button>
          </div>
        ))}
        {filtered.length===0&&<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}><MapPin size={32} style={{opacity:0.2,marginBottom:8}}/><p>Nenhum bairro encontrado</p></div>}
      </div>

      {/* SINGLE EDIT MODAL */}
      {modal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:400,padding:22,border:'1px solid var(--border-bright)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h2 className='font-bangers neon-text-sm' style={{fontSize:20}}>{edit?'EDITAR':'NOVO'} BAIRRO</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={16}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>NOME DO BAIRRO</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder='Ex: Jardim da Penha'/></div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>FRETE (R$)</label><input type='number' min='0' step='0.50' value={form.fee===0?'':form.fee} onChange={e=>setForm(f=>({...f,fee:parseFloat(e.target.value)||0}))} placeholder='0,00'/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>TEMPO MÍN (min)</label><input type='number' min='1' value={form.min_time===0?'':form.min_time} onChange={e=>setForm(f=>({...f,min_time:parseInt(e.target.value)||0}))}/></div>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>TEMPO MÁX (min)</label><input type='number' min='1' value={form.max_time===0?'':form.max_time} onChange={e=>setForm(f=>({...f,max_time:parseInt(e.target.value)||0}))}/></div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={save} disabled={saving} className='btn-neon-fill' style={{flex:2,fontSize:14}}>
                <Check size={13} style={{display:'inline',marginRight:5}}/>{saving?'SALVANDO...':'SALVAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK EDIT MODAL */}
      {bulkModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:420,padding:22,border:'1px solid #f59e0b',boxShadow:'0 0 30px rgba(245,158,11,0.15)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <h2 className='font-bangers' style={{fontSize:20,color:'#f59e0b'}}>EDIÇÃO EM MASSA</h2>
              <button onClick={()=>setBulkModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={16}/></button>
            </div>
            <p style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>
              Alterando <strong style={{color:'#f59e0b'}}>{selected.size} bairros</strong> de uma vez. Deixe em branco o que não quiser alterar.
            </p>
            {/* Selected list preview */}
            <div style={{maxHeight:120,overflowY:'auto',background:'var(--surface)',borderRadius:8,padding:'8px 12px',marginBottom:14,border:'1px solid var(--border)'}}>
              {[...selected].map(id=>{
                const z=zones.find(z=>z.id===id)
                return z?<p key={id} style={{fontSize:11,color:'var(--muted)',padding:'1px 0'}}>{z.name} — {fmt(z.fee)}</p>:null
              })}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:0.5}}>NOVO VALOR DO FRETE (R$)</label>
                <input type='number' min='0' step='0.50' value={bulkFee} onChange={e=>setBulkFee(e.target.value)} placeholder='Deixe em branco para não alterar' style={{fontSize:16}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>TEMPO MÍN (min)</label>
                  <input type='number' min='1' value={bulkMinTime} onChange={e=>setBulkMinTime(e.target.value)} placeholder='—'/>
                </div>
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>TEMPO MÁX (min)</label>
                  <input type='number' min='1' value={bulkMaxTime} onChange={e=>setBulkMaxTime(e.target.value)} placeholder='—'/>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setBulkModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={applyBulk} disabled={bulkSaving} style={{flex:2,padding:11,borderRadius:8,border:'none',background:'#f59e0b',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15,opacity:bulkSaving?0.7:1}}>
                {bulkSaving?'SALVANDO...':'APLICAR EM '+selected.size+' BAIRROS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}