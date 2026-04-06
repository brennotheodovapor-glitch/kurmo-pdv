import { useState } from 'react'
import { Users, Plus, Edit2, Trash2, X, Check, Percent, Mail, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Seller = {id:string;name:string;email:string;phone:string;commission_pct:number;active:boolean}
const EMPTY = {name:'',email:'',phone:'',commission_pct:0,active:true}

export default function SellersPage() {
  const [sellers,setSellers] = useState<Seller[]>([])
  const [loading,setLoading] = useState(true)
  const [modal,setModal] = useState(false)
  const [edit,setEdit] = useState<Seller|null>(null)
  const [form,setForm] = useState(EMPTY)
  const fmt = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

  useState(()=>{ loadSellers() })

  async function loadSellers() {
    setLoading(true)
    const {data} = await supabase.from('sellers').select('*').order('name')
    setSellers(data||[]); setLoading(false)
  }

  const openC = () => {setEdit(null);setForm(EMPTY);setModal(true)}
  const openE = (s:Seller) => {setEdit(s);setForm({...s});setModal(true)}

  async function save() {
    if(!form.name.trim()||!form.email.trim()){toast.error('Nome e email obrigatorios');return}
    if(edit){
      const {error} = await supabase.from('sellers').update(form).eq('id',edit.id)
      if(error){toast.error('Erro: '+error.message);return}
      toast.success('Vendedor atualizado!')
    } else {
      const {error} = await supabase.from('sellers').insert(form)
      if(error){toast.error('Erro: '+error.message);return}
      toast.success('Vendedor cadastrado!')
    }
    setModal(false); loadSellers()
  }

  async function del(id:string) {
    if(!confirm('Remover vendedor?')) return
    await supabase.from('sellers').delete().eq('id',id)
    toast.success('Removido'); loadSellers()
  }

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12}}>
        <Users size={20} color="var(--neon)"/>
        <h1 className="font-bangers neon-text-sm" style={{fontSize:26}}>VENDEDORES</h1>
        <span style={{marginLeft:8,fontSize:12,color:'var(--muted)',background:'var(--card)',padding:'4px 10px',borderRadius:20}}>{sellers.length} vendedores</span>
        <button onClick={openC} className="btn-neon-fill" style={{marginLeft:'auto',fontSize:13,padding:'8px 16px'}}>
          <Plus size={14} style={{display:'inline',marginRight:6}}/>NOVO VENDEDOR
        </button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {loading ? <div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div> :
        sellers.length===0 ? (
          <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}>
            <Users size={48} style={{marginBottom:16,opacity:0.3}}/>
            <p style={{fontSize:18,fontFamily:'Bangers,cursive',letterSpacing:1}}>NENHUM VENDEDOR CADASTRADO</p>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
            {sellers.map(s=>(
              <div key={s.id} className="card card-hover" style={{padding:20}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:48,height:48,borderRadius:'50%',background:'var(--neon-glow)',border:'2px solid var(--neon-dim)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bangers,cursive',fontSize:22,color:'var(--neon)'}}>
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{fontWeight:700,color:'var(--white)',fontSize:15}}>{s.name}</p>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:s.active?'rgba(0,255,65,0.1)':'rgba(255,51,51,0.1)',color:s.active?'var(--neon)':'#ff3333'}}>{s.active?'ATIVO':'INATIVO'}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>openE(s)} style={{width:32,height:32,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={14}/></button>
                    <button onClick={()=>del(s.id)} style={{width:32,height:32,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={14}/></button>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--muted)'}}><Mail size={13}/>{s.email}</div>
                  {s.phone && <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--muted)'}}><Phone size={13}/>{s.phone}</div>}
                  <div style={{marginTop:8,padding:'10px 14px',background:'var(--surface)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:12,color:'var(--muted)',display:'flex',alignItems:'center',gap:6}}><Percent size={13}/>Comissao</span>
                    <span style={{fontSize:20,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{s.commission_pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {modal && (
        <div className="animate-fade-in" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div className="animate-slide-in card" style={{width:'100%',maxWidth:460,padding:28,margin:16,border:'1px solid var(--border-bright)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 className="font-bangers neon-text-sm" style={{fontSize:24}}>{edit?'EDITAR':'NOVO'} VENDEDOR</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>NOME COMPLETO</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Joao Silva"/></div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>EMAIL</label><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="vendedor@email.com"/></div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>TELEFONE</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(27) 99999-9999"/></div>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>COMISSAO (%)</label>
                <div style={{position:'relative'}}>
                  <input type="number" min="0" max="100" step="0.5" value={form.commission_pct} onChange={e=>setForm(f=>({...f,commission_pct:parseFloat(e.target.value)||0}))} style={{paddingRight:40}}/>
                  <Percent size={14} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'var(--neon)'}}/>
                </div>
                <p style={{fontSize:11,color:'var(--muted)',marginTop:4}}>% sobre o valor total das vendas do mes</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--surface)',borderRadius:8}}>
                <input type="checkbox" id="active_s" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} style={{width:16,height:16,accentColor:'var(--neon)'}}/>
                <label htmlFor="active_s" style={{fontSize:13,color:'var(--text)',cursor:'pointer'}}>Vendedor ativo</label>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15}}>CANCELAR</button>
              <button onClick={save} className="btn-neon-fill" style={{flex:2,fontSize:15}}><Check size={14} style={{display:'inline',marginRight:6}}/>SALVAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}