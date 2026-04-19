import{useState,useEffect,useRef}from 'react'
import{Tag,Plus,Edit2,Trash2,X,Check,Image,Camera}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Category={id:string;name:string;color:string;image_url?:string;active:boolean;count?:number}
const COLORS=['#00ff41','#06b6d4','#7c3aed','#f59e0b','#10b981','#ef4444','#f97316','#ec4899','#64748b','#ffffff']
const EMPTY={name:'',color:'#00ff41',image_url:'',active:true}

export default function CategoriesPage(){
  const[cats,setCats]=useState<Category[]>([])
  const[loading,setLoading]=useState(true)
  const[modal,setModal]=useState(false)
  const[dragIdx,setDragIdx]=useState<number|null>(null)
  const[dragOver,setDragOver]=useState<number|null>(null)
  const[edit,setEdit]=useState<Category|null>(null)
  const[form,setForm]=useState(EMPTY)
  const[preview,setPreview]=useState<string|null>(null)
  const[uploading,setUploading]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{loadCats()},[])

  async function loadCats(){
    setLoading(true)
    const{data:cs}=await supabase.from('categories').select('*').order('name')
    const{data:ps}=await supabase.from('products').select('category_id')
    const counts:Record<string,number>={}
    ;(ps||[]).forEach(p=>{if(p.category_id)counts[p.category_id]=(counts[p.category_id]||0)+1})
    setCats((cs||[]).map(c=>({...c,count:counts[c.id]||0})))
    setLoading(false)
  }

  function openC(){setEdit(null);setForm(EMPTY);setPreview(null);setModal(true)}
  function openE(c:Category){setEdit(c);setForm({name:c.name,color:c.color,image_url:c.image_url||'',active:c.active});setPreview(c.image_url||null);setModal(true)}

  async function handleImg(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return
    const r=new FileReader();r.onload=ev=>setPreview(ev.target?.result as string);r.readAsDataURL(file)
    setUploading(true)
    try{
      const ext=file.name.split('.').pop()
      const fn='categories/'+Date.now()+'.'+ext
      const{data,error}=await supabase.storage.from('category-images').upload(fn,file,{upsert:true})
      if(!error&&data){
        const{data:{publicUrl}}=supabase.storage.from('category-images').getPublicUrl(fn)
        setForm(f=>({...f,image_url:publicUrl}))
        toast.success('Foto enviada!')
      } else {
        toast.error('Erro ao enviar foto. Verifique o bucket category-images.')
      }
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setUploading(false)}
  }

  async function save(){
    if(!form.name.trim()){toast.error('Nome obrigatorio');return}
    const payload={name:form.name,color:form.color,image_url:form.image_url||null,active:form.active,icon:''}
    if(edit){
      const{error}=await supabase.from('categories').update(payload).eq('id',edit.id)
      if(error){toast.error('Erro: '+error.message);return}
      toast.success('Categoria atualizada!')
    }else{
      const{error}=await supabase.from('categories').insert(payload)
      if(error){toast.error('Erro: '+error.message);return}
      toast.success('Categoria criada!')
    }
    setModal(false);loadCats()
  }

  async function del(id:string){
    if(!confirm('Remover categoria?'))return
    await supabase.from('categories').delete().eq('id',id)
    toast.success('Removida');loadCats()
  }

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12}}>
        <Tag size={20} color="var(--neon)"/>
        <h1 className="font-bangers neon-text-sm" style={{fontSize:26}}>CATEGORIAS</h1>
        <span style={{fontSize:12,color:'var(--muted)',background:'var(--card)',padding:'4px 10px',borderRadius:20}}>{cats.length} categorias</span>
        <button onClick={openC} className="btn-neon-fill" style={{marginLeft:'auto',fontSize:13,padding:'8px 16px'}}>
          <Plus size={14} style={{display:'inline',marginRight:6}}/>NOVA CATEGORIA
        </button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16}}>
            {cats.map(c=>(
              <div key={c.id} className="card" style={{overflow:'hidden',border:'1px solid var(--border)',transition:'border-color 0.2s'}} onMouseEnter={e=>(e.currentTarget.style.borderColor=c.color)} onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
                {/* Image area */}
                <div style={{position:'relative',height:130,background:'var(--surface)',overflow:'hidden'}}>
                  {c.image_url?(
                    <img src={c.image_url} alt={c.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  ):(
                    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
                      <Camera size={28} color="var(--muted)" style={{opacity:0.4}}/>
                      <p style={{fontSize:11,color:'var(--muted)',opacity:0.6}}>Sem foto</p>
                    </div>
                  )}
                  {/* Color bar */}
                  <div style={{position:'absolute',bottom:0,left:0,right:0,height:4,background:c.color}}/>
                </div>
                <div style={{padding:'12px 14px'}}>
                  <p style={{fontSize:14,fontWeight:700,color:'var(--white)',marginBottom:3}}>{c.name}</p>
                  <p style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>{c.count} produto{c.count!==1?'s':''}</p>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>openE(c)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'7px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12}}>
                      <Edit2 size={13}/>Editar
                    </button>
                    <button onClick={()=>del(c.id)} style={{width:34,height:34,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal&&(
        <div className="animate-fade-in" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className="animate-slide-in card" style={{width:'100%',maxWidth:460,padding:24,border:'1px solid var(--border-bright)',boxShadow:'0 0 40px rgba(0,255,65,0.1)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 className="font-bangers neon-text-sm" style={{fontSize:22}}>{edit?'EDITAR':'NOVA'} CATEGORIA</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={20}/></button>
            </div>

            {/* Image upload */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:8,letterSpacing:1}}>FOTO DA CATEGORIA</label>
              <div onClick={()=>fileRef.current?.click()} style={{position:'relative',height:140,borderRadius:12,border:'2px dashed var(--border)',overflow:'hidden',cursor:'pointer',background:'var(--surface)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,transition:'border-color 0.2s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--neon)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                {preview?(
                  <>
                    <img src={preview} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>
                    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',opacity:0,transition:'opacity 0.2s'}} className="img-hover-overlay">
                      <p style={{color:'white',fontSize:13,fontWeight:600}}>Trocar foto</p>
                    </div>
                  </>
                ):(
                  <>
                    <Image size={28} color="var(--muted)"/>
                    <p style={{fontSize:13,color:'var(--muted)'}}>{uploading?'Enviando...':'Clique para adicionar foto'}</p>
                    <p style={{fontSize:11,color:'var(--muted)',opacity:0.6}}>JPG, PNG ou WebP</p>
                  </>
                )}
                {uploading&&<div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:'var(--neon)',animation:'neon-pulse 1s infinite'}}/>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{display:'none'}}/>
              {preview&&<button onClick={()=>{setPreview(null);setForm(f=>({...f,image_url:''}))}} style={{fontSize:11,color:'#ff3333',background:'none',border:'none',cursor:'pointer',marginTop:6,display:'block'}}>Remover foto</button>}
            </div>

            {/* Name */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>NOME DA CATEGORIA</label>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Descartaveis, Vapes, Pods..."/>
            </div>

            {/* Color picker */}
            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:8,letterSpacing:1}}>COR DE DESTAQUE</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {COLORS.map(col=>(
                  <button key={col} onClick={()=>setForm(f=>({...f,color:col}))} style={{width:28,height:28,borderRadius:8,background:col,border:form.color===col?'3px solid white':'2px solid transparent',cursor:'pointer',transition:'transform 0.15s',transform:form.color===col?'scale(1.2)':'scale(1)'}}/>
                ))}
              </div>
            </div>

            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={save} className="btn-neon-fill" style={{flex:2,fontSize:14}} disabled={uploading}>
                <Check size={13} style={{display:'inline',marginRight:5}}/>{uploading?'AGUARDE...':'SALVAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}