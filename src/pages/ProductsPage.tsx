import{useState,useEffect,useRef}from 'react'
import{Plus,Search,Edit2,Trash2,X,Check,Image,Package,AlertTriangle,Shirt}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Product={id:string;name:string;price:number;cost_price:number;stock:number;stock_alert?:number;category_id:string|null;active:boolean;image_url?:string;description?:string;has_sizes?:boolean;sizes?:string[]}
type Category={id:string;name:string;color:string}

const EMPTY:Omit<Product,'id'>={name:'',price:0,cost_price:0,stock:0,stock_alert:5,category_id:null,active:true,image_url:'',description:'',has_sizes:false,sizes:[]}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const SIZE_PRESETS=[
  {label:'P-GG',sizes:['P','M','G','GG']},
  {label:'P-XGG',sizes:['P','M','G','GG','XGG']},
  {label:'34-44',sizes:['34','36','38','40','42','44']},
  {label:'36-46',sizes:['36','38','40','42','44','46']},
  {label:'Único',sizes:['Único']},
]

export default function ProductsPage(){
  const[products,setProducts]=useState<Product[]>([])
  const[categories,setCategories]=useState<Category[]>([])
  const[search,setSearch]=useState('')
  const[catFilter,setCatFilter]=useState<string|null>(null)
  const[modal,setModal]=useState(false)
  const[edit,setEdit]=useState<Product|null>(null)
  const[form,setForm]=useState<Omit<Product,'id'>>(EMPTY)
  const[uploading,setUploading]=useState(false)
  const[preview,setPreview]=useState<string|null>(null)
  const[loading,setLoading]=useState(true)
  const[newSize,setNewSize]=useState('')
  const fileRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{loadData()},[])

  async function loadData(){
    setLoading(true)
    const[p,c]=await Promise.all([
      supabase.from('products').select('id,name,price,cost_price,stock,stock_alert,category_id,active,image_url,description,has_sizes,sizes').order('name'),
      supabase.from('categories').select('*').order('name')
    ])
    setProducts(p.data||[])
    setCategories(c.data||[])
    setLoading(false)
  }

  const filtered=products.filter(p=>{
    if(catFilter&&p.category_id!==catFilter)return false
    if(search)return p.name.toLowerCase().includes(search.toLowerCase())
    return true
  })
  const lowStock=products.filter(p=>p.active&&p.stock>0&&p.stock<=(p.stock_alert??5))
  const outStock=products.filter(p=>p.active&&p.stock===0)

  const openNew=()=>{setEdit(null);setForm(EMPTY);setPreview(null);setNewSize('');setModal(true)}
  const openEdit=(p:Product)=>{
    setEdit(p)
    setForm({name:p.name,price:p.price,cost_price:p.cost_price,stock:p.stock,stock_alert:p.stock_alert??5,category_id:p.category_id,active:p.active,image_url:p.image_url||'',description:p.description||'',has_sizes:p.has_sizes||false,sizes:p.sizes||[]})
    setPreview(p.image_url&&p.image_url.startsWith('http')?p.image_url:null)
    setNewSize('');setModal(true)
  }

  function toggleSize(s:string){
    const cur=form.sizes||[]
    setForm(f=>({...f,sizes:cur.includes(s)?cur.filter(x=>x!==s):[...cur,s]}))
  }
  function applyPreset(sizes:string[]){setForm(f=>({...f,sizes}))}
  function addCustomSize(){
    const s=newSize.trim().toUpperCase();if(!s)return
    if(!(form.sizes||[]).includes(s))setForm(f=>({...f,sizes:[...(f.sizes||[]),s]}))
    setNewSize('')
  }

  async function handleImg(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return
    const reader=new FileReader();reader.onload=ev=>setPreview(ev.target?.result as string);reader.readAsDataURL(file)
    setUploading(true)
    try{
      const ext=file.name.split('.').pop()?.toLowerCase()||'jpg'
      const{error}=await supabase.storage.from('product-images').upload('products/'+Date.now()+'.'+ext,file,{upsert:true,contentType:file.type})
      if(error){toast.error('Erro: '+error.message);return}
      const{data:{publicUrl}}=supabase.storage.from('product-images').getPublicUrl('products/'+Date.now()+'.'+ext)
      setForm(f=>({...f,image_url:publicUrl}));toast.success('Foto enviada!')
    }catch(err:any){toast.error(err.message)}finally{setUploading(false)}
  }

  async function save(){
    if(!form.name.trim()){toast.error('Nome obrigatório');return}
    const payload:any={
      name:form.name,description:form.description||'',
      price:Number(form.price)||0,cost_price:Number(form.cost_price)||0,
      stock:Number(form.stock)||0,stock_alert:Number(form.stock_alert)||5,
      category_id:form.category_id||null,active:form.active,image_url:form.image_url||'',
      has_sizes:form.has_sizes||false,
      sizes:form.has_sizes?(form.sizes||[]):[]
    }
    if(edit){
      const{error}=await supabase.from('products').update(payload).eq('id',edit.id)
      if(error){toast.error('Erro: '+error.message);return}
      toast.success('Atualizado!')
    }else{
      const{error}=await supabase.from('products').insert(payload)
      if(error){toast.error('Erro: '+error.message);return}
      toast.success('Cadastrado!')
    }
    setModal(false);loadData()
  }

  async function del(id:string){
    if(!confirm('Remover produto?'))return
    await supabase.from('products').delete().eq('id',id)
    toast.success('Removido');loadData()
  }

  const getCat=(id:string|null)=>categories.find(c=>c.id===id)
  const mg=(p:Product)=>p.price>0?Math.round((p.price-p.cost_price)/p.price*100):0

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      {(lowStock.length>0||outStock.length>0)&&(
        <div style={{padding:'7px 16px',background:'rgba(255,170,0,0.08)',borderBottom:'1px solid rgba(255,170,0,0.2)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',flexShrink:0}}>
          <AlertTriangle size={13} color='#ffaa00'/>
          {outStock.length>0&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(255,51,51,0.15)',color:'#ff3333'}}>{outStock.length} sem estoque</span>}
          {lowStock.map(p=>(<span key={p.id} style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(255,170,0,0.15)',color:'#ffaa00'}}>{p.name} ({p.stock})</span>))}
        </div>
      )}
      <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',flexShrink:0}}>
        <Package size={18} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:24}}>PRODUTOS</h1>
        <div style={{position:'relative',flex:1,minWidth:160,maxWidth:280}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar...' style={{paddingLeft:30,fontSize:13}}/>
        </div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          <button onClick={()=>setCatFilter(null)} style={{padding:'4px 10px',borderRadius:8,border:!catFilter?'1px solid var(--neon)':'1px solid var(--border)',background:!catFilter?'var(--neon-glow)':'transparent',color:!catFilter?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12}}>Todos</button>
          {categories.map(c=>(<button key={c.id} onClick={()=>setCatFilter(c.id===catFilter?null:c.id)} style={{padding:'4px 10px',borderRadius:8,border:catFilter===c.id?'1px solid var(--neon)':'1px solid var(--border)',background:catFilter===c.id?'var(--neon-glow)':'transparent',color:catFilter===c.id?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12}}>{c.name}</button>))}
        </div>
        <button onClick={openNew} className='btn-neon-fill' style={{fontSize:12,padding:'7px 14px',marginLeft:'auto',display:'flex',alignItems:'center',gap:5}}><Plus size={13}/>NOVO</button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:(
          <div className='card' style={{overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid var(--border)',background:'var(--surface)'}}>
                {['PRODUTO','CAT','VENDA','MARGEM','ESTQ',''].map(h=><th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>{h}</th>)}
              </tr></thead>
              <tbody>{filtered.map(p=>{
                const m=mg(p)
                return(<tr key={p.id} style={{borderBottom:'1px solid rgba(26,46,26,0.5)',opacity:p.active?1:0.5}}>
                  <td style={{padding:'9px 12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:38,height:38,borderRadius:8,overflow:'hidden',background:'var(--surface)',border:'1px solid var(--border)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {p.image_url&&p.image_url.startsWith('http')?<img src={p.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>:<Package size={16} color='var(--muted)' style={{opacity:0.4}}/>}
                      </div>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{p.name}</p>
                          {p.has_sizes&&<Shirt size={11} color='#06b6d4'/>}
                        </div>
                        {p.description&&<p style={{fontSize:11,color:'var(--muted)'}}>{p.description}</p>}
                        {p.has_sizes&&(p.sizes||[]).length>0&&(
                          <div style={{display:'flex',gap:3,marginTop:2,flexWrap:'wrap'}}>
                            {(p.sizes||[]).map(s=><span key={s} style={{fontSize:9,padding:'1px 5px',borderRadius:4,background:'rgba(6,182,212,0.12)',color:'#06b6d4',fontWeight:600}}>{s}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'9px 12px',fontSize:12,color:'var(--muted)'}}>{getCat(p.category_id)?.name||'—'}</td>
                  <td style={{padding:'9px 12px',fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:'var(--neon)'}}>{fmt(p.price)}</td>
                  <td style={{padding:'9px 12px'}}><span style={{fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:20,background:m>=40?'rgba(0,255,65,0.1)':m>=25?'rgba(255,170,0,0.1)':'rgba(255,51,51,0.1)',color:m>=40?'var(--neon)':m>=25?'#ffaa00':'#ff3333'}}>{m}%</span></td>
                  <td style={{padding:'9px 12px',fontSize:12,color:p.stock===0?'#ff3333':p.stock<=(p.stock_alert??5)&&p.stock>0?'#ffaa00':'var(--muted)'}}>{p.stock===0?'⚠️ ':''}{p.stock}</td>
                  <td style={{padding:'9px 12px'}}><div style={{display:'flex',gap:5}}>
                    <button onClick={()=>openEdit(p)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={12}/></button>
                    <button onClick={()=>del(p.id)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={12}/></button>
                  </div></td>
                </tr>)
              })}</tbody>
            </table>
            {filtered.length===0&&<div style={{padding:48,textAlign:'center',color:'var(--muted)'}}><Package size={32} style={{opacity:0.2,marginBottom:8}}/><p>Nenhum produto</p></div>}
          </div>
        )}
      </div>
      {modal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:50}}>
          <div className='card' style={{width:'100%',maxWidth:560,padding:20,margin:12,border:'1px solid var(--border-bright)',borderRadius:16,maxHeight:'94vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <h2 className='font-bangers neon-text-sm' style={{fontSize:22}}>{edit?'EDITAR':'NOVO'} PRODUTO</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={18}/></button>
            </div>
            <div style={{display:'flex',gap:12,marginBottom:12}}>
              <div>
                <div onClick={()=>!uploading&&fileRef.current?.click()} style={{width:90,height:90,borderRadius:12,border:'2px dashed var(--border)',overflow:'hidden',cursor:'pointer',background:'var(--surface)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,position:'relative',flexShrink:0}}>
                  {preview?<img src={preview} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>:<><Image size={20} color='var(--muted)'/><p style={{fontSize:10,color:'var(--muted)'}}>+ Foto</p></>}
                  {uploading&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'var(--neon)',fontSize:10}}>Enviando...</p></div>}
                </div>
                <input ref={fileRef} type='file' accept='image/*' onChange={handleImg} style={{display:'none'}}/>
                {preview&&<button onClick={()=>{setPreview(null);setForm(f=>({...f,image_url:''}))}} style={{fontSize:10,color:'#ff3333',background:'none',border:'none',cursor:'pointer',marginTop:2,width:'100%',textAlign:'center'}}>Remover</button>}
              </div>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:9}}>
                <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>NOME *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder='Ex: Camiseta Básica'/></div>
                <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>DESCRIÇÃO</label><input value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder='Cor, modelo...'/></div>
                <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>CATEGORIA</label>
                  <select value={form.category_id||''} onChange={e=>setForm(f=>({...f,category_id:e.target.value||null}))}>
                    <option value=''>Sem categoria</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6}}>
                  <div><label style={{fontSize:9,color:'var(--muted)',display:'block',marginBottom:2}}>VENDA R$</label><input type='number' min='0' step='0.01' value={form.price||''} onChange={e=>setForm(f=>({...f,price:parseFloat(e.target.value)||0}))} placeholder='0,00'/></div>
                  <div><label style={{fontSize:9,color:'var(--muted)',display:'block',marginBottom:2}}>CUSTO R$</label><input type='number' min='0' step='0.01' value={form.cost_price||''} onChange={e=>setForm(f=>({...f,cost_price:parseFloat(e.target.value)||0}))} placeholder='0,00'/></div>
                  <div><label style={{fontSize:9,color:'var(--muted)',display:'block',marginBottom:2}}>ESTOQUE</label><input type='number' min='0' value={form.stock||''} onChange={e=>setForm(f=>({...f,stock:parseInt(e.target.value)||0}))} placeholder='0'/></div>
                  <div><label style={{fontSize:9,color:'var(--muted)',display:'block',marginBottom:2}}>ALERTA</label><input type='number' min='1' value={form.stock_alert??5} onChange={e=>setForm(f=>({...f,stock_alert:parseInt(e.target.value)||5}))}/></div>
                </div>
              </div>
            </div>
            {(form.price>0||form.cost_price>0)&&(
              <div style={{padding:'6px 12px',background:'var(--surface)',borderRadius:7,display:'flex',justifyContent:'space-between',marginBottom:10,fontSize:12}}>
                <span style={{color:'var(--muted)'}}>Margem</span>
                <span style={{fontWeight:700,color:form.price>0&&((form.price-form.cost_price)/form.price*100)>=40?'var(--neon)':'#ffaa00',fontFamily:'JetBrains Mono,monospace'}}>
                  {form.price>0?((form.price-form.cost_price)/form.price*100).toFixed(1):0}% — Lucro: {fmt((form.price||0)-(form.cost_price||0))}
                </span>
              </div>
            )}
            <div style={{marginBottom:14,border:form.has_sizes?'1px solid #06b6d4':'1px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
              <div onClick={()=>setForm(f=>({...f,has_sizes:!f.has_sizes,sizes:f.has_sizes?[]:f.sizes||[]}))} style={{padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',background:form.has_sizes?'rgba(6,182,212,0.06)':'var(--surface)'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <Shirt size={15} color={form.has_sizes?'#06b6d4':'var(--muted)'}/>
                  <span style={{fontSize:13,fontWeight:600,color:form.has_sizes?'#06b6d4':'var(--muted)',fontFamily:'Bangers,cursive',letterSpacing:0.5}}>PRODUTO COM TAMANHOS</span>
                  <span style={{fontSize:11,color:'var(--muted)'}}>roupas, calçados...</span>
                </div>
                <div style={{width:36,height:20,borderRadius:10,background:form.has_sizes?'#06b6d4':'#333',position:'relative',transition:'all 0.2s',flexShrink:0}}>
                  <div style={{position:'absolute',top:2,left:form.has_sizes?16:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                </div>
              </div>
              {form.has_sizes&&(
                <div style={{padding:'12px 14px',borderTop:'1px solid rgba(6,182,212,0.2)'}}>
                  <p style={{fontSize:10,color:'var(--muted)',marginBottom:7,letterSpacing:0.5}}>GRADES PRONTAS — clique para aplicar:</p>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                    {SIZE_PRESETS.map(preset=>(
                      <button key={preset.label} onClick={()=>applyPreset(preset.sizes)} style={{padding:'5px 12px',borderRadius:7,border:'1px solid var(--border)',background:'var(--card)',color:'var(--white)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',letterSpacing:0.5}}>{preset.label}</button>
                    ))}
                  </div>
                  {(form.sizes||[]).length>0&&(
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                      {(form.sizes||[]).map(s=>(
                        <button key={s} onClick={()=>toggleSize(s)} style={{padding:'6px 12px',borderRadius:8,border:'2px solid #06b6d4',background:'rgba(6,182,212,0.15)',color:'#06b6d4',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'Bangers,cursive',display:'flex',alignItems:'center',gap:5}}>
                          {s} <span style={{fontSize:14,lineHeight:1}}>×</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{display:'flex',gap:6}}>
                    <input value={newSize} onChange={e=>setNewSize(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&addCustomSize()} placeholder='Tamanho personalizado...' style={{flex:1,fontSize:13}}/>
                    <button onClick={addCustomSize} style={{padding:'7px 14px',borderRadius:7,border:'1px solid #06b6d4',background:'rgba(6,182,212,0.1)',color:'#06b6d4',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive',whiteSpace:'nowrap'}}>+ ADD</button>
                  </div>
                  {(form.sizes||[]).length===0&&<p style={{fontSize:11,color:'var(--muted)',marginTop:6}}>Clique em uma grade pronta ou adicione tamanhos acima</p>}
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={save} disabled={uploading} className='btn-neon-fill' style={{flex:2,fontSize:14}}><Check size={13} style={{display:'inline',marginRight:5}}/>{uploading?'AGUARDE...':'SALVAR'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}