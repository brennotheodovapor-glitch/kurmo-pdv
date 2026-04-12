import{useState,useEffect,useRef}from 'react'
import{Plus,Search,Edit2,Trash2,X,Check,Image,Package,AlertTriangle,CheckSquare,Square,Pencil,Shirt,Tag}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Product={id:string;name:string;price:number;cost_price:number;stock:number;stock_alert?:number;has_sizes?:boolean;category_id:string|null;active:boolean;image_url?:string;description?:string}
type Category={id:string;name:string;color:string}
type Variant={id?:string;size:string;stock:number;active:boolean}

const SIZES=['PP','P','M','G','GG','XG','XGG','Único']
const EMPTY:Omit<Product,'id'>={name:'',price:0,cost_price:0,stock:0,category_id:null,active:true,image_url:'',description:'',has_sizes:false}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function ProductsPage(){
  const[products,setProducts]=useState<Product[]>([])
  const[categories,setCategories]=useState<Category[]>([])
  const[search,setSearch]=useState('')
  const[catFilter,setCatFilter]=useState<string|null>(null)
  const[modal,setModal]=useState(false)
  const[edit,setEdit]=useState<Product|null>(null)
  const[form,setForm]=useState<Omit<Product,'id'>>(EMPTY)
  const[variants,setVariants]=useState<Variant[]>([])
  const[uploading,setUploading]=useState(false)
  const[preview,setPreview]=useState<string|null>(null)
  const[loading,setLoading]=useState(true)
  const fileRef=useRef<HTMLInputElement>(null)
  // Bulk edit
  const[selected,setSelected]=useState<Set<string>>(new Set())
  const[bulkModal,setBulkModal]=useState(false)
  const[bulkPrice,setBulkPrice]=useState('')
  const[bulkCost,setBulkCost]=useState('')
  const[bulkStock,setBulkStock]=useState('')
  const[bulkAlert,setBulkAlert]=useState('')
  const[bulkSaving,setBulkSaving]=useState(false)

  useEffect(()=>{loadData()},[])

  async function loadData(){
    setLoading(true)
    const[p,c]=await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('categories').select('*').order('name')
    ])
    setProducts(p.data||[]);setCategories(c.data||[])
    setLoading(false)
  }

  const filtered=products.filter(p=>{
    if(catFilter&&p.category_id!==catFilter)return false
    if(search)return p.name.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const lowStockProds=products.filter(p=>p.active&&p.stock>0&&p.stock<=(p.stock_alert??5))
  const outStockProds=products.filter(p=>p.active&&p.stock===0)

  function openNew(){
    setEdit(null)
    setForm(EMPTY)
    setVariants(SIZES.map(s=>({size:s,stock:0,active:false})))
    setPreview(null);setModal(true)
  }

  async function openEdit(p:Product){
    setEdit(p)
    setForm({...p})
    setPreview(p.image_url||null)
    // Load variants if has_sizes
    if(p.has_sizes){
      const{data}=await supabase.from('product_variants').select('*').eq('product_id',p.id)
      const saved=data||[]
      setVariants(SIZES.map(s=>{
        const ex=saved.find(v=>v.size===s)
        return ex?{id:ex.id,size:s,stock:ex.stock,active:ex.active}:{size:s,stock:0,active:false}
      }))
    }else{
      setVariants(SIZES.map(s=>({size:s,stock:0,active:false})))
    }
    setModal(true)
  }

  async function handleImg(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return
    const reader=new FileReader();reader.onload=ev=>setPreview(ev.target?.result as string);reader.readAsDataURL(file)
    setUploading(true)
    try{
      const ext=file.name.split('.').pop()?.toLowerCase()||'jpg'
      const fn='products/'+Date.now()+'.'+ext
      const{error}=await supabase.storage.from('product-images').upload(fn,file,{upsert:true,contentType:file.type})
      if(error){toast.error('Upload: '+error.message);return}
      const{data:{publicUrl}}=supabase.storage.from('product-images').getPublicUrl(fn)
      setForm(f=>({...f,image_url:publicUrl}));toast.success('Foto enviada!')
    }catch(err:any){toast.error(err.message)}
    finally{setUploading(false)}
  }

  async function save(){
    if(!form.name.trim()){toast.error('Informe o nome');return}
    if(uploading){toast.error('Aguarde o upload');return}
    // If has_sizes, stock is sum of active variants
    const finalForm={...form}
    if(form.has_sizes){
      finalForm.stock=variants.filter(v=>v.active).reduce((s,v)=>s+v.stock,0)
    }
    if(edit){
      const{error}=await supabase.from('products').update(finalForm).eq('id',edit.id)
      if(error){toast.error(error.message);return}
      // Save variants
      if(form.has_sizes){
        for(const v of variants){
          if(v.id){await supabase.from('product_variants').update({stock:v.stock,active:v.active}).eq('id',v.id)}
          else if(v.active){await supabase.from('product_variants').insert({product_id:edit.id,size:v.size,stock:v.stock,active:true})}
        }
      }
      toast.success('Produto atualizado!')
    }else{
      const{data:newProd,error}=await supabase.from('products').insert(finalForm).select().single()
      if(error){toast.error(error.message);return}
      if(form.has_sizes&&newProd){
        const activeVars=variants.filter(v=>v.active)
        if(activeVars.length>0){
          await supabase.from('product_variants').insert(activeVars.map(v=>({product_id:newProd.id,size:v.size,stock:v.stock,active:true})))
        }
      }
      toast.success('Produto cadastrado!')
    }
    setModal(false);loadData()
  }

  async function del(id:string){
    if(!confirm('Remover produto?'))return
    await supabase.from('products').delete().eq('id',id)
    toast.success('Removido');loadData()
  }

  // BULK
  function toggleSelect(id:string){setSelected(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n})}
  function selectAll(){if(selected.size===filtered.length)setSelected(new Set());else setSelected(new Set(filtered.map(p=>p.id)))}

  async function applyBulk(){
    if(selected.size===0){toast.error('Selecione produtos');return}
    if(!bulkPrice&&!bulkCost&&!bulkStock&&!bulkAlert){toast.error('Preencha pelo menos um campo');return}
    setBulkSaving(true)
    const upd:any={}
    if(bulkPrice!=='')upd.price=parseFloat(bulkPrice)
    if(bulkCost!=='')upd.cost_price=parseFloat(bulkCost)
    if(bulkStock!=='')upd.stock=parseInt(bulkStock)
    if(bulkAlert!=='')upd.stock_alert=parseInt(bulkAlert)
    let errs=0
    for(const id of [...selected]){
      const{error}=await supabase.from('products').update(upd).eq('id',id)
      if(error)errs++
    }
    if(errs>0)toast.error(errs+' erros')
    else toast.success('✅ '+selected.size+' produtos atualizados!')
    setBulkSaving(false);setBulkModal(false)
    setSelected(new Set());setBulkPrice('');setBulkCost('');setBulkStock('');setBulkAlert('')
    loadData()
  }

  const getCat=(id:string|null)=>categories.find(c=>c.id===id)
  const mar=(p:Product)=>p.price>0?((p.price-p.cost_price)/p.price*100).toFixed(0):'0'

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>

      {/* Low stock alert */}
      {(lowStockProds.length>0||outStockProds.length>0)&&(
        <div style={{padding:'7px 16px',background:'rgba(255,170,0,0.08)',borderBottom:'1px solid rgba(255,170,0,0.2)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',flexShrink:0}}>
          <AlertTriangle size={13} color='#ffaa00'/>
          {outStockProds.length>0&&<span style={{fontSize:11,color:'#ff3333',fontWeight:600}}>{outStockProds.length} sem estoque: {outStockProds.map(p=>p.name).join(', ')}</span>}
          {lowStockProds.length>0&&<span style={{fontSize:11,color:'#ffaa00'}}>{lowStockProds.map(p=>p.name+' ('+p.stock+')').join(' · ')}</span>}
        </div>
      )}

      {/* Header */}
      <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',flexShrink:0}}>
        <Package size={17} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:22}}>PRODUTOS</h1>
        <div style={{position:'relative',flex:1,minWidth:140,maxWidth:240}}>
          <Search size={12} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar...' style={{paddingLeft:26,fontSize:12}}/>
        </div>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          <button onClick={()=>setCatFilter(null)} style={{padding:'3px 8px',borderRadius:7,border:!catFilter?'1px solid var(--neon)':'1px solid var(--border)',background:!catFilter?'var(--neon-glow)':'transparent',color:!catFilter?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11}}>Todos</button>
          {categories.map(c=>(<button key={c.id} onClick={()=>setCatFilter(c.id===catFilter?null:c.id)} style={{padding:'3px 8px',borderRadius:7,border:catFilter===c.id?'1px solid var(--neon)':'1px solid var(--border)',background:catFilter===c.id?'var(--neon-glow)':'transparent',color:catFilter===c.id?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11}}>{c.name}</button>))}
        </div>
        {selected.size>0&&(
          <button onClick={()=>setBulkModal(true)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:7,border:'1px solid #f59e0b',background:'rgba(245,158,11,0.1)',color:'#f59e0b',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive'}}>
            <Pencil size={12}/> EDITAR {selected.size}
          </button>
        )}
        <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
          <button onClick={selectAll} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 9px',borderRadius:7,border:'1px solid var(--border)',background:selected.size===filtered.length&&filtered.length>0?'var(--neon-glow)':'transparent',color:selected.size===filtered.length&&filtered.length>0?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11}}>
            {selected.size===filtered.length&&filtered.length>0?<CheckSquare size={12}/>:<Square size={12}/>}
            {selected.size>0?selected.size:''} SEL.
          </button>
          <button onClick={openNew} className='btn-neon-fill' style={{fontSize:12,padding:'6px 12px',display:'flex',alignItems:'center',gap:4}}>
            <Plus size={12}/>NOVO
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{flex:1,overflowY:'auto',padding:'10px 14px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:(
          <div className='card' style={{overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                <th style={{width:32,padding:'8px 12px'}}></th>
                <th style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>PRODUTO</th>
                <th style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>CAT</th>
                <th style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>VENDA</th>
                <th style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>MARGEM</th>
                <th style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>ESTQ</th>
                <th style={{padding:'8px 12px',width:70}}></th>
              </tr></thead>
              <tbody>{filtered.map(p=>(
                <tr key={p.id} style={{borderBottom:'1px solid rgba(26,46,26,0.5)',background:selected.has(p.id)?'rgba(0,255,65,0.03)':undefined}}>
                  <td style={{padding:'8px 12px',cursor:'pointer'}} onClick={()=>toggleSelect(p.id)}>
                    <div style={{color:selected.has(p.id)?'var(--neon)':'var(--muted)'}}>
                      {selected.has(p.id)?<CheckSquare size={14}/>:<Square size={14}/>}
                    </div>
                  </td>
                  <td style={{padding:'8px 12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:34,height:34,borderRadius:7,overflow:'hidden',background:'var(--surface)',border:'1px solid var(--border)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {p.image_url&&p.image_url.startsWith('http')
                          ?<img src={p.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                          :<Package size={14} color='var(--muted)' style={{opacity:0.4}}/>}
                      </div>
                      <div>
                        <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{p.name}</p>
                        <div style={{display:'flex',gap:4,marginTop:2}}>
                          {p.has_sizes&&<span style={{fontSize:9,padding:'1px 5px',borderRadius:4,background:'rgba(124,58,237,0.15)',color:'#7c3aed',fontWeight:700,display:'flex',alignItems:'center',gap:2}}><Shirt size={8}/>TAMANHOS</span>}
                          {p.description&&<p style={{fontSize:10,color:'var(--muted)'}}>{p.description}</p>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'8px 12px',fontSize:11,color:'var(--muted)'}}>{getCat(p.category_id)?.name||'—'}</td>
                  <td style={{padding:'8px 12px',fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:'var(--neon)'}}>{fmt(p.price)}</td>
                  <td style={{padding:'8px 12px'}}>
                    <span style={{fontSize:11,fontWeight:700,padding:'2px 6px',borderRadius:20,background:parseInt(mar(p))>=40?'rgba(0,255,65,0.1)':parseInt(mar(p))>=25?'rgba(255,170,0,0.1)':'rgba(255,51,51,0.1)',color:parseInt(mar(p))>=40?'var(--neon)':parseInt(mar(p))>=25?'#ffaa00':'#ff3333'}}>{mar(p)}%</span>
                  </td>
                  <td style={{padding:'8px 12px',fontSize:12,color:p.stock===0?'#ff3333':p.stock<=(p.stock_alert??5)&&p.stock>0?'#ffaa00':'var(--muted)'}}>
                    {p.stock===0&&<AlertTriangle size={10} style={{display:'inline',marginRight:2}}/>}{p.stock}
                  </td>
                  <td style={{padding:'8px 12px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>openEdit(p)} style={{width:26,height:26,borderRadius:5,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={11}/></button>
                      <button onClick={()=>del(p.id)} style={{width:26,height:26,borderRadius:5,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={11}/></button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {filtered.length===0&&<div style={{padding:40,textAlign:'center',color:'var(--muted)'}}><Package size={28} style={{opacity:0.3,marginBottom:6}}/><p>Nenhum produto</p></div>}
          </div>
        )}
      </div>

      {/* PRODUCT MODAL */}
      {modal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:50}}>
          <div className='card' style={{width:'100%',maxWidth:560,padding:20,margin:16,border:'1px solid var(--border-bright)',borderRadius:16,maxHeight:'92vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h2 className='font-bangers neon-text-sm' style={{fontSize:20}}>{edit?'EDITAR':'NOVO'} PRODUTO</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={18}/></button>
            </div>

            <div style={{display:'flex',gap:14,flexWrap:'wrap',marginBottom:14}}>
              {/* Image */}
              <div style={{flexShrink:0}}>
                <div onClick={()=>!uploading&&fileRef.current?.click()} style={{width:90,height:90,borderRadius:11,border:'2px dashed var(--border)',overflow:'hidden',cursor:'pointer',background:'var(--surface)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,position:'relative'}}>
                  {preview?<img src={preview} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>:<><Image size={20} color='var(--muted)'/><p style={{fontSize:9,color:'var(--muted)'}}>{uploading?'...':'+ Foto'}</p></>}
                </div>
                <input ref={fileRef} type='file' accept='image/*' onChange={handleImg} style={{display:'none'}}/>
                {preview&&<button onClick={()=>{setPreview(null);setForm(f=>({...f,image_url:''}))}} style={{fontSize:9,color:'#ff3333',background:'none',border:'none',cursor:'pointer',marginTop:3,display:'block',width:'100%',textAlign:'center'}}>Remover</button>}
              </div>

              {/* Fields */}
              <div style={{flex:1,minWidth:180,display:'flex',flexDirection:'column',gap:10}}>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>NOME *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder='Ex: Camiseta Básica'/></div>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>DESCRIÇÃO</label><input value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder='Descrição breve'/></div>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:3}}>CATEGORIA</label>
                  <select value={form.category_id||''} onChange={e=>setForm(f=>({...f,category_id:e.target.value||null}))}>
                    <option value=''>Sem categoria</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Prices + stock */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:14}}>
              <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:3}}>VENDA R$</label><input type='number' min='0' step='0.01' value={form.price===0?'':form.price} onChange={e=>setForm(f=>({...f,price:parseFloat(e.target.value)||0}))} placeholder='0,00'/></div>
              <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:3}}>CUSTO R$</label><input type='number' min='0' step='0.01' value={form.cost_price===0?'':form.cost_price} onChange={e=>setForm(f=>({...f,cost_price:parseFloat(e.target.value)||0}))} placeholder='0,00'/></div>
              {!form.has_sizes&&<div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:3}}>ESTOQUE</label><input type='number' min='0' value={form.stock===0?'':form.stock} onChange={e=>setForm(f=>({...f,stock:parseInt(e.target.value)||0}))} placeholder='0'/></div>}
              <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:3}}>ALERTA</label><input type='number' min='1' value={(form as any).stock_alert||''} onChange={e=>setForm(f=>({...f,stock_alert:parseInt(e.target.value)||5}))} placeholder='5'/></div>
            </div>

            {/* Margem preview */}
            {form.price>0&&form.cost_price>0&&(
              <div style={{padding:'6px 10px',background:'var(--surface)',borderRadius:7,marginBottom:14,fontSize:12,display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'var(--muted)'}}>Margem</span>
                <span style={{fontWeight:700,color:((form.price-form.cost_price)/form.price*100)>=40?'var(--neon)':'#ffaa00'}}>
                  {((form.price-form.cost_price)/form.price*100).toFixed(1)}% · Lucro: {fmt(form.price-form.cost_price)}
                </span>
              </div>
            )}

            {/* SIZES TOGGLE */}
            <div style={{padding:'12px 14px',background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:form.has_sizes?12:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <Shirt size={15} color={form.has_sizes?'#7c3aed':'var(--muted)'}/>
                  <span style={{fontSize:13,fontWeight:600,color:form.has_sizes?'#7c3aed':'var(--muted)',fontFamily:'Bangers,cursive',letterSpacing:0.5}}>PRODUTO COM TAMANHOS</span>
                  <span style={{fontSize:10,color:'var(--muted)'}}>(roupas, calçados...)</span>
                </div>
                <button onClick={()=>setForm(f=>({...f,has_sizes:!f.has_sizes}))} style={{padding:'4px 12px',borderRadius:20,border:'none',background:form.has_sizes?'#7c3aed':'var(--border)',color:form.has_sizes?'#fff':'var(--muted)',cursor:'pointer',fontSize:11,fontWeight:700,transition:'all 0.2s'}}>
                  {form.has_sizes?'ATIVO':'INATIVO'}
                </button>
              </div>
              {form.has_sizes&&(
                <div>
                  <p style={{fontSize:10,color:'var(--muted)',marginBottom:8}}>Ative os tamanhos disponíveis e informe o estoque de cada um:</p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                    {variants.map((v,i)=>(
                      <div key={v.size} style={{padding:'8px',borderRadius:8,border:v.active?'1px solid #7c3aed':'1px solid var(--border)',background:v.active?'rgba(124,58,237,0.08)':'var(--card)',transition:'all 0.15s'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:v.active?6:0}}>
                          <span style={{fontSize:13,fontWeight:700,color:v.active?'#7c3aed':'var(--muted)',fontFamily:'Bangers,cursive'}}>{v.size}</span>
                          <button onClick={()=>setVariants(vs=>vs.map((x,j)=>j===i?{...x,active:!x.active}:x))} style={{width:20,height:20,borderRadius:'50%',border:'none',background:v.active?'#7c3aed':'var(--border)',color:v.active?'#fff':'var(--muted)',cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
                            {v.active?'✓':'○'}
                          </button>
                        </div>
                        {v.active&&(
                          <input type='number' min='0' value={v.stock===0?'':v.stock} onChange={e=>setVariants(vs=>vs.map((x,j)=>j===i?{...x,stock:parseInt(e.target.value)||0}:x))} placeholder='Qtd' style={{width:'100%',fontSize:12,padding:'4px 6px',textAlign:'center'}}/>
                        )}
                      </div>
                    ))}
                  </div>
                  <p style={{fontSize:10,color:'var(--muted)',marginTop:6}}>Estoque total = soma dos tamanhos ativos</p>
                </div>
              )}
            </div>

            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:13}}>CANCELAR</button>
              <button onClick={save} className='btn-neon-fill' style={{flex:2,fontSize:13}} disabled={uploading}>
                <Check size={12} style={{display:'inline',marginRight:4}}/>{uploading?'AGUARDE...':'SALVAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK EDIT MODAL */}
      {bulkModal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:420,padding:22,border:'1px solid #f59e0b',boxShadow:'0 0 24px rgba(245,158,11,0.12)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <h2 className='font-bangers' style={{fontSize:20,color:'#f59e0b'}}>EDIÇÃO EM MASSA</h2>
              <button onClick={()=>setBulkModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={16}/></button>
            </div>
            <p style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>
              Alterando <strong style={{color:'#f59e0b'}}>{selected.size} produto(s)</strong>. Deixe em branco o que não alterar.
            </p>
            {/* Preview */}
            <div style={{maxHeight:80,overflowY:'auto',background:'var(--surface)',borderRadius:7,padding:'6px 10px',marginBottom:14,border:'1px solid var(--border)'}}>
              {[...selected].map(id=>{const p=products.find(x=>x.id===id);return p?<p key={id} style={{fontSize:10,color:'var(--muted)',padding:'1px 0'}}>{p.name}</p>:null})}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>PREÇO DE VENDA (R$)</label>
                <input type='number' min='0' step='0.01' value={bulkPrice} onChange={e=>setBulkPrice(e.target.value)} placeholder='Ex: 75,00'/>
              </div>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>CUSTO (R$)</label>
                <input type='number' min='0' step='0.01' value={bulkCost} onChange={e=>setBulkCost(e.target.value)} placeholder='Ex: 40,00'/>
              </div>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>ESTOQUE</label>
                <input type='number' min='0' value={bulkStock} onChange={e=>setBulkStock(e.target.value)} placeholder='Ex: 10'/>
              </div>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>ALERTA ESTOQUE MÍN</label>
                <input type='number' min='1' value={bulkAlert} onChange={e=>setBulkAlert(e.target.value)} placeholder='Ex: 3'/>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setBulkModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:13}}>CANCELAR</button>
              <button onClick={applyBulk} disabled={bulkSaving} style={{flex:2,padding:10,borderRadius:8,border:'none',background:'#f59e0b',color:'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14,opacity:bulkSaving?0.7:1}}>
                {bulkSaving?'SALVANDO...':'APLICAR EM '+selected.size+' PRODUTO(S)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}