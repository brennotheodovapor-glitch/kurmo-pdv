import { useState } from 'react'
import { Users, Plus, Search, Edit2, Trash2, X, Check, Phone, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

type Customer = {id:string;name:string;phone:string;email:string;orders:number;total:number;lastOrder:string}
const INIT:Customer[]=[
  {id:'1',name:'Joao Silva',phone:'(27)99123-4567',email:'joao@email.com',orders:8,total:640,lastOrder:'2024-03-15'},
  {id:'2',name:'Maria Santos',phone:'(27)98765-4321',email:'maria@email.com',orders:5,total:375,lastOrder:'2024-03-10'},
  {id:'3',name:'Carlos Lima',phone:'(27)97654-3210',email:'carlos@email.com',orders:12,total:960,lastOrder:'2024-03-14'},
  {id:'4',name:'Ana Costa',phone:'(27)96543-2109',email:'ana@email.com',orders:3,total:225,lastOrder:'2024-03-08'},
  {id:'5',name:'Pedro Nunes',phone:'(27)95432-1098',email:'pedro@email.com',orders:7,total:560,lastOrder:'2024-03-13'},
]
const EMPTY={name:'',phone:'',email:'',orders:0,total:0,lastOrder:new Date().toISOString().split('T')[0]}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function CustomersPage(){
  const[customers,setCustomers]=useState(INIT)
  const[search,setSearch]=useState('')
  const[modal,setModal]=useState(false)
  const[edit,setEdit]=useState<Customer|null>(null)
  const[form,setForm]=useState(EMPTY)
  const filt=customers.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search)||c.email.includes(search))
  const openC=()=>{setEdit(null);setForm(EMPTY);setModal(true)}
  const openE=(c:Customer)=>{setEdit(c);setForm({...c});setModal(true)}
  const save=()=>{
    if(!form.name.trim()){toast.error('Nome obrigatorio');return}
    if(edit){setCustomers(p=>p.map(i=>i.id===edit.id?{...i,...form}:i));toast.success('Atualizado!')}
    else{setCustomers(p=>[...p,{...form,id:crypto.randomUUID()}]);toast.success('Cadastrado!')}
    setModal(false)
  }
  const del=(id:string)=>{setCustomers(p=>p.filter(i=>i.id!==id));toast.success('Removido')}
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12}}>
        <Users size={20} color="var(--neon)"/>
        <h1 className="font-bangers neon-text-sm" style={{fontSize:26}}>CLIENTES</h1>
        <div style={{position:'relative',flex:1,maxWidth:280}}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente..." style={{paddingLeft:32}}/>
        </div>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--muted)'}}>{filt.length} clientes</span>
        <button onClick={openC} className="btn-neon-fill" style={{fontSize:13,padding:'8px 16px'}}>
          <Plus size={14} style={{display:'inline',marginRight:6}}/>NOVO CLIENTE
        </button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        <div className="card" style={{overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
              {['CLIENTE','TELEFONE','EMAIL','PEDIDOS','TOTAL','ULTIMO PEDIDO',''].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filt.map(c=>(
              <tr key={c.id} style={{borderBottom:'1px solid rgba(26,46,26,0.5)'}}>
                <td style={{padding:'10px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:'var(--neon-glow)',border:'1px solid var(--neon-dim)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bangers,cursive',fontSize:16,color:'var(--neon)'}}>
                      {c.name.charAt(0)}
                    </div>
                    <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{c.name}</p>
                  </div>
                </td>
                <td style={{padding:'10px 14px',fontSize:12,color:'var(--muted)',display:'flex',alignItems:'center',gap:6,paddingTop:22}}>
                  <Phone size={12}/>{c.phone}
                </td>
                <td style={{padding:'10px 14px',fontSize:12,color:'var(--muted)'}}>{c.email}</td>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:600,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{c.orders}</td>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:600,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{fmt(c.total)}</td>
                <td style={{padding:'10px 14px',fontSize:12,color:'var(--muted)'}}>{c.lastOrder}</td>
                <td style={{padding:'10px 14px'}}>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>openE(c)} style={{width:30,height:30,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={13}/></button>
                    <button onClick={()=>del(c.id)} style={{width:30,height:30,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {filt.length===0&&<div style={{padding:48,display:'flex',flexDirection:'column',alignItems:'center',color:'var(--muted)'}}><Users size={32} style={{marginBottom:8,opacity:0.4}}/><p>Nenhum cliente encontrado</p></div>}
        </div>
      </div>
      {modal&&(
        <div className="animate-fade-in" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div className="animate-slide-in card" style={{width:'100%',maxWidth:460,padding:28,margin:16,border:'1px solid var(--border-bright)',boxShadow:'0 0 40px rgba(0,255,65,0.15)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 className="font-bangers neon-text-sm" style={{fontSize:24}}>{edit?'EDITAR':'NOVO'} CLIENTE</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>NOME</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nome completo"/></div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>TELEFONE</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(27) 99999-9999"/></div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>EMAIL</label><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@exemplo.com"/></div>
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