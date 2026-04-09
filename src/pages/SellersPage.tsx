import{useState,useEffect}from 'react'
import{Users,Plus,Edit2,Trash2,X,Check,Percent,Mail,Phone,Key,UserPlus,CreditCard}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'
type Seller={id:string;name:string;email:string;phone:string;cpf:string;commission_pct:number;active:boolean;auth_user_id?:string}
const EMPTY={name:'',email:'',phone:'',cpf:'',commission_pct:0,active:true}
const fmtCPF=(v:string)=>v?v.replace(/D/g,'').replace(/(d{3})(d{3})(d{3})(d{2})/,'$1.$2.$3-$4'):''
export default function SellersPage(){
  const[sellers,setSellers]=useState<Seller[]>([])
  const[loading,setLoading]=useState(true)
  const[modal,setModal]=useState(false)
  const[loginModal,setLoginModal]=useState<Seller|null>(null)
  const[edit,setEdit]=useState<Seller|null>(null)
  const[form,setForm]=useState(EMPTY)
  const[newPass,setNewPass]=useState('')
  const[creating,setCreating]=useState(false)
  useEffect(()=>{loadSellers()},[])
  async function loadSellers(){
    setLoading(true)
    const{data}=await supabase.from('sellers').select('*').order('name')
    setSellers(data||[]);setLoading(false)
  }
  const openC=()=>{setEdit(null);setForm(EMPTY);setModal(true)}
  const openE=(s:Seller)=>{setEdit(s);setForm({...s});setModal(true)}
  async function save(){
    if(!form.name.trim()||!form.email.trim()){toast.error('Nome e email obrigatorios');return}
    if(edit){const{error}=await supabase.from('sellers').update(form).eq('id',edit.id);if(error){toast.error('Erro: '+error.message);return};toast.success('Atualizado!')}
    else{const{error}=await supabase.from('sellers').insert(form);if(error){toast.error('Erro: '+error.message);return};toast.success('Cadastrado!')}
    setModal(false);loadSellers()
  }
  async function del(id:string){if(!confirm('Remover?'))return;await supabase.from('sellers').delete().eq('id',id);toast.success('Removido');loadSellers()}
  async function createLogin(seller:Seller){
    if(!newPass||newPass.length<6){toast.error('Senha precisa ter 6+ caracteres');return}
    setCreating(true)
    try{
      const{data:d2,error:e2}=await supabase.auth.signUp({email:seller.email,password:newPass,options:{data:{name:seller.name,role:'seller',seller_id:seller.id}}})
      if(e2&&!e2.message.includes('already')){toast.error('Erro: '+e2.message);setCreating(false);return}
      const uid=d2?.user?.id
      if(uid){
        await supabase.from('profiles').upsert({id:uid,role:'seller',seller_id:seller.id,name:seller.name},{onConflict:'id'})
        await supabase.from('sellers').update({auth_user_id:uid}).eq('id',seller.id)
      }
      toast.success('Login criado!\nEmail: '+seller.email+'\nSenha: '+newPass,{duration:6000})
      setLoginModal(null);setNewPass('');loadSellers()
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setCreating(false)}
  }
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <Users size={20} color="var(--neon)"/>
        <h1 className="font-bangers neon-text-sm" style={{fontSize:26}}>VENDEDORES</h1>
        <span style={{fontSize:12,color:'var(--muted)',background:'var(--card)',padding:'4px 10px',borderRadius:20}}>{sellers.length} vendedores</span>
        <button onClick={openC} className="btn-neon-fill" style={{marginLeft:'auto',fontSize:13,padding:'8px 16px'}}><Plus size={14} style={{display:'inline',marginRight:6}}/>NOVO VENDEDOR</button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:sellers.length===0?(
          <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}><Users size={48} style={{marginBottom:16,opacity:0.3}}/><p style={{fontFamily:'Bangers,cursive',fontSize:18}}>NENHUM VENDEDOR</p></div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:16}}>
            {sellers.map(s=>(
              <div key={s.id} className="card card-hover" style={{padding:18}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:44,height:44,borderRadius:'50%',background:'var(--neon-glow)',border:'2px solid var(--neon-dim)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bangers,cursive',fontSize:20,color:'var(--neon)',flexShrink:0}}>{s.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <p style={{fontWeight:700,color:'var(--white)',fontSize:14}}>{s.name}</p>
                      <div style={{display:'flex',gap:5,marginTop:3,flexWrap:'wrap'}}>
                        <span style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:s.active?'rgba(0,255,65,0.1)':'rgba(255,51,51,0.1)',color:s.active?'var(--neon)':'#ff3333'}}>{s.active?'ATIVO':'INATIVO'}</span>
                        <span style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:s.auth_user_id?'rgba(6,182,212,0.1)':'rgba(100,116,139,0.1)',color:s.auth_user_id?'#06b6d4':'var(--muted)'}}>{s.auth_user_id?'â LOGIN':'SEM LOGIN'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>openE(s)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={12}/></button>
                    <button onClick={()=>del(s.id)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={12}/></button>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--muted)'}}><Mail size={11}/>{s.email}</div>
                  {s.phone&&<div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--muted)'}}><Phone size={11}/>{s.phone}</div>}
                  {s.cpf&&<div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--muted)'}}><CreditCard size={11}/>CPF: {fmtCPF(s.cpf)}</div>}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4,padding:'8px 12px',background:'var(--surface)',borderRadius:8}}>
                    <span style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:5}}><Percent size={11}/>Comissao</span>
                    <span style={{fontSize:18,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{s.commission_pct}%</span>
                  </div>
                  <button onClick={()=>{setLoginModal(s);setNewPass('')}} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'7px',borderRadius:8,border:'1px solid '+(s.auth_user_id?'var(--border)':'#06b6d4'),background:s.auth_user_id?'transparent':'rgba(6,182,212,0.1)',color:s.auth_user_id?'var(--muted)':'#06b6d4',cursor:'pointer',fontSize:12,marginTop:2}}>
                    {s.auth_user_id?<><Key size={12}/>Redefinir Senha</>:<><UserPlus size={12}/>Criar Login PDV</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {modal&&(
        <div className="animate-fade-in" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className="animate-slide-in card" style={{width:'100%',maxWidth:460,padding:24,border:'1px solid var(--border-bright)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h2 className="font-bangers neon-text-sm" style={{fontSize:22}}>{edit?'EDITAR':'NOVO'} VENDEDOR</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:11}}>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>NOME COMPLETO</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Mateus Santos"/></div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>EMAIL (para login)</label><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="mateus@email.com"/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>CPF</label><input value={form.cpf} onChange={e=>setForm(f=>({...f,cpf:e.target.value.replace(/D/g,'').substring(0,11)}))} placeholder="000.000.000-00"/></div>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>TELEFONE</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(27) 99999-9999"/></div>
              </div>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>COMISSAO (%)</label>
                <div style={{position:'relative'}}>
                  <input type="number" min="0" max="100" step="0.5" value={form.commission_pct===0?'':form.commission_pct} onChange={e=>setForm(f=>({...f,commission_pct:e.target.value===''?0:parseFloat(e.target.value)||0}))} placeholder="0" style={{paddingRight:36}}/>
                  <Percent size={13} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--neon)'}}/>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:'var(--surface)',borderRadius:8}}>
                <input type="checkbox" id="active_s" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} style={{width:16,height:16,accentColor:'var(--neon)'}}/>
                <label htmlFor="active_s" style={{fontSize:13,color:'var(--text)',cursor:'pointer'}}>Vendedor ativo</label>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={save} className="btn-neon-fill" style={{flex:2,fontSize:14}}><Check size={13} style={{display:'inline',marginRight:5}}/>SALVAR</button>
            </div>
          </div>
        </div>
      )}
      {loginModal&&(
        <div className="animate-fade-in" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:400,padding:24,border:'1px solid #06b6d4',boxShadow:'0 0 30px rgba(6,182,212,0.15)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              <Key size={18} color="#06b6d4"/>
              <h2 className="font-bangers" style={{fontSize:20,color:'#06b6d4'}}>{loginModal.auth_user_id?'REDEFINIR SENHA':'CRIAR LOGIN PDV'}</h2>
            </div>
            <div style={{padding:'12px 14px',background:'var(--surface)',borderRadius:8,marginBottom:14}}>
              <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{loginModal.name}</p>
              <p style={{fontSize:12,color:'var(--muted)',marginTop:2}}>Login: <span style={{color:'var(--neon)'}}>{loginModal.email}</span></p>
              {loginModal.cpf&&<p style={{fontSize:12,color:'var(--muted)',marginTop:2}}>CPF: {fmtCPF(loginModal.cpf)}</p>}
              <p style={{fontSize:11,color:'var(--muted)',marginTop:6,padding:'5px 8px',background:'rgba(6,182,212,0.08)',borderRadius:6}}>Acesso: PDV, Delivery e Historico apenas</p>
            </div>
            <div>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>DEFINIR SENHA</label>
              <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Minimo 6 caracteres" autoFocus/>
            </div>
            <div style={{display:'flex',gap:10,marginTop:14}}>
              <button onClick={()=>{setLoginModal(null);setNewPass('')}} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:13}}>CANCELAR</button>
              <button onClick={()=>createLogin(loginModal)} disabled={creating} style={{flex:2,padding:10,borderRadius:8,border:'none',background:'#06b6d4',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14,fontWeight:700,opacity:creating?0.7:1}}>
                {creating?'CRIANDO...':'CRIAR LOGIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}