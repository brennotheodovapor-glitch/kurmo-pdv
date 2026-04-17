import{useState,useEffect}from 'react'
import{UserCheck,Plus,Edit2,Trash2,X,Check,Eye,EyeOff,ShieldCheck,User}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Seller={id:string;name:string;email?:string;commission_pct:number;active:boolean;role?:string}
const EMPTY={name:'',email:'',password:'',commission_pct:10,active:true,role:'seller'}

export default function SellersPage(){
  const[sellers,setSellers]=useState<Seller[]>([])
  const[loading,setLoading]=useState(true)
  const[modal,setModal]=useState(false)
  const[edit,setEdit]=useState<Seller|null>(null)
  const[form,setForm]=useState(EMPTY)
  const[saving,setSaving]=useState(false)
  const[showPwd,setShowPwd]=useState(false)

  useEffect(()=>{load()},[])

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('sellers').select('*').order('name')
    setSellers(data||[])
    setLoading(false)
  }

  function openNew(){setEdit(null);setForm(EMPTY);setShowPwd(false);setModal(true)}
  function openEdit(s:Seller){
    setEdit(s)
    setForm({name:s.name,email:s.email||'',password:'',commission_pct:s.commission_pct,active:s.active,role:s.role||'seller'})
    setShowPwd(false);setModal(true)
  }

  async function save(){
    if(!form.name.trim()){toast.error('Nome obrigatório');return}
    if(!edit&&!form.email.trim()){toast.error('Email obrigatório para novo vendedor');return}
    if(!edit&&!form.password.trim()){toast.error('Senha obrigatória para novo vendedor');return}
    if(!edit&&form.password.length<6){toast.error('Senha mínimo 6 caracteres');return}
    setSaving(true)
    try{
      if(edit){
        // Update seller record
        const upd:any={name:form.name,commission_pct:Number(form.commission_pct),active:form.active,role:form.role}
        if(form.email)upd.email=form.email
        const{error}=await supabase.from('sellers').update(upd).eq('id',edit.id)
        if(error)throw error
        toast.success('Vendedor atualizado!')
      }else{
        // Create auth user first via admin API (needs service role) 
        // Workaround: create seller record and link via email
        // First check if email already exists
        const{data:existing}=await supabase.from('sellers').select('id').eq('email',form.email).maybeSingle()
        if(existing){toast.error('Email já cadastrado');setSaving(false);return}
        
        // Create auth user via supabase signUp (they can confirm later)
        const{data:authData,error:authErr}=await supabase.auth.signUp({
          email:form.email,
          password:form.password,
          options:{data:{name:form.name,role:form.role}}
        })
        if(authErr)throw authErr
        
        // Create seller record
        const{error:sellerErr}=await supabase.from('sellers').insert({
          name:form.name,
          email:form.email,
          commission_pct:Number(form.commission_pct),
          active:form.active,
          role:form.role
        })
        if(sellerErr)throw sellerErr
        
        // If profile was created, update it
        if(authData.user){
          await supabase.from('profiles').upsert({
            id:authData.user.id,
            email:form.email,
            role:form.role,
            name:form.name
          })
        }
        toast.success('Vendedor criado! Login: '+form.email)
      }
      setModal(false);load()
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setSaving(false)}
  }

  async function del(s:Seller){
    if(!confirm('Remover '+s.name+'?'))return
    await supabase.from('sellers').delete().eq('id',s.id)
    toast.success('Removido');load()
  }

  const ROLE_LABELS:Record<string,string>={admin:'Administrador',seller:'Vendedor'}
  const ROLE_COLORS:Record<string,string>={admin:'#f59e0b',seller:'#06b6d4'}

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <UserCheck size={18} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:24}}>VENDEDORES</h1>
        <span style={{fontSize:12,color:'var(--muted)'}}>({sellers.length})</span>
        <button onClick={openNew} className='btn-neon-fill' style={{marginLeft:'auto',fontSize:12,padding:'7px 14px',display:'flex',alignItems:'center',gap:5}}><Plus size={13}/>NOVO VENDEDOR</button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'12px 14px'}}>
        {/* Info box */}
        <div style={{padding:'10px 14px',background:'rgba(6,182,212,0.06)',border:'1px solid rgba(6,182,212,0.2)',borderRadius:10,marginBottom:14,fontSize:12,color:'var(--muted)',display:'flex',gap:8,alignItems:'flex-start'}}>
          <ShieldCheck size={14} color='#06b6d4' style={{flexShrink:0,marginTop:1}}/>
          <div>
            <p style={{color:'#06b6d4',fontWeight:600,marginBottom:2}}>Controle de acesso por perfil</p>
            <p><strong style={{color:'var(--white)'}}>Vendedor</strong> — acessa apenas PDV, Delivery e Histórico de Vendas</p>
            <p><strong style={{color:'#f59e0b)'}}>Administrador</strong> — acessa tudo, incluindo relatórios, produtos, configurações</p>
          </div>
        </div>

        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:(
          <div className='card' style={{overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid var(--border)',background:'var(--surface)'}}>
                {['VENDEDOR','EMAIL','PERFIL','COMISSÃO','STATUS',''].map(h=>(
                  <th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {sellers.map(s=>(
                  <tr key={s.id} style={{borderBottom:'1px solid rgba(26,46,26,0.5)',opacity:s.active?1:0.5}}>
                    <td style={{padding:'9px 12px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:32,height:32,borderRadius:8,background:s.role==='admin'?'rgba(245,158,11,0.15)':'rgba(6,182,212,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          {s.role==='admin'?<ShieldCheck size={14} color='#f59e0b'/>:<User size={14} color='#06b6d4'/>}
                        </div>
                        <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{s.name}</p>
                      </div>
                    </td>
                    <td style={{padding:'9px 12px',fontSize:12,color:'var(--muted)'}}>{s.email||'—'}</td>
                    <td style={{padding:'9px 12px'}}>
                      <span style={{fontSize:11,fontWeight:700,padding:'2px 9px',borderRadius:20,background:(ROLE_COLORS[s.role||'seller'])+'22',color:ROLE_COLORS[s.role||'seller']||'#06b6d4'}}>
                        {ROLE_LABELS[s.role||'seller']||s.role}
                      </span>
                    </td>
                    <td style={{padding:'9px 12px',fontSize:12,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{s.commission_pct}%</td>
                    <td style={{padding:'9px 12px'}}>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:s.active?'rgba(16,185,129,0.1)':'rgba(255,51,51,0.1)',color:s.active?'#10b981':'#ff3333'}}>{s.active?'Ativo':'Inativo'}</span>
                    </td>
                    <td style={{padding:'9px 12px'}}>
                      <div style={{display:'flex',gap:5}}>
                        <button onClick={()=>openEdit(s)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={12}/></button>
                        <button onClick={()=>del(s)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sellers.length===0&&<div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>Nenhum vendedor cadastrado</div>}
          </div>
        )}
      </div>

      {modal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:420,padding:22,border:'1px solid var(--border-bright)',borderRadius:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h2 className='font-bangers neon-text-sm' style={{fontSize:22}}>{edit?'EDITAR':'NOVO'} VENDEDOR</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={18}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:11}}>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>NOME *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder='Nome completo'/></div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>EMAIL {!edit&&'*'}</label><input type='email' value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder='email@exemplo.com' disabled={!!edit}/></div>
              {!edit&&(
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>SENHA * (mín. 6 caracteres)</label>
                  <div style={{position:'relative'}}>
                    <input type={showPwd?'text':'password'} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder='Senha de acesso' style={{paddingRight:38}}/>
                    <button onClick={()=>setShowPwd(v=>!v)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}>{showPwd?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                  </div>
                </div>
              )}
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>PERFIL DE ACESSO *</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button onClick={()=>setForm(f=>({...f,role:'seller'}))} style={{padding:'10px',borderRadius:9,border:form.role==='seller'?'2px solid #06b6d4':'1px solid var(--border)',background:form.role==='seller'?'rgba(6,182,212,0.1)':'var(--surface)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                    <User size={18} color={form.role==='seller'?'#06b6d4':'var(--muted)'}/>
                    <span style={{fontSize:12,fontWeight:700,color:form.role==='seller'?'#06b6d4':'var(--muted)',fontFamily:'Bangers,cursive'}}>VENDEDOR</span>
                    <span style={{fontSize:9,color:'var(--muted)',textAlign:'center'}}>PDV · Delivery · Histórico</span>
                  </button>
                  <button onClick={()=>setForm(f=>({...f,role:'admin'}))} style={{padding:'10px',borderRadius:9,border:form.role==='admin'?'2px solid #f59e0b':'1px solid var(--border)',background:form.role==='admin'?'rgba(245,158,11,0.1)':'var(--surface)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                    <ShieldCheck size={18} color={form.role==='admin'?'#f59e0b':'var(--muted)'}/>
                    <span style={{fontSize:12,fontWeight:700,color:form.role==='admin'?'#f59e0b':'var(--muted)',fontFamily:'Bangers,cursive'}}>ADMIN</span>
                    <span style={{fontSize:9,color:'var(--muted)',textAlign:'center'}}>Acesso completo</span>
                  </button>
                </div>
              </div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>COMISSÃO (%)</label><input type='number' min='0' max='100' step='0.5' value={form.commission_pct} onChange={e=>setForm(f=>({...f,commission_pct:parseFloat(e.target.value)||0}))}/></div>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:'var(--muted)'}}>
                <input type='checkbox' checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} style={{width:14,height:14}}/>
                Vendedor ativo
              </label>
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
    </div>
  )
}