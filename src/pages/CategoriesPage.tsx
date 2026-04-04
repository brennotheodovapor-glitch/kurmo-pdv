
import { useState } from 'react'
import { Plus, Edit2, Trash2, Tag, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

type Category = { id: string; name: string; icon: string; color: string; count?: number }

const ICONS = ['⚡','💨','💧','🔋','🔧','🌿','🔥','💊','🎯','⭐','🍃','💎']
const COLORS = ['#00ff41','#00ccff','#ff6600','#ff3399','#ffcc00','#cc00ff','#ff3333','#00ffcc']

const SEED: Category[] = [
  { id:'1', name:'Descartáveis', icon:'⚡', color:'#00ff41', count:8 },
  { id:'2', name:'Vapes', icon:'💨', color:'#00ccff', count:5 },
  { id:'3', name:'Liquids', icon:'💧', color:'#ff6600', count:12 },
  { id:'4', name:'Pods', icon:'🔋', color:'#cc00ff', count:4 },
  { id:'5', name:'Acessórios', icon:'🔧', color:'#ffcc00', count:6 },
]

const EMPTY = { id:'', name:'', icon:'⚡', color:'#00ff41', count:0 }

export default function CategoriesPage() {
  const [cats, setCats] = useState(SEED)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Category|null>(null)
  const [form, setForm] = useState(EMPTY)

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (c: Category) => { setEditing(c); setForm(c); setModal(true) }
  const save = () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return }
    if (editing) { setCats(p=>p.map(c=>c.id===editing.id?{...c,...form}:c)); toast.success('Categoria atualizada!') }
    else { setCats(p=>[...p,{...form,id:crypto.randomUUID(),count:0}]); toast.success('Categoria criada!') }
    setModal(false)
  }
  const del = (id:string) => { setCats(p=>p.filter(c=>c.id!==id)); toast.success('Removida') }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'center', gap:16 }}>
        <Tag size={20} color="var(--neon)"/>
        <h1 className="font-bangers neon-text-sm" style={{ fontSize:26 }}>CATEGORIAS</h1>
        <button onClick={openCreate} className="btn-neon-fill" style={{ marginLeft:'auto', fontSize:13, padding:'8px 18px' }}>NOVA CATEGORIA</button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:24 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:16 }}>
          {cats.map(c => (
            <div key={c.id} className="card card-hover animate-slide-in" style={{ padding:20, position:'relative' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, borderRadius:'12px 12px 0 0', background:c.color, boxShadow:`0 0 10px ${c.color}` }}/>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <div style={{ width:48, height:48, borderRadius:12, background:`${c.color}15`, border:`1px solid ${c.color}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{c.icon}</div>
                <div>
                  <p className="font-bangers" style={{ fontSize:20, color:'var(--white)', letterSpacing:'0.03em' }}>{c.name}</p>
                  <p style={{ fontSize:12, color:'var(--muted)' }}>{c.count} produtos</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, borderTop:'1px solid var(--border)', paddingTop:12 }}>
                <button onClick={()=>openEdit(c)} style={{ flex:1, padding:'7px 0', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--muted)', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:4, transition:'all 0.2s' }}><Edit2 size={13}/> Editar</button>
                <button onClick={()=>del(c.id)} style={{ width:34, height:34, borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {modal && (
        <div className="animate-fade-in" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}>
          <div className="animate-slide-in card" style={{ width:'100%', maxWidth:440, padding:28, margin:16, border:'1px solid var(--border-bright)', boxShadow:'0 0 40px rgba(0,255,65,0.15)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 className="font-bangers neon-text-sm" style={{ fontSize:24 }}>{editing?'EDITAR':'NOVA'} CATEGORIA</h2>
              <button onClick={()=>setModal(false)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div><label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:6, letterSpacing:1 }}>NOME</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Descartáveis"/></div>
              <div><label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:8, letterSpacing:1 }}>OCONE</label><div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>{ICONS.map(ic=> <button key={ic} onClick={()=>setForm(f=>({...f,icon:ic}))} style={{ width:40, height:40, borderRadius:8, fontSize:20, cursor:'pointer', transition:'all 0.15s', border:form.icon===ic?'2px solid var(--neon)':'1px solid var(--border)', background:form.icon===ic?'var(--neon-glow)':'', boxShadow:form.icon===ic?'0 0 8px var(--neon-glow)':'' }}>{ic}</button>)}</div></div>
              <div><label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:8, letterSpacing:1 }}>COR</label><div style={{ display:'flex', gap:8 }}>{COLORS.map(col=> <button key={col} onClick={()=>setForm(f=>({...f,color:col}))} style={{ width:32, height:32, borderRadius:'50%', background:col, border:'none', cursor:'pointer', boxShadow:form.color===col?`0 0 12px ${col}`:'none', outline:form.color===col?`2px solid ${col}`:'none', outlineOffset:2 }}/>)}</div></div>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button onClick={()=>setModal(false)} style={{ flex:1, padding:10, borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--muted)', cursor:'pointer', fontFamily:'Bangers,cursive', fontSize:15 }}>CANCELAR</button>
                <button onClick={save} className="btn-neon-fill" style={{ flex:2, fontSize:15 }}><Check size={14} style={{ display:'inline', marginRight:6 }}/> SALVAR</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
