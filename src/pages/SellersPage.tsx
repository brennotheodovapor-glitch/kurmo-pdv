import{useState,useEffect}from 'react'
import{Users,Plus,Edit2,Trash2,X,Check,Percent,Mail,Phone,Key,Eye,EyeOff}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Seller={id:string;name:string;email:string;phone:string;cpf:string;commission_pct:number;active:boolean;auth_user_id:string|null;role:string}
const EMPTY={name:'',email:'',phone:'',cpf:'',commission_pct:0,active:true,password:'',role:'seller'}

function fmtCPF(v:string){v=v.replace(/\D/g,'');if(v.length<=3)return v;if(v.length<=6)return v.slice(0,3)+'.'+v.slice(3);if(v.length<=9)return v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6);return v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9,11)}

export default function SellersPage(){
  const[sellers,setSellers]=useState<Seller[]>([])
  const[loading,setLoading]=useState(true)
  const[modal,setModal]=useState(false)
  const[edit,setEdit]=useState<Seller|null>(null)
  const[form,setForm]=useState(EMPTY)
  const[showPwd,setShowPwd]=useState(false)
  const[saving,setSaving]=useState(false)

  useEffect(()=>{loadSellers()},[])

  async function loadSellers(){
    setLoading(true)
    const{data}=await supabase.from('sellers').select('*').order('name')
    setSellers(data||[]);setLoading(false)
  }

  const openC=()=>{setEdit(null);setForm(EMPTY);setModal(true)}
  const openE=(s:Seller)=>{setEdit(s);setForm({...s,password:''});setModal(true)}

  async function save(){
    if(!form.name.trim()||!form.email.trim()){toast.error('Nome e email obrigatorios');return}
    if(!edit&&!form.password.trim()){toast.error('Senha obrigatoria para novo vendedor');return}
    setSaving(true)
    try{
      let authUserId=edit?.auth_user_id||null

      if(!edit){
        // Create Supabase Auth user
        const{data:authData,error:authErr}=await supabase.auth.signUp({
          email:form.email,
          password:form.password,
          options:{data:{name:form.name,cpf:form.cpf,role:'seller'}}
        })
        if(authErr)throw new Error('Erro ao criar login: '+authErr.message)
        authUserId=authData.user?.id||null

        // Insert seller
        const{data:sellerData,error:sErr}=await supabase.from('sellers').insert({
          name:form.name,email:form.email,phone:form.phone,cpf:form.cpf,
          commission_pct:form.commission_pct,active:form.active,
          auth_user_id:authUserId,role:'seller'
        }).select().single()
        if(sErr)throw new Error(sErr.message)

        // Set role in user_roles
        if(authUserId){
          await supabase.from('user_roles').upsert({user_id:authUserId,role:'seller',seller_id:sellerData.id})
        }
        toast.success('Vendedor criado! Login: '+form.email+' | Senha: '+form.password)
      }else{
        const{error}=await supabase.from('sellers').update({
          name:form.name,email:form.email,phone:form.phone,cpf:form.cpf,
          commission_pct:form.commission_pct,active:form.active
        }).eq('id',edit.id)
        if(error)throw new Error(error.message)
        // Update password if provided
        if(form.password.trim()&&edit.auth_user_id){
          await supabase.auth.admin?.updateUserById?.(edit.auth_user_id,{password:form.password})
        }
        toast.success('Vendedor atualizado!')
      }
      setModal(false);loadSellers()
    }catch(e:any){toast.error(e.message)}
    finally{setSaving(false)}
  }

  async function del(s:Seller){
    if(!confirm('Remover vendedor '+s.name+'?'))return
    await supabase.from('sellers').delete().eq('id',s.id)
    toast.success('Removido');loadSellers()
  }

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <Users size={20} color="var(--neon)"/>
        <h1 className="font-bangers neon-text-sm" style={{fontSize:26}}>VENDEDORES</h1>
        <span style={{fontSize:12,color:'var(--muted)',background:'var(--card)',padding:'3px 10px',borderRadius:20}}>{sellers.length} vendedores</span>
        <button onClick={openC} className="btn-neon-fill" style={{marginLeft:'auto',fontSize:13,padding:'8px 14px'}}>
          <Plus size={14} style={{display:'inline',marginRight:5}}/>NOVO VENDEDOR
        </button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'14px 16px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        sellers.length===0?(
          <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}>
            <Users size={48} style={{marginBottom:16,opacity:0.3}}/>
            <p style={{fontSize:18,fontFamily:'Bangers,cursive',letterSpacing:1}}>NENHUM VENDEDOR CADASTRADO</p>
            <p style={{fontSize:13,marginTop:6}}>Clique em "Novo Vendedor" para comecar</p>
          </div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
            {sellers.map(s=>(
              <div key={s.id} className="card" style={{padding:18}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:46,height:46,borderRadius:'50%',background:'var(--neon-glow)',border:'2px solid var(--neon-dim)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bangers,cursive',fontSize:20,color:'var(--neon)',flexShrink:0}}>
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{fontWeight:700,color:'var(--white)',fontSize:14}}>{s.name}</p>
                      <div style={{display:'flex',gap:6,marginTop:3}}>
                        <span style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:s.active?'rgba(0,255,65,0.1)':'rgba(255,51,51,0.1)',color:s.active?'var(--neon)':'#ff3333'}}>{s.active?'ATIVO':'INATIVO'}</span>
                        <span style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:'rgba(6,182,212,0.1)',color:'#06b6d4'}}>{s.auth_user_id?'LOGIN OK':'SEM LOGIN'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:5}}>
                    <button onClick={()=>openE(s)} style={{width:30,height:30,borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={13}/></button>
                    <button onClick={()=>del(s)} style={{width:30,height:30,borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={13}/></button>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12,color:'var(--muted)'}}><Mail size={12}/>{s.email}</div>
                  {s.phone&&<div style={{display:'flex',alignItems:'center',gap:7,fontSize:12,color:'var(--muted)'}}><Phone size={12}/>{s.phone}</div>}
                  {s.cpf&&<div style={{display:'flex',alignItems:'center',gap:7,fontSize:12,color:'var(--muted)'}}><Key size={12}/>CPF: {s.cpf}</div>}
                  <div style={{marginTop:6,padding:'9px 12px',background:'var(--surface)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:5}}><Percent size={12}/>Comissao mensal</span>
                    <span style={{fontSize:20,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{s.commission_pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal&&(
        <div className="animate-fade-in" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className="animate-slide-in card" style={{width:'100%',maxWidth:480,padding:24,border:'1px solid var(--border-bright)',maxHeight:'90dvh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <h2 className="font-bangers neon-text-sm" style={{fontSize:22}}>{edit?'EDITAR':'NOVO'} VENDEDOR</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:11}}>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>NOME COMPLETO *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Mateus Silva"/></div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>EMAIL (usado para login) *</label><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="vendedor@email.com" disabled={!!edit}/></div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>CPF</label><input value={form.cpf} onChange={e=>setForm(f=>({...f,cpf:fmtCPF(e.target.value)}))} placeholder="000.000.000-00" maxLength={14}/></div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>TELEFONE</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(27) 99999-9999"/></div>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>{edit?'NOVA SENHA (deixe em branco para manter)':'SENHA DE ACESSO *'}</label>
                <div style={{position:'relative'}}>
                  <input type={showPwd?'text':'password'} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder={edit?'Nova senha (opcional)':'Minimo 6 caracteres'} style={{paddingRight:40}}/>
                  <button type="button" onClick={()=>setShowPwd(!showPwd)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}>{showPwd?<EyeOff size={15}/>:<Eye size={15}/>}</button>
                </div>
                {!edit&&<p style={{fontSize:11,color:'var(--muted)',marginTop:3}}>O vendedor usa email + senha para entrar no PDV</p>}
              </div>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>COMISSAO (%)</label>
                <div style={{position:'relative'}}>
                  <input type="number" min="0" max="100" step="0.5" value={form.commission_pct} onChange={e=>setForm(f=>({...f,commission_pct:parseFloat(e.target.value)||0}))} style={{paddingRight:36}}/>
                  <Percent size={13} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'var(--neon)'}}/>
                </div>
                <p style={{fontSize:11,color:'var(--muted)',marginTop:3}}>% sobre o total de vendas do mes</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--surface)',borderRadius:8}}>
                <input type="checkbox" id="active_s" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} style={{width:16,height:16,accentColor:'var(--neon)'}}/>
                <label htmlFor="active_s" style={{fontSize:13,color:'var(--text)',cursor:'pointer'}}>Vendedor ativo</label>
              </div>
              {!edit&&(
                <div style={{padding:'10px 12px',background:'rgba(0,255,65,0.05)',border:'1px solid rgba(0,255,65,0.15)',borderRadius:8}}>
                  <p style={{fontSize:11,color:'var(--neon)',fontWeight:600,marginBottom:4}}>ACESSO DO VENDEDOR</p>
                  <p style={{fontSize:11,color:'var(--muted)'}}>O vendedor tera acesso apenas a: PDV, Delivery e Historico de vendas dele.</p>
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:10,marginTop:18}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={save} disabled={saving} className="btn-neon-fill" style={{flex:2,fontSize:14,opacity:saving?0.6:1}}>
                {saving?'Salvando...':<><Check size={14} style={{display:'inline',marginRight:5}}/>{edit?'SALVAR':'CRIAR VENDEDOR + LOGIN'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}