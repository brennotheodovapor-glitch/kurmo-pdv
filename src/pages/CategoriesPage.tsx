import{useState,useEffect,useRef}from 'react'
import{Plus,Edit2,Trash2,X,Check,Image,Tag}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'
type Cat={id:string;name:string;icon:string;color:string;image_url?:string;active:boolean}
const ICONS=['📦','⚡','💨','💧','🔋','🔧','🌿','🔥','💎','🎯','🛒','🏪','💊','🎁','✨']
const COLORS=['#00ff41','#06b6d4','#7c3aed','#f59e0b','#10b981','#ef4444','#f97316','#8b5cf6','#ec4899','#14b8a6']
const EMPTY={name:'',icon:'📦',color:'#00ff41',image_url:'',active:true}
export default function CategoriesPage(){
  const[cats,setCats]=useState<Cat[]>([])
  const[loading,setLoading]=useState(true)
  const[modal,setModal]=useState(false)
  const[edit,setEdit]=useState<Cat|null>(null)
  const[form,setForm]=useState(EMPTY)
  const[preview,setPreview]=useState<string|null>(null)
  const[uploading,setUploading]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)
  useEffect(()=>{load()},[])
  async function load(){
    setLoading(true)
    const{data}=await supabase.from('categories').select('*, products(count)').order('name')
    setCats((data||[]).map((c:any)=>({...c,count:c.products?.[0]?.count||0})));setLoading(false)
  }
  const openC=()=>{setEdit(null);setForm(EMPTY);setPreview(null);setModal(true)}
  const openE=(c:Cat)=>{setEdit(c);setForm({name:c.name,icon:c.icon,color:c.color,image_url:c.image_url||'',active:c.active});setPreview(c.image_url||null);setModal(true)}
  async function handleImg(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return
    new FileReader().onload=ev=>setPreview(ev.target?.result as string)
    const r=new FileReader();r.onload=ev=>setPreview(ev.target?.result as string);r.readAsDataURL(file)
    setUploading(true)
    try{
      const fn='cat_'+Date.now()+'.'+file.name.split('.').pop()
      const{data,error}=await supabase.storage.from('category-images').upload(fn,file,{upsert:true})
      if(!error&&data){
        const{data:{publicUrl}}=supabase.storage.from('category-images').getPublicUrl(fn)
        setForm(f=>({...f,image_url:publicUrl}));toast.success('Imagem enviada!')
      }else toast.error('Erro no upload')
    }catch(e:any){toast.error('Erro: '+e.message)}finally{setUploading(false)}
  }
  async function save(){
    if(!form.name.trim()){toast.error('Nome obrigatorio');return}
    const payload={name:form.name,icon:form.icon,color:form.color,image_url:form.image_url||null,active:form.active}
    if(edit){
      const{error}=await supabase.from('categories').update(payload).eq('id',edit.id)
      if(error){toast.error('Erro: '+error.message);return}
      toast.success('Categoria atualizada!')
    }else{
      const{error}=await supabase.from('categories').insert(payload)
      if(error){toast.error('Erro: '+error.message);return}
      toast.success('Categoria criada!')
    }
    setModal(false);load()
  }
  async function del(id:string){if(!confirm('Remover categoria?'))return;await supabase.from('categories').delete().eq('id',id);toast.success('Removida');load()}
  return(<div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
    <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12}}>
      <Tag size={20} color="var(--neon)"/>
      <h1 className="font-bangers neon-text-sm" style={{fontSize:26}}>CATEGORIAS</h1>
      <span style={{fontSize:12,color:'var(--muted)',background:'var(--card)',padding:'4px 10px',borderRadius:20}}>{cats.length} categorias</span>
      <button onClick={openC} className="btn-neon-fill" style={{marginLeft:'auto',fontSize:13,padding:'8px 16px'}}><Plus size={14} style={{display:'inline',marginRight:6}}/>NOVA CATEGORIA</button>
    </div>
    <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
      {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:(
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:16}}>
        {cats.map((c:any)=>(
          <div key={c.id} className="card card-hover" style={{overflow:'hidden'}}>
            <div style={{height:6,background:c.color,borderRadius:'0'}}/>
            <div style={{padding:16}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div style={{width:52,height:52,borderRadius:12,background:c.image_url?'transparent':c.color+'20',border:'2px solid '+c.color+'40',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>
                  {c.image_url?<img src={c.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:26}}>{c.icon}</span>}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontFamily:'Bangers,cursive',fontSize:17,color:'var(--white)',letterSpacing:1}}>{c.name.toUpperCase()}</p>
                  <p style={{fontSize:12,color:'var(--muted)'}}>{c.count||0} produtos</p>
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>openE(c)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'7px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}><Edit2 size={13}/>Editar</button>
                <button onClick={()=>del(c.id)} style={{width:34,height:34,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={13}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>)}
    </div>
    {modal&&(
      <div className="animate-fade-in" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
        <div className="animate-slide-in card" style={{width:'100%',maxWidth:480,padding:28,margin:16,border:'1px solid var(--border-bright)',boxShadow:'0 0 40px rgba(0,255,65,0.15)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <h2 className="font-bangers neon-text-sm" style={{fontSize:24}}>{edit?'EDITAR':'NOVA'} CATEGORIA</h2>
            <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={20}/></button>
          </div>
          <div style={{display:'flex',gap:16,marginBottom:14}}>
            <div style={{flexShrink:0}}>
              <div onClick={()=>fileRef.current?.click()} style={{width:90,height:90,borderRadius:12,border:'2px dashed var(--border)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',background:'var(--surface)'}} className="card-hover">
                {preview?<img src={preview} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<><Image size={22} color="var(--muted)" style={{marginBottom:3}}/><p style={{fontSize:9,color:'var(--muted)',textAlign:'center'}}>{uploading?'Enviando...':'+ Imagem'}</p></>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{display:'none'}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{marginBottom:10}}><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4,letterSpacing:1}}>NOME DA CATEGORIA</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Descartaveis"/></div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,letterSpacing:1}}>ICONE</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {ICONS.map(ic=><button key={ic} onClick={()=>setForm(f=>({...f,icon:ic}))} style={{width:34,height:34,borderRadius:8,border:form.icon===ic?'2px solid var(--neon)':'1px solid var(--border)',background:form.icon===ic?'var(--neon-glow)':'transparent',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>{ic}</button>)}
                </div>
              </div>
            </div>
          </div>
          <div style={{marginBottom:14}}><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,letterSpacing:1}}>COR</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {COLORS.map(col=><button key={col} onClick={()=>setForm(f=>({...f,color:col}))} style={{width:32,height:32,borderRadius:8,background:col,border:form.color===col?'3px solid white':'2px solid transparent',cursor:'pointer',transition:'transform 0.1s',transform:form.color===col?'scale(1.15)':'scale(1)'}}/>)}
            </div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15}}>CANCELAR</button>
            <button onClick={save} className="btn-neon-fill" style={{flex:2,fontSize:15}}><Check size={14} style={{display:'inline',marginRight:6}}/>SALVAR</button>
          </div>
        </div>
      </div>
    )}
  </div>)}