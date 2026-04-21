import{useState,useEffect,useRef}from 'react'
import{Tag,Plus,Edit2,Trash2,X,Check,GripVertical}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'
type Category={id:string;name:string;color:string;sort_order:number}
const COLORS=['#00ff41','#06b6d4','#f59e0b','#7c3aed','#ff3333','#10b981','#f472b6','#fb923c']
export default function CategoriesPage(){
  const[cats,setCats]=useState<Category[]>([])
  const[loading,setLoading]=useState(true)
  const[modal,setModal]=useState(false)
  const[editing,setEditing]=useState<Category|null>(null)
  const[form,setForm]=useState({name:'',color:'#00ff41'})
  const[saving,setSaving]=useState(false)
  const dragIdx=useRef<number|null>(null)
  const dragOverIdx=useRef<number|null>(null)
  const[dragActive,setDragActive]=useState<number|null>(null)
  const[dragOver,setDragOver]=useState<number|null>(null)
  useEffect(()=>{load()},[])
  async function load(){
    setLoading(true)
    const{data}=await supabase.from('categories').select('*').order('sort_order',{ascending:true}).order('name',{ascending:true})
    setCats(data||[])
    setLoading(false)
  }
  // Drag and drop handlers
  function onDragStart(i:number){dragIdx.current=i;setDragActive(i)}
  function onDragOver(e:React.DragEvent,i:number){e.preventDefault();dragOverIdx.current=i;setDragOver(i)}
  async function onDrop(){
    const from=dragIdx.current;const to=dragOverIdx.current
    if(from===null||to===null||from===to){setDragActive(null);setDragOver(null);return}
    const newCats=[...cats]
    const[moved]=newCats.splice(from,1)
    newCats.splice(to,0,moved)
    const updated=newCats.map((c,i)=>({...c,sort_order:i}))
    setCats(updated)
    setDragActive(null);setDragOver(null)
    dragIdx.current=null;dragOverIdx.current=null
    // Save order to DB
    for(const c of updated){
      await supabase.from('categories').update({sort_order:c.sort_order}).eq('id',c.id)
    }
    toast.success('Ordem salva! O catálogo será atualizado.')
  }
  function openNew(){setEditing(null);setForm({name:'',color:'#00ff41'});setModal(true)}
  function openEdit(c:Category){setEditing(c);setForm({name:c.name,color:c.color||'#00ff41'});setModal(true)}
  async function save(){
    if(!form.name.trim()){toast.error('Nome obrigatório');return}
    setSaving(true)
    if(editing){
      const{error}=await supabase.from('categories').update({name:form.name,color:form.color}).eq('id',editing.id)
      if(error){toast.error(error.message);setSaving(false);return}
      toast.success('Categoria atualizada!')
    }else{
      const maxSort=cats.length>0?Math.max(...cats.map(c=>c.sort_order||0))+1:0
      const{error}=await supabase.from('categories').insert({name:form.name,color:form.color,sort_order:maxSort})
      if(error){toast.error(error.message);setSaving(false);return}
      toast.success('Categoria criada!')
    }
    setSaving(false);setModal(false);load()
  }
  async function del(id:string){
    if(!confirm('Deletar categoria? Os produtos não serão deletados.'))return
    await supabase.from('categories').delete().eq('id',id)
    toast.success('Removida!')
    load()
  }
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10}}>
        <Tag size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>CATEGORIAS</h1>
        <button onClick={openNew} className='btn-neon-fill' style={{marginLeft:'auto',fontSize:12,padding:'7px 14px'}}>
          <Plus size={13} style={{display:'inline',marginRight:5}}/>NOVA CATEGORIA
        </button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        <div style={{padding:'10px 14px',background:'rgba(0,255,65,0.04)',border:'1px solid var(--neon-dim)',borderRadius:10,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
          <GripVertical size={14} color='var(--neon)'/>
          <p style={{fontSize:12,color:'var(--muted)'}}>Arraste as categorias para mudar a ordem no catálogo. A ordem aqui é a ordem que o cliente vê.</p>
        </div>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        cats.length===0?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Nenhuma categoria. Crie a primeira!</div>:
        cats.map((c,i)=>(
          <div
            key={c.id}
            draggable
            onDragStart={()=>onDragStart(i)}
            onDragOver={e=>onDragOver(e,i)}
            onDrop={onDrop}
            onDragEnd={()=>{setDragActive(null);setDragOver(null)}}
            className='card'
            style={{
              marginBottom:8,padding:'12px 16px',
              display:'flex',alignItems:'center',gap:12,
              cursor:'grab',userSelect:'none',
              opacity:dragActive===i?0.4:1,
              border:dragOver===i&&dragActive!==i?'2px solid var(--neon)':'1px solid var(--border)',
              transform:dragOver===i&&dragActive!==i?'translateY(-2px)':'none',
              transition:'border 0.1s, transform 0.1s, opacity 0.1s',
            }}>
            <GripVertical size={16} color='var(--muted)' style={{flexShrink:0}}/>
            <div style={{width:14,height:14,borderRadius:'50%',background:c.color||'#00ff41',flexShrink:0,boxShadow:'0 0 6px '+(c.color||'#00ff41')+'80'}}/>
            <span style={{fontSize:14,fontWeight:600,color:'var(--white)',flex:1}}>{c.name}</span>
            <span style={{fontSize:10,color:'var(--muted)',fontFamily:'JetBrains Mono,monospace',background:'var(--surface)',padding:'2px 7px',borderRadius:4}}>#{i+1}</span>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>openEdit(c)} style={{width:30,height:30,borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Edit2 size={13}/>
              </button>
              <button onClick={()=>del(c.id)} style={{width:30,height:30,borderRadius:7,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Trash2 size={13}/>
              </button>
            </div>
          </div>
        ))}
      </div>
      {modal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:400,padding:24,border:'1px solid var(--border-bright)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h2 className='font-bangers' style={{fontSize:20,color:'var(--neon)'}}>{editing?'EDITAR':'NOVA'} CATEGORIA</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={18}/></button>
            </div>
            <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:0.8}}>NOME</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder='Ex: Pods Descartáveis' autoFocus style={{width:'100%',fontSize:14,marginBottom:14}}/>
            <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:8,letterSpacing:0.8}}>COR</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
              {COLORS.map(col=>(
                <div key={col} onClick={()=>setForm(f=>({...f,color:col}))} style={{width:30,height:30,borderRadius:8,background:col,cursor:'pointer',border:form.color===col?'3px solid #fff':'2px solid transparent',boxShadow:form.color===col?'0 0 8px '+col:'none',transition:'all 0.15s'}}/>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
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