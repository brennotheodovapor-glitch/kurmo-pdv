import{useState,useEffect,useRef}from 'react'
import{Tag,Plus,Edit2,Trash2,X,Check,Image}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'
type Category={id:string;name:string;icon:string;color:string;image_url?:string;active:boolean}
const EMPTY={name:'',icon:'📦',color:'#00ff41',image_url:'',active:true}
const ICONS=['📦','⚡','💨','💧','🔋','🔧','🎯','💊','🍬','🔥','💎','🌿']
const COLORS=['#00ff41','#06b6d4','#7c3aed','#f59e0b','#10b981','#ff3333','#ec4899','#f97316']
export default function CategoriesPage(){
  const[cats,setCats]=useState<Category[]>([])
  const[loading,setLoading]=useState(true)
  const[modal,setModal]=useState(false)
  const[edit,setEdit]=useState<Category|null>(null)
  const[form,setForm]=useState(EMPTY)
  const[preview,setPreview]=useState<string|null>(null)
  const[uploading,setUploading]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)
  useEffect(()=>{loadCats()},[])
  async function loadCats(){setLoading(true);const{data}=await supabase.from('categories').select('*').order('name');setCats(data||[]);setLoading(false)}
  const openC=()=>{setEdit(null);setForm(EMPTY);setPreview(null);setModal(true)}
  const openE=(c:Category)=>{setEdit(c);setForm({name:c.name,icon:c.icon,color:c.color,image_url:c.image_url||'',active:c.active});setPreview(c.image_url||null);setModal(true)}
  async function handleImg(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return
    const r=new FileReader();r.onload=ev=>setPreview(ev.target?.result as string);r.readAsDataURL(file)
    setUploading(true)
    try{
      const fn='categories/'+Date.now()+'.'+file.name.split('.').pop()
      const{data,error}=await supabase.storage.from('category-images').upload(fn,file,{upsert:true})
      if(!error&&data){const{data:{publicUrl}}=supabase.storage.from('category-images').getPublicUrl(fn);setForm(f=>({...f,image_url:publicUrl}));toast.success('Imagem enviada!')}
    }catch{}finally{setUploading(false)}
  }
  async function save(){
    if(!form.name.trim()){toast.error('Nome obrigatorio');return}
    if(edit){const{error}=await supabase.from('categories').update(form).eq('id',edit.id);if(error){toast.error(error.message);return};toast.success('Categoria atualizada!')}
    else{const{error}=await supabase.from('categories').insert(form);if(error){toast.error(error.message);return};toast.success('Categoria criada!')}
    setModal(false);loadCats()
  }
  async function del(id:string){if(!confirm('Remover categoria?'))return;await supabase.from('categories').delete().eq('id',id);toast.success('Removida');loadCats()}
  return(<div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
    <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12}}>
      <Tag size={20} color="var(--neon)"/>
      <h1 className="font-bangers neon-text-sm" style={{fontSize:26}}>CATEGORIAS</h1>
      <span style={{fontSize:12,color:'var(--muted)',background:'var(--card)',padding:'4px 10px',borderRadius:20}}>{cats.length} categorias</span>
      <button onClick={openC} className="btn-neon-fill" style={{marginLeft:'auto',fontSize:13,padding:'8px 16px'}}><Plus size={14} style={{display:'inline',marginRight:6}}/>NOVA CATEGORIA</button>
    </div>
    <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
      {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:(
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16}}>
        {cats.map(c=>(
          <div key={c.id} className="card card-hover" style={{overflow:'hidden',border:'2px solid '+c.color+'40'}}>
            {c.image_url?<img src={c.image_url} alt={c.name} style={{width:'100%',height:100,objectFit:'cover'}}/>:<div style={{height:80,background:c.color+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40}}>{c.icon}</div>}
            <div style={{padding:'12px 14px'}}>
              <p className="font-bangers" style={{fontSize:18,color:'var(--white)',letterSpacing:1}}>{c.name}</p>
              <div style={{display:'flex',gap:8,marginTop:10}}>
                <button onClick={()=>openE(c)} style={{flex:1,padding:'6px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontSize:12}}><Edit2 size={13}/>Editar</button>
                <button onClick={()=>del(c.id)} style={{width:34,height:34,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={14}/></button>
              </div>
            </div>
          </div>
        ))}
        {cats.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:48,color:'var(--muted)'}}><Tag size={32} style={{opacity:0.3,marginBottom:8}}/><p>Nenhuma categoria</p></div>}
      </div>)}
    </div>
    {modal&&(<div className="animate-fade-in" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
      <div className="animate-slide-in card" style={{width:'100%',maxWidth:460,padding:28,margin:16,border:'1px solid var(--border-bright)',boxShadow:'0 0 40px rgba(0,255,65,0.15)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <h2 className="font-bangers neon-text-sm" style={{fontSize:24}}>{edit?'EDITAR':'NOVA'} CATEGORIA</h2>
          <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={20}/></button>
        </div>
        <div style={{display:'flex',gap:16,marginBottom:16}}>
          <div onClick={()=>fileRef.current?.click()} style={{width:90,height:90,borderRadius:12,border:'2px dashed var(--border)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',background:'var(--surface)',flexShrink:0}}>
            {preview?<img src={preview} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<><Image size={22} color="var(--muted)" style={{marginBottom:4}}/><p style={{fontSize:9,color:'var(--muted)',textAlign:'center'}}>{uploading?'Enviando...':'+ Imagem'}</p></>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{display:'none'}}/>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:10}}>
            <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>NOME</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Descartaveis"/></div>
            <div>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,letterSpacing:1}}>ICONE</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {ICONS.map(ic=><button key={ic} onClick={()=>setForm(f=>({...f,icon:ic}))} style={{width:32,height:32,borderRadius:8,border:form.icon===ic?'2px solid var(--neon)':'1px solid var(--border)',background:form.icon===ic?'var(--neon-glow)':'var(--surface)',cursor:'pointer',fontSize:16}}>{ic}</button>)}
              </div>
            </div>
          </div>
        </div>
        <div>
          <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,letterSpacing:1}}>COR</label>
          <div style={{display:'flex',gap:8}}>
            {COLORS.map(cl=><button key={cl} onClick={()=>setForm(f=>({...f,color:cl}))} style={{width:32,height:32,borderRadius:8,background:cl,border:form.color===cl?'3px solid white':'2px solid transparent',cursor:'pointer',boxShadow:form.color===cl?'0 0 12px '+cl:'none'}}/>)}
          </div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15}}>CANCELAR</button>
          <button onClick={save} className="btn-neon-fill" style={{flex:2,fontSize:15}}><Check size={14} style={{display:'inline',marginRight:6}}/>SALVAR</button>
        </div>
      </div>
    </div>)}
  </div>)}