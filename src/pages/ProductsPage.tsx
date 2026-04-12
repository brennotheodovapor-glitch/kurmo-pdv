import{useState,useEffect,useRef}from 'react'
import{Plus,Search,Edit2,Trash2,X,Check,Image,Package,AlertTriangle,Shirt}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Product={id:string;name:string;price:number;cost_price:number;stock:number;stock_alert?:number;category_id:string|null;active:boolean;image_url?:string;description?:string;has_sizes?:boolean;sizes?:string[]}
type Category={id:string;name:string;color:string}

const EMPTY={name:'',price:0,cost_price:0,stock:0,stock_alert:5,category_id:null as string|null,active:true,image_url:'',description:'',has_sizes:false,sizes:[] as string[]}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const SIZES_PRESET=['PP','P','M','G','GG','XGG','36','37','38','39','40','41','42','43','P/M','M/G','Único']

export default function ProductsPage(){
  const[products,setProducts]=useState<Product[]>([])
  const[categories,setCategories]=useState<Category[]>([])
  const[search,setSearch]=useState('')
  const[catFilter,setCatFilter]=useState<string|null>(null)
  const[modal,setModal]=useState(false)
  const[edit,setEdit]=useState<Product|null>(null)
  const[form,setForm]=useState(EMPTY)
  const[uploading,setUploading]=useState(false)
  const[preview,setPreview]=useState<string|null>(null)
  const[loading,setLoading]=useState(true)
  const[customSize,setCustomSize]=useState('')
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

  const lowStockProducts=products.filter(p=>p.active&&p.stock>0&&p.stock<=(p.stock_alert??5))
  const outOfStockProducts=products.filter(p=>p.active&&p.stock===0)

  const openC=()=>{setEdit(null);setForm(EMPTY);setPreview(null);setCustomSize('');setModal(true)}
  const openE=(p:Product)=>{
    setEdit(p)
    setForm({
      name:p.name,price:p.price,cost_price:p.cost_price,stock:p.stock,
      stock_alert:p.stock_alert??5,category_id:p.category_id,active:p.active,
      image_url:p.image_url||'',description:p.description||'',
      has_sizes:p.has_sizes||false,sizes:p.sizes||[]
    })
    setPreview(p.image_url||null)
    setCustomSize('')
    setModal(true)
  }

  async function handleImg(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return
    const reader=new FileReader();reader.onload=ev=>setPreview(ev.target?.result as string);reader.readAsDataURL(file)
    setUploading(true)
    try{
      const ext=file.name.split('.').pop()?.toLowerCase()||'jpg'
      const fileName='products/'+Date.now()+'.'+ext
      const{error}=await supabase.storage.from('product-images').upload(fileName,file,{upsert:true,contentType:file.type})
      if(error){toast.error('Erro upload: '+error.message);return}
      const{data:{publicUrl}}=supabase.storage.from('product-images').getPublicUrl(fileName)
      setForm(f=>({...f,image_url:publicUrl}));toast.success('Foto enviada!')
    }catch(err:any){toast.error('Erro: '+err.message)}
    finally{setUploading(false)}
  }

  function toggleSize(size:string){
    setForm(f=>({...f,sizes:f.sizes.includes(size)?f.sizes.filter(s=>s!==size):[...f.sizes,size]}))
  }

  function addCustomSize(){
    const s=customSize.trim().toUpperCase()
    if(!s)return
    if(!form.sizes.includes(s))setForm(f=>({...f,sizes:[...f.sizes,s]}))
    setCustomSize('')
  }

  async function save(){
    if(!form.name.trim()){toast.error('Nome obrigatório');return}
    if(uploading){toast.error('Aguarde o upload');return}
    if(form.has_sizes&&form.sizes.length===0){toast.error('Adicione pelo menos um tamanho');return}
    
    const payload:any={
      name:form.name,
      description:form.description||'',
      price:form.price,
      cost_price:form.cost_price,
      stock:form.stock,
      stock_alert:form.stock_alert??5,
      category_id:form.category_id,
      active:form.active,
      image_url:form.image_url||'',
      has_sizes:form.has_sizes,
      sizes:form.has_sizes?form.sizes:[]
    }

    if(edit){
      const{error}=await supabase.from('products').update(payload).eq('id',edit.id)
      if(error){toast.error('Erro: '+error.message);return}
      toast.success('Produto atualizado!')
    }else{
      const{error}=await supabase.from('products').insert(payload)
      if(error){toast.error('Erro: '+error.message);return}
      toast.success('Produto cadastrado!')
    }
    setModal(false);loadData()
  }

  async function del(id:string){
    if(!confirm('Remover produto?'))return
    await supabase.from('products').delete().eq('id',id)
    toast.success('Removido');loadData()
  }

  const getCat=(id:string|null)=>categories.find(c=>c.id===id)
  const mar=(p:Product)=>p.price>0?((p.price-p.cost_price)/p.price*100).toFixed(0):'0'

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>

      {(lowStockProducts.length>0||outOfStockProducts.length>0)&&(
        <div style={{padding:'7px 16px',background:'rgba(255,170,0,0.08)',borderBottom:'1px solid rgba(255,170,0,0.2)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',flexShrink:0}}>
          <AlertTriangle size={13} color='#ffaa00'/>
          {outOfStockProducts.length>0&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(255,51,51,0.15)',color:'#ff3333'}}>{outOfStockProducts.length} sem estoque</span>}
          {lowStockProducts.map(p=>(<span key={p.id} style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(255,170,0,0.15)',color:'#ffaa00'}}>{p.name} ({p.stock})</span>))}
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
        <button onClick={openC} className='btn-neon-fill' style={{fontSize:12,padding:'7px 14px',marginLeft:'auto',display:'flex',alignItems:'center',gap:5}}>
          <Plus size={13}/>NOVO
        </button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'12px 14px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:(
          <div className='card' style={{overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>PRODUTO</th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>CAT</th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>PRECO</th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>MARGEM</th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>ESTQ</th>
                <th style={{padding:'9px 12px',width:70}}></th>
              </tr></thead>
              <tbody>{filtered.map(p=>(
                <tr key={p.id} style={{borderBottom:'1px solid rgba(26,46,26,0.5)'}}>
                  <td style={{padding:'9px 12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:36,height:36,borderRadius:8,overflow:'hidden',background:'var(--surface)',border:'1px solid var(--border)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {p.image_url&&p.image_url.startsWith('http')
                          ?<img src={p.image_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                          :<Package size={16} color='var(--muted)' style={{opacity:0.4}}/>
                        }
                      </div>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{p.name}</p>
                          {p.has_sizes&&<Shirt size={11} color='#06b6d4' title='Produto com tamanhos'/>}
                        </div>
                        {p.description&&<p style={{fontSize:11,color:'var(--muted)'}}>{p.description}</p>}
                        {p.has_sizes&&p.sizes&&p.sizes.length>0&&(
                          <div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:3}}>
                            {p.sizes.map(s=><span key={s} style={{fontSize:9,padding:'1px 5px',borderRadius:4,background:'rgba(6,182,212,0.1)',color:'#06b6d4'}}>{s}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'9px 12px',fontSize:12,color:'var(--muted)'}}>{getCat(p.category_id)?.name||'—'}</td>
                  <td style={{padding:'9px 12px',fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:'var(--neon)'}}>{fmt(p.price)}</td>
                  <td style={{padding:'9px 12px'}}>
                    <span style={{fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:20,background:parseInt(mar(p))>=40?'rgba(0,255,65,0.1)':parseInt(mar(p))>=25?'rgba(255,170,0,0.1)':'rgba(255,51,51,0.1)',color:parseInt(mar(p))>=40?'var(--neon)':parseInt(mar(p))>=25?'#ffaa00':'#ff3333'}}>{mar(p)}%</span>
                  </td>
                  <td style={{padding:'9px 12px',fontSize:12,color:p.stock===0?'#ff3333':p.stock<=(p.stock_alert??5)&&p.stock>0?'#ffaa00':'var(--muted)'}}>
                    {p.stock===0&&<AlertTriangle size={10} style={{display:'inline',marginRight:3}}/>}{p.stock}
                  </td>
                  <td style={{padding:'9px 12px'}}>
                    <div style={{display:'flex',gap:5}}>
                      <button onClick={()=>openE(p)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={12}/></button>
                      <button onClick={()=>del(p.id)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={12}/></button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {filtered.length===0&&<div style={{padding:48,textAlign:'center',color:'var(--muted)'}}><Package size={32} style={{opacity:0.3,marginBottom:8}}/><p>Nenhum produto</p></div>}
          </div>
        )}
      </div>

      {modal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:50}}>
          <div className='card' style={{width:'100%',maxWidth:540,padding:22,margin:16,border:'1px solid var(--border-bright)',borderRadius:16,maxHeight:'92vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h2 className='font-bangers neon-text-sm' style={{fontSize:22}}>{edit?'EDITAR':'NOVO'} PRODUTO</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={20}/></button>
            </div>

            <div style={{display:'flex',gap:14,flexWrap:'wrap',marginBottom:14}}>
              <div style={{flexShrink:0}}>
                <div onClick={()=>!uploading&&fileRef.current?.click()} style={{width:96,height:96,borderRadius:12,border:'2px dashed var(--border)',overflow:'hidden',cursor:uploading?'wait':'pointer',background:'var(--surface)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,position:'relative'}}>
                  {preview&&preview.length>0
                    ?<img src={preview} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>
                    :<><Image size={22} color='var(--muted)'/><p style={{fontSize:10,color:'var(--muted)',textAlign:'center'}}>{uploading?'Enviando...':'+ Foto'}</p></>
                  }
                  {uploading&&<div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'var(--neon)',fontSize:11}}>Enviando...</p></div>}
                </div>
                <input ref={fileRef} type='file' accept='image/*' onChange={handleImg} style={{display:'none'}}/>
                {preview&&<button onClick={()=>{setPreview(null);setForm(f=>({...f,image_url:''}))}} style={{fontSize:10,color:'#ff3333',background:'none',border:'none',cursor:'pointer',marginTop:3,display:'block',width:'100%',textAlign:'center'}}>Remover</button>}
              </div>

              <div style={{flex:1,minWidth:180,display:'flex',flexDirection:'column',gap:10}}>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>NOME *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder='Ex: Camiseta Nike'/></div>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>DESCRIÇÃO</label><input value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder='Descrição breve'/></div>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>CATEGORIA</label>
                  <select value={form.category_id||''} onChange={e=>setForm(f=>({...f,category_id:e.target.value||null}))}>
                    <option value=''>Sem categoria</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:7}}>
                  <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>VENDA R$</label><input type='number' min='0' step='0.01' value={form.price===0?'':form.price} onChange={e=>setForm(f=>({...f,price:parseFloat(e.target.value)||0}))} placeholder='0,00'/></div>
                  <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>CUSTO R$</label><input type='number' min='0' step='0.01' value={form.cost_price===0?'':form.cost_price} onChange={e=>setForm(f=>({...f,cost_price:parseFloat(e.target.value)||0}))} placeholder='0,00'/></div>
                  <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>ESTOQUE</label><input type='number' min='0' value={form.stock===0?'':form.stock} onChange={e=>setForm(f=>({...f,stock:parseInt(e.target.value)||0}))} placeholder='0'/></div>
                  <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:2}}>ALERTA</label><input type='number' min='1' value={form.stock_alert===5?'':form.stock_alert} onChange={e=>setForm(f=>({...f,stock_alert:parseInt(e.target.value)||5}))} placeholder='5'/></div>
                </div>
              </div>
            </div>

            {form.price>0&&form.cost_price>0&&(
              <div style={{padding:'7px 12px',background:'var(--surface)',borderRadius:8,display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:13}}>
                <span style={{color:'var(--muted)'}}>Margem de lucro</span>
                <span style={{fontWeight:700,color:((form.price-form.cost_price)/form.price*100)>=40?'var(--neon)':'#ffaa00',fontFamily:'JetBrains Mono,monospace'}}>
                  {((form.price-form.cost_price)/form.price*100).toFixed(1)}% — Lucro: {fmt(form.price-form.cost_price)}
                </span>
              </div>
            )}

            {/* TAMANHOS TOGGLE */}
            <div style={{marginBottom:14,padding:'12px 14px',background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:form.has_sizes?12:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <Shirt size={15} color={form.has_sizes?'#06b6d4':'var(--muted)'}/>
                  <span style={{fontSize:13,fontWeight:600,color:form.has_sizes?'#06b6d4':'var(--muted)',fontFamily:'Bangers,cursive',letterSpacing:0.5}}>PRODUTO COM TAMANHOS</span>
                  <span style={{fontSize:10,color:'var(--muted)'}}>(roupas, calçados...)</span>
                </div>
                <button onClick={()=>setForm(f=>({...f,has_sizes:!f.has_sizes,sizes:f.has_sizes?[]:f.sizes}))} style={{padding:'4px 12px',borderRadius:20,border:form.has_sizes?'1px solid #06b6d4':'1px solid var(--border)',background:form.has_sizes?'rgba(6,182,212,0.1)':'transparent',color:form.has_sizes?'#06b6d4':'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:'Bangers,cursive'}}>
                  {form.has_sizes?'ATIVO':'INATIVO'}
                </button>
              </div>
              {form.has_sizes&&(
                <div>
                  <p style={{fontSize:10,color:'var(--muted)',marginBottom:8}}>Clique nos tamanhos para adicionar/remover:</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
                    {SIZES_PRESET.map(s=>(
                      <button key={s} onClick={()=>toggleSize(s)} style={{padding:'4px 10px',borderRadius:7,border:form.sizes.includes(s)?'1px solid #06b6d4':'1px solid var(--border)',background:form.sizes.includes(s)?'rgba(6,182,212,0.15)':'transparent',color:form.sizes.includes(s)?'#06b6d4':'var(--muted)',cursor:'pointer',fontSize:12,fontWeight:form.sizes.includes(s)?700:400}}>
                        {s}{form.sizes.includes(s)?' ✓':''}
                      </button>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <input value={customSize} onChange={e=>setCustomSize(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&addCustomSize()} placeholder='Tamanho personalizado (ex: XL, 44...)' style={{flex:1,fontSize:12}}/>
                    <button onClick={addCustomSize} style={{padding:'6px 12px',borderRadius:7,border:'1px solid var(--border)',background:'var(--card)',color:'var(--muted)',cursor:'pointer',fontSize:12}}>+ Add</button>
                  </div>
                  {form.sizes.length>0&&(
                    <div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:4}}>
                      {form.sizes.map(s=>(
                        <span key={s} style={{fontSize:12,padding:'3px 8px',borderRadius:6,background:'rgba(6,182,212,0.1)',color:'#06b6d4',display:'flex',alignItems:'center',gap:4}}>
                          {s}
                          <button onClick={()=>toggleSize(s)} style={{background:'none',border:'none',color:'#06b6d4',cursor:'pointer',padding:0,fontSize:12,lineHeight:1}}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={save} className='btn-neon-fill' style={{flex:2,fontSize:14}} disabled={uploading}>
                <Check size={13} style={{display:'inline',marginRight:5}}/>{uploading?'AGUARDE...':'SALVAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}