import{useState,useEffect,useMemo}from 'react'
import{supabase}from '@/lib/supabase'
import{Search,Edit2,Trash2,X,Check,Phone,MapPin,User,ShoppingBag,Star,ChevronDown,ChevronUp,Plus}from 'lucide-react'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)

type Customer={
  id:string;name:string;phone:string;address:string;neighborhood:string;
  notes:string;active:boolean;total_orders:number;total_spent:number;
  loyalty_stamps:number;loyalty_goal:number;created_at:string
}

const BLANK={name:'',phone:'',address:'',neighborhood:'',notes:''}

export default function CustomersPage(){
  const[customers,setCustomers]=useState<Customer[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[expanded,setExpanded]=useState<string|null>(null)
  const[editModal,setEditModal]=useState<Customer|null>(null)
  const[editForm,setEditForm]=useState(BLANK)
  const[deleteModal,setDeleteModal]=useState<Customer|null>(null)
  const[addModal,setAddModal]=useState(false)
  const[addForm,setAddForm]=useState(BLANK)
  const[saving,setSaving]=useState(false)

  useEffect(()=>{load()},[])

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('customers')
      .select('id,name,phone,address,neighborhood,notes,active,total_orders,total_spent,loyalty_stamps,loyalty_goal,created_at')
      .order('name')
    setCustomers(data||[])
    setLoading(false)
  }

  async function saveEdit(){
    if(!editModal)return
    if(!editForm.name.trim()||!editForm.phone.trim()){alert('Nome e telefone obrigatórios');return}
    setSaving(true)
    await supabase.from('customers').update({
      name:editForm.name.trim(),
      phone:editForm.phone.replace(/\D/g,''),
      address:editForm.address,
      neighborhood:editForm.neighborhood,
      notes:editForm.notes
    }).eq('id',editModal.id)
    setCustomers(prev=>prev.map(c=>c.id===editModal.id?{...c,...editForm}:c))
    setEditModal(null)
    setSaving(false)
  }

  async function deleteCustomer(){
    if(!deleteModal)return
    setSaving(true)
    await supabase.from('customers').delete().eq('id',deleteModal.id)
    setCustomers(prev=>prev.filter(c=>c.id!==deleteModal.id))
    setDeleteModal(null)
    setSaving(false)
  }

  async function addCustomer(){
    if(!addForm.name.trim()||!addForm.phone.trim()){alert('Nome e telefone obrigatórios');return}
    setSaving(true)
    const{data}=await supabase.from('customers').insert({
      name:addForm.name.trim(),
      phone:addForm.phone.replace(/\D/g,''),
      address:addForm.address,
      neighborhood:addForm.neighborhood,
      notes:addForm.notes,
      active:true,total_orders:0,total_spent:0,loyalty_stamps:0,loyalty_goal:10
    }).select().single()
    if(data)setCustomers(prev=>[...prev,data].sort((a,b)=>a.name.localeCompare(b.name)))
    setAddModal(false)
    setAddForm(BLANK)
    setSaving(false)
  }

  async function toggleActive(c:Customer){
    await supabase.from('customers').update({active:!c.active}).eq('id',c.id)
    setCustomers(prev=>prev.map(x=>x.id===c.id?{...x,active:!c.active}:x))
  }

  const filtered=useMemo(()=>customers.filter(c=>{
    if(!search)return true
    const s=search.toLowerCase()
    return c.name?.toLowerCase().includes(s)||c.phone?.includes(s)||c.neighborhood?.toLowerCase().includes(s)
  }),[customers,search])

  const inp:React.CSSProperties={width:'100%',background:'#1c1c1c',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'11px 14px',fontSize:14,outline:'none',boxSizing:'border-box'}
  const lbl:React.CSSProperties={fontSize:11,color:'#888',fontWeight:600,letterSpacing:0.5,marginBottom:4,display:'block'}

  function EditForm({form,setForm}:{form:typeof BLANK,setForm:any}){
    return(
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div>
          <span style={lbl}>Nome completo *</span>
          <input value={form.name} onChange={e=>setForm((p:any)=>({...p,name:e.target.value}))} placeholder='Nome' style={inp}/>
        </div>
        <div>
          <span style={lbl}>WhatsApp *</span>
          <input value={form.phone} onChange={e=>setForm((p:any)=>({...p,phone:e.target.value}))} placeholder='(27) 99999-9999' inputMode='numeric' style={inp}/>
        </div>
        <div>
          <span style={lbl}>Endereço</span>
          <input value={form.address} onChange={e=>setForm((p:any)=>({...p,address:e.target.value}))} placeholder='Rua, número' style={inp}/>
        </div>
        <div>
          <span style={lbl}>Bairro</span>
          <input value={form.neighborhood} onChange={e=>setForm((p:any)=>({...p,neighborhood:e.target.value}))} placeholder='Bairro' style={inp}/>
        </div>
        <div>
          <span style={lbl}>Observações</span>
          <input value={form.notes} onChange={e=>setForm((p:any)=>({...p,notes:e.target.value}))} placeholder='Ex: alérgico a...' style={inp}/>
        </div>
      </div>
    )
  }

  return(
    <div style={{padding:'16px 12px',maxWidth:680,margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <User size={20} color='#00ff41'/>
        <h1 style={{fontFamily:'Bangers,cursive',fontSize:22,color:'#00ff41',letterSpacing:2,margin:0,flex:1}}>CLIENTES</h1>
        <span style={{fontSize:12,color:'#555'}}>{filtered.length} clientes</span>
        <button onClick={()=>{setAddModal(true);setAddForm(BLANK)}} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:'#00ff41',border:'none',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14,letterSpacing:1,color:'#000'}}>
          <Plus size={14}/> NOVO
        </button>
      </div>

      {/* Search */}
      <div style={{position:'relative',marginBottom:14}}>
        <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#555'}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar por nome, telefone ou bairro...'
          style={{...inp,paddingLeft:36}}/>
      </div>

      {/* List */}
      {loading?<p style={{textAlign:'center',padding:40,color:'#555'}}>Carregando...</p>:
      filtered.length===0?<p style={{textAlign:'center',padding:40,color:'#555'}}>Nenhum cliente encontrado</p>:
      filtered.map(cust=>{
        const stamps=cust.loyalty_stamps||0
        const goal=cust.loyalty_goal||10
        const pct=Math.min(100,Math.round((stamps/goal)*100))
        const isOpen=expanded===cust.id
        return(
          <div key={cust.id} style={{background:'#161616',borderRadius:12,marginBottom:8,border:'1px solid '+(cust.active?'#1e1e1e':'#2a1a1a'),opacity:cust.active?1:0.65}}>
            {/* Card header */}
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',cursor:'pointer'}} onClick={()=>setExpanded(isOpen?null:cust.id)}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'rgba(0,255,65,0.1)',border:'1px solid rgba(0,255,65,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontFamily:'Bangers,cursive',fontSize:15,color:'#00ff41'}}>{(cust.name||'?')[0].toUpperCase()}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:14,fontWeight:600,color:'#fff',margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cust.name}</p>
                <p style={{fontSize:12,color:'#888',margin:'1px 0 0'}}>{cust.phone}</p>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{fontSize:12,color:'#00ff41',fontWeight:700,margin:0,fontFamily:'JetBrains Mono,monospace'}}>{fmt(cust.total_spent||0)}</p>
                <p style={{fontSize:10,color:'#555',margin:0}}>{cust.total_orders||0} pedidos</p>
              </div>
              {isOpen?<ChevronUp size={14} color='#555'/>:<ChevronDown size={14} color='#555'/>}
            </div>

            {/* Expanded */}
            {isOpen&&(
              <div style={{padding:'0 14px 14px',borderTop:'1px solid #1e1e1e'}}>
                {/* Fidelidade */}
                <div style={{marginTop:10,marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:11,color:'#888',display:'flex',alignItems:'center',gap:4}}><Star size={10} color='#f59e0b'/> Fidelidade</span>
                    <span style={{fontSize:11,color:'#f59e0b'}}>{stamps}/{goal}</span>
                  </div>
                  <div style={{height:6,borderRadius:3,background:'#2a2a2a',overflow:'hidden'}}>
                    <div style={{height:'100%',width:pct+'%',background:'linear-gradient(90deg,#f59e0b,#f97316)',borderRadius:3,transition:'width 0.3s'}}/>
                  </div>
                </div>

                {/* Info */}
                {cust.neighborhood&&<p style={{fontSize:12,color:'#888',margin:'0 0 2px',display:'flex',alignItems:'center',gap:5}}><MapPin size={10}/>{cust.neighborhood}</p>}
                {cust.address&&<p style={{fontSize:12,color:'#666',margin:'0 0 2px'}}>{cust.address}</p>}
                {cust.notes&&<p style={{fontSize:12,color:'#666',fontStyle:'italic',margin:'4px 0 0'}}>"{cust.notes}"</p>}

                {/* Actions */}
                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <button onClick={()=>toggleActive(cust)} style={{flex:1,padding:'8px',borderRadius:8,border:'1px solid #2a2a2a',background:'transparent',color:cust.active?'#888':'#00ff41',cursor:'pointer',fontSize:12}}>
                    {cust.active?'Desativar':'Ativar'}
                  </button>
                  <button onClick={()=>{setEditModal(cust);setEditForm({name:cust.name||'',phone:cust.phone||'',address:cust.address||'',neighborhood:cust.neighborhood||'',notes:cust.notes||''})}}
                    style={{flex:2,padding:'8px',borderRadius:8,border:'1px solid #3b82f6',background:'rgba(59,130,246,0.1)',color:'#3b82f6',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontWeight:600}}>
                    <Edit2 size={13}/> Editar
                  </button>
                  <button onClick={()=>setDeleteModal(cust)}
                    style={{flex:1,padding:'8px',borderRadius:8,border:'1px solid rgba(255,51,51,0.3)',background:'rgba(255,51,51,0.08)',color:'#ff5555',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* MODAL EDITAR */}
      {editModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div style={{background:'#161616',borderRadius:16,padding:24,width:'100%',maxWidth:420,border:'1px solid #2a2a2a',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
              <Edit2 size={16} color='#3b82f6'/>
              <h2 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#3b82f6',letterSpacing:1,margin:0,flex:1}}>EDITAR CLIENTE</h2>
              <button onClick={()=>setEditModal(null)} style={{background:'#222',border:'none',borderRadius:8,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#888'}}><X size={14}/></button>
            </div>
            <EditForm form={editForm} setForm={setEditForm}/>
            <div style={{display:'flex',gap:8,marginTop:20}}>
              <button onClick={()=>setEditModal(null)} style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid #2a2a2a',background:'transparent',color:'#888',cursor:'pointer'}}>Cancelar</button>
              <button onClick={saveEdit} disabled={saving} style={{flex:2,padding:'12px',borderRadius:10,border:'none',background:saving?'#2a2a2a':'#3b82f6',color:saving?'#555':'#fff',cursor:saving?'not-allowed':'pointer',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1}}>
                {saving?'SALVANDO...':'SALVAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR */}
      {deleteModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div style={{background:'#161616',borderRadius:16,padding:24,width:'100%',maxWidth:360,border:'1px solid rgba(255,51,51,0.2)'}}>
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(255,51,51,0.1)',border:'2px solid rgba(255,51,51,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                <Trash2 size={22} color='#ff5555'/>
              </div>
              <h2 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#ff5555',letterSpacing:1,marginBottom:8}}>EXCLUIR CLIENTE</h2>
              <p style={{fontSize:14,color:'#ccc',margin:0}}>{deleteModal.name}</p>
              <p style={{fontSize:12,color:'#666',marginTop:6}}>Esta ação não pode ser desfeita. O histórico de pedidos será mantido.</p>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setDeleteModal(null)} style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid #2a2a2a',background:'transparent',color:'#888',cursor:'pointer'}}>Cancelar</button>
              <button onClick={deleteCustomer} disabled={saving} style={{flex:1,padding:'12px',borderRadius:10,border:'none',background:saving?'#2a2a2a':'#ff5555',color:saving?'#555':'#fff',cursor:saving?'not-allowed':'pointer',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1}}>
                {saving?'...':'EXCLUIR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR */}
      {addModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div style={{background:'#161616',borderRadius:16,padding:24,width:'100%',maxWidth:420,border:'1px solid #2a2a2a',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
              <Plus size={16} color='#00ff41'/>
              <h2 style={{fontFamily:'Bangers,cursive',fontSize:20,color:'#00ff41',letterSpacing:1,margin:0,flex:1}}>NOVO CLIENTE</h2>
              <button onClick={()=>setAddModal(false)} style={{background:'#222',border:'none',borderRadius:8,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#888'}}><X size={14}/></button>
            </div>
            <EditForm form={addForm} setForm={setAddForm}/>
            <div style={{display:'flex',gap:8,marginTop:20}}>
              <button onClick={()=>setAddModal(false)} style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid #2a2a2a',background:'transparent',color:'#888',cursor:'pointer'}}>Cancelar</button>
              <button onClick={addCustomer} disabled={saving} style={{flex:2,padding:'12px',borderRadius:10,border:'none',background:saving?'#2a2a2a':'#00ff41',color:saving?'#555':'#000',cursor:saving?'not-allowed':'pointer',fontFamily:'Bangers,cursive',fontSize:16,letterSpacing:1}}>
                {saving?'SALVANDO...':'ADICIONAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}