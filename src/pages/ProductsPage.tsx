import{useState,useEffect,useRef}from 'react'
import{Package,Plus,Edit2,Trash2,X,Check,Search,Upload,ChevronDown,ChevronUp,DollarSign,TrendingUp}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'
type Category={id:string;name:string;color:string;sort_order:number}
type Variant={id?:string;name:string;stock:number;price_modifier:number;active:boolean}
type Product={id:string;name:string;description:string;price:number;cost_price:number;stock:number;category_id:string;image_url:string;active:boolean;has_sizes:boolean;stock_alert:number;is_promo:boolean;promo_price:number}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const EMPTY={name:'',description:'',price:0,cost_price:0,stock:0,category_id:'',image_url:'',active:true,has_sizes:false,stock_alert:3,is_promo:false,promo_price:0}
export default function ProductsPage(){
  const[products,setProducts]=useState<Product[]>([])
  const[categories,setCategories]=useState<Category[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[catFilter,setCatFilter]=useState('all')
  const[modal,setModal]=useState(false)
  const[editing,setEditing]=useState<Product|null>(null)
  const[form,setForm]=useState<any>({...EMPTY})
  const[variants,setVariants]=useState<Variant[]>([])
  const[saving,setSaving]=useState(false)
  const[uploading,setUploading]=useState(false)
  const[expandedId,setExpandedId]=useState<string|null>(null)
  const[variantsCache,setVariantsCache]=useState<Record<string,Variant[]>>({})
  const imgRef=useRef<HTMLInputElement>(null)
  useEffect(()=>{load()},[])
  async function load(){
    setLoading(true)
    const[p,c]=await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('categories').select('*').order('sort_order',{ascending:true}).order('name')
    ])
    setProducts(p.data||[])
    setCategories(c.data||[])
    setLoading(false)
  }
  async function loadVariants(pid:string){
    if(variantsCache[pid])return
    const{data}=await supabase.from('product_variants').select('*').eq('product_id',pid).eq('active',true).order('sort_order')
    setVariantsCache(c=>({...c,[pid]:data||[]}))
  }
  async function toggleExpand(id:string){
    if(expandedId===id){setExpanded(null);return}
    setExpandedId(id)
    loadVariants(id)
  }
  function setExpanded(id:string|null){setExpandedId(id)}
  function openNew(){setEditing(null);setForm({...EMPTY});setVariants([]);setModal(true)}
  async function openEdit(p:Product){
    setEditing(p)
    setForm({...p,cost_price:p.cost_price||0})
    const{data}=await supabase.from('product_variants').select('*').eq('product_id',p.id).eq('active',true).order('sort_order')
    setVariants((data||[]).map((v:any)=>({id:v.id,name:v.name,stock:v.stock,price_modifier:v.price_modifier||0,active:true})))
    setModal(true)
  }
  function upd(f:string,v:any){setForm((x:any)=>({...x,[f]:v}))}
  function addVariant(){setVariants(v=>[...v,{name:'',stock:0,price_modifier:0,active:true}])}
  function updVariant(i:number,f:string,v:any){setVariants(vs=>vs.map((x,j)=>j===i?{...x,[f]:v}:x))}
  function remVariant(i:number){setVariants(v=>v.filter((_,j)=>j!==i))}
  async function uploadImg(file:File){
    setUploading(true)
    try{
      const ext=file.name.split('.').pop()
      const path='prod-'+Date.now()+'.'+ext
      const{error}=await supabase.storage.from('product-images').upload(path,file,{upsert:true})
      if(error)throw error
      const{data}=supabase.storage.from('product-images').getPublicUrl(path)
      upd('image_url',data.publicUrl)
      toast.success('Imagem enviada!')
    }catch(e:any){toast.error(e.message)}
    finally{setUploading(false)}
  }
  async function save(){
    if(!form.name.trim()){toast.error('Nome obrigatório');return}
    if(!form.category_id){toast.error('Selecione a categoria');return}
    setSaving(true)
    try{
      const payload={
        name:form.name.trim(),description:form.description||'',
        price:parseFloat(form.price)||0,
        cost_price:parseFloat(form.cost_price)||0,
        stock:form.has_sizes?0:parseInt(form.stock)||0,
        category_id:form.category_id,image_url:form.image_url||'',
        active:!!form.active,has_sizes:!!form.has_sizes,
        stock_alert:parseInt(form.stock_alert)||3,
        is_promo:!!form.is_promo,
        promo_price:form.is_promo?parseFloat(form.promo_price)||0:null
      }
      let pid=editing?.id
      if(editing){
        const{error}=await supabase.from('products').update(payload).eq('id',editing.id)
        if(error)throw error
      }else{
        const{data,error}=await supabase.from('products').insert(payload).select().single()
        if(error)throw error
        pid=data.id
      }
      if(form.has_sizes&&pid){
        await supabase.from('product_variants').update({active:false}).eq('product_id',pid)
        const toInsert=variants.filter(v=>v.name.trim()).map((v,i)=>({product_id:pid,name:v.name.trim(),stock:parseInt(String(v.stock))||0,price_modifier:parseFloat(String(v.price_modifier))||0,active:true,sort_order:i}))
        if(toInsert.length>0)await supabase.from('product_variants').insert(toInsert)
        setVariantsCache(c=>{const n={...c};delete n[pid!];return n})
      }
      toast.success(editing?'Produto atualizado!':'Produto criado!')
      setModal(false);load()
    }catch(e:any){toast.error(e.message)}
    finally{setSaving(false)}
  }
  async function del(id:string){
    if(!confirm('Deletar produto?'))return
    await supabase.from('products').delete().eq('id',id)
    toast.success('Produto removido')
    load()
  }
  async function toggleActive(p:Product){
    await supabase.from('products').update({active:!p.active}).eq('id',p.id)
    setProducts(ps=>ps.map(x=>x.id===p.id?{...x,active:!p.active}:x))
  }
  const filtered=products.filter(p=>{
    if(catFilter!=='all'&&p.category_id!==catFilter)return false
    if(search&&!p.name.toLowerCase().includes(search.toLowerCase()))return false
    return true
  })
  const margin=(p:Product)=>{
    const cost=Number(p.cost_price)||0
    const price=Number(p.price)||0
    if(!cost||!price)return null
    return Math.round((price-cost)/price*100)
  }
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <Package size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>PRODUTOS</h1>
        <div style={{position:'relative',flex:1,minWidth:160,maxWidth:280}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar produto...' style={{paddingLeft:28,fontSize:13}}/>
        </div>
        <button onClick={openNew} className='btn-neon-fill' style={{fontSize:12,padding:'7px 14px',whiteSpace:'nowrap'}}>
          <Plus size={13} style={{display:'inline',marginRight:5}}/>NOVO PRODUTO
        </button>
      </div>
      <div style={{padding:'8px 20px',borderBottom:'1px solid var(--border)',background:'var(--card)',display:'flex',gap:6,overflowX:'auto',flexShrink:0}}>
        <button onClick={()=>setCatFilter('all')} style={{padding:'4px 12px',borderRadius:16,border:catFilter==='all'?'1px solid var(--neon)':'1px solid var(--border)',background:catFilter==='all'?'var(--neon-glow)':'transparent',color:catFilter==='all'?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',whiteSpace:'nowrap'}}>Todos</button>
        {categories.map(c=>(
          <button key={c.id} onClick={()=>setCatFilter(c.id)} style={{padding:'4px 12px',borderRadius:16,border:catFilter===c.id?'1px solid '+(c.color||'var(--neon)'):'1px solid var(--border)',background:catFilter===c.id?(c.color||'var(--neon)')+'18':'transparent',color:catFilter===c.id?(c.color||'var(--neon)'):'var(--muted)',cursor:'pointer',fontSize:12,fontFamily:'Bangers,cursive',whiteSpace:'nowrap'}}>{c.name}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        filtered.length===0?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}><Package size={32} style={{opacity:0.2,marginBottom:8}}/><p>Nenhum produto</p></div>:
        filtered.map(p=>{
          const cat=categories.find(c=>c.id===p.category_id)
          const vlist=variantsCache[p.id]||[]
          const totalStock=p.has_sizes?vlist.reduce((s,v)=>s+v.stock,0):p.stock
          const isExp=expandedId===p.id
          const mg=margin(p)
          return(
            <div key={p.id} className='card' style={{marginBottom:8,overflow:'hidden',opacity:p.active?1:0.5}}>
              <div style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
                {p.image_url?<img src={p.image_url} alt='' style={{width:44,height:44,borderRadius:8,objectFit:'cover',flexShrink:0}}/>
                  :<div style={{width:44,height:44,borderRadius:8,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Package size={18} color='var(--muted)'/></div>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{p.name}</p>
                    {p.has_sizes&&<span style={{fontSize:9,padding:'1px 6px',borderRadius:8,background:'rgba(124,58,237,0.15)',color:'#7c3aed',fontWeight:600}}>SABORES</span>}
                    {p.is_promo&&<span style={{fontSize:9,padding:'1px 6px',borderRadius:8,background:'rgba(245,158,11,0.15)',color:'#f59e0b',fontWeight:600}}>PROMO</span>}
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:2,alignItems:'center',flexWrap:'wrap'}}>
                    {cat&&<span style={{fontSize:10,color:cat.color||'var(--muted)',background:(cat.color||'#888')+'18',padding:'1px 6px',borderRadius:4}}>{cat.name}</span>}
                    <span style={{fontSize:11,color:'var(--muted)'}}>
                      {Number(p.cost_price)>0&&<span style={{color:'#ff8888'}}>Custo: {fmt(Number(p.cost_price))} → </span>}
                      <span style={{color:'var(--neon)',fontWeight:700}}>{fmt(Number(p.price))}</span>
                      {mg!==null&&<span style={{color:mg>=30?'#00ff41':mg>=15?'#f59e0b':'#ff5555',marginLeft:4}}>({mg}% margem)</span>}
                    </span>
                    <span style={{fontSize:11,color:totalStock<=(p.stock_alert||3)?'#ff3333':'var(--muted)'}}>estoque: {p.has_sizes?(isExp?'↓':totalStock+' total'):totalStock}</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0}}>
                  {p.has_sizes&&(
                    <button onClick={()=>toggleExpand(p.id)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {isExp?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
                    </button>
                  )}
                  <button onClick={()=>toggleActive(p)} style={{padding:'3px 8px',borderRadius:6,border:'1px solid '+(p.active?'var(--neon)':'var(--border)'),background:p.active?'rgba(0,255,65,0.08)':'transparent',color:p.active?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:9,fontFamily:'Bangers,cursive',letterSpacing:0.3}}>{p.active?'ON':'OFF'}</button>
                  <button onClick={()=>openEdit(p)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={13}/></button>
                  <button onClick={()=>del(p.id)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={13}/></button>
                </div>
              </div>
              {isExp&&p.has_sizes&&(
                <div style={{borderTop:'1px solid var(--border)',padding:'8px 14px',background:'rgba(0,0,0,0.15)'}}>
                  <p style={{fontSize:10,color:'var(--muted)',fontWeight:600,letterSpacing:0.5,marginBottom:6}}>SABORES/VARIANTES</p>
                  {(variantsCache[p.id]||[]).length===0?<p style={{fontSize:12,color:'var(--muted)'}}>Sem sabores. Clique em editar para adicionar.</p>:
                  (variantsCache[p.id]||[]).map((v,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <span style={{fontSize:12,color:'var(--white)'}}>{v.name}</span>
                      <span style={{fontSize:11,color:v.stock<=2?'#ff3333':v.stock<=5?'#ffaa00':'var(--muted)',fontFamily:'JetBrains Mono,monospace'}}>{v.stock} un</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {modal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:50,padding:16,overflowY:'auto'}}>
          <div className='card' style={{width:'100%',maxWidth:520,padding:24,border:'1px solid var(--border-bright)',marginTop:16,marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h2 className='font-bangers neon-text-sm' style={{fontSize:22}}>{editing?'EDITAR':'NOVO'} PRODUTO</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={18}/></button>
            </div>
            {/* Image */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              {form.image_url?<img src={form.image_url} alt='' style={{width:64,height:64,borderRadius:10,objectFit:'cover',border:'1px solid var(--border)'}}/>
                :<div style={{width:64,height:64,borderRadius:10,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid var(--border)'}}><Package size={24} color='var(--muted)'/></div>}
              <div style={{flex:1}}>
                <input ref={imgRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])uploadImg(e.target.files[0])}}/>
                <button onClick={()=>imgRef.current?.click()} disabled={uploading} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:12,marginBottom:6}}>
                  <Upload size={12}/>{uploading?'Enviando...':'Enviar Foto'}
                </button>
                <input value={form.image_url||''} onChange={e=>upd('image_url',e.target.value)} placeholder='ou cole URL da imagem' style={{width:'100%',fontSize:12}}/>
              </div>
            </div>
            {/* Name */}
            <div style={{marginBottom:10}}>
              <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4,fontWeight:600,letterSpacing:0.8}}>NOME DO PRODUTO *</label>
              <input value={form.name} onChange={e=>upd('name',e.target.value)} placeholder='Ex: Elfbar BC1000' autoFocus style={{width:'100%',fontSize:14}}/>
            </div>
            {/* Description */}
            <div style={{marginBottom:10}}>
              <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4,fontWeight:600,letterSpacing:0.8}}>DESCRIÇÃO</label>
              <textarea value={form.description||''} onChange={e=>upd('description',e.target.value)} placeholder='Descrição opcional...' rows={2} style={{width:'100%',fontSize:13,background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:8,padding:'8px 12px',resize:'none' as const,outline:'none',boxSizing:'border-box' as const}}/>
            </div>
            {/* Category */}
            <div style={{marginBottom:10}}>
              <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4,fontWeight:600,letterSpacing:0.8}}>CATEGORIA *</label>
              <select value={form.category_id} onChange={e=>upd('category_id',e.target.value)} style={{width:'100%',fontSize:13}}>
                <option value=''>Selecione...</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {/* PREÇO CUSTO + VENDA */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div>
                <label style={{fontSize:10,color:'#ff8888',marginBottom:4,fontWeight:600,letterSpacing:0.8,display:'flex',alignItems:'center',gap:4}}>
                  <DollarSign size={10}/> PREÇO DE CUSTO (R$)
                </label>
                <input type='number' min='0' step='0.01' value={form.cost_price||''} onChange={e=>upd('cost_price',e.target.value)} placeholder='0,00' style={{width:'100%',fontSize:13,borderColor:'rgba(255,136,136,0.3)'}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:'var(--neon)',marginBottom:4,fontWeight:600,letterSpacing:0.8,display:'flex',alignItems:'center',gap:4}}>
                  <TrendingUp size={10}/> PREÇO DE VENDA (R$) *
                </label>
                <input type='number' min='0' step='0.01' value={form.price||''} onChange={e=>upd('price',e.target.value)} placeholder='0,00' style={{width:'100%',fontSize:13}}/>
              </div>
            </div>
            {/* Margem calculada */}
            {Number(form.cost_price)>0&&Number(form.price)>0&&(()=>{
              const mg=Math.round((Number(form.price)-Number(form.cost_price))/Number(form.price)*100)
              const lucro=Number(form.price)-Number(form.cost_price)
              return(
                <div style={{padding:'8px 12px',background:'rgba(0,255,65,0.04)',border:'1px solid var(--neon-dim)',borderRadius:8,marginBottom:10,display:'flex',gap:16,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,color:'var(--muted)'}}>Lucro: <strong style={{color:lucro>0?'var(--neon)':'#ff3333'}}>{fmt(lucro)}</strong></span>
                  <span style={{fontSize:11,color:'var(--muted)'}}>Margem: <strong style={{color:mg>=30?'var(--neon)':mg>=15?'#f59e0b':'#ff3333'}}>{mg}%</strong></span>
                </div>
              )
            })()}
            {/* Promo */}
            <div style={{marginBottom:10,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
              <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,color:'var(--muted)'}}>
                <input type='checkbox' checked={!!form.is_promo} onChange={e=>upd('is_promo',e.target.checked)} style={{accentColor:'#f59e0b'}}/>
                EM PROMOÇÃO
              </label>
              {form.is_promo&&(
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <label style={{fontSize:11,color:'#f59e0b'}}>Preço promo:</label>
                  <input type='number' min='0' step='0.01' value={form.promo_price||''} onChange={e=>upd('promo_price',e.target.value)} placeholder='0,00' style={{width:100,fontSize:13}}/>
                </div>
              )}
            </div>
            {/* Has Sizes */}
            <div style={{marginBottom:14,padding:'10px 14px',background:'rgba(124,58,237,0.06)',borderRadius:10,border:'1px solid rgba(124,58,237,0.2)'}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                <div onClick={()=>upd('has_sizes',!form.has_sizes)} style={{width:40,height:22,borderRadius:11,background:form.has_sizes?'#7c3aed':'#333',position:'relative',cursor:'pointer',transition:'background 0.2s',flexShrink:0}}>
                  <div style={{position:'absolute',top:3,left:form.has_sizes?21:3,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                </div>
                <div>
                  <p style={{fontSize:12,fontWeight:600,color:form.has_sizes?'#7c3aed':'var(--muted)'}}>TEM SABORES / VARIANTES</p>
                  <p style={{fontSize:10,color:'var(--muted)'}}>Ex: Elfbar BC1000 → Morango, Menta, Uva...</p>
                </div>
              </label>
            </div>
            {/* Stock or Variants */}
            {!form.has_sizes?(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                <div>
                  <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4,fontWeight:600,letterSpacing:0.8}}>ESTOQUE</label>
                  <input type='number' min='0' value={form.stock||''} onChange={e=>upd('stock',e.target.value)} placeholder='0' style={{width:'100%',fontSize:13}}/>
                </div>
                <div>
                  <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4,fontWeight:600,letterSpacing:0.8}}>ALERTA ESTOQUE BAIXO</label>
                  <input type='number' min='0' value={form.stock_alert||''} onChange={e=>upd('stock_alert',e.target.value)} placeholder='3' style={{width:'100%',fontSize:13}}/>
                </div>
              </div>
            ):(
              <div style={{marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <label style={{fontSize:10,color:'var(--muted)',fontWeight:600,letterSpacing:0.8}}>SABORES / VARIANTES</label>
                  <button onClick={addVariant} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#7c3aed',background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>
                    <Plus size={11}/>ADICIONAR SABOR
                  </button>
                </div>
                {variants.length===0&&<p style={{fontSize:12,color:'var(--muted)',textAlign:'center',padding:'12px 0'}}>Clique em "Adicionar Sabor"</p>}
                {variants.map((v,i)=>(
                  <div key={i} style={{display:'flex',gap:6,marginBottom:6,alignItems:'center'}}>
                    <input value={v.name} onChange={e=>updVariant(i,'name',e.target.value)} placeholder='Sabor (ex: Morango Ice)' style={{flex:2,fontSize:12}}/>
                    <input type='number' min='0' value={v.stock||''} onChange={e=>updVariant(i,'stock',parseInt(e.target.value)||0)} placeholder='Qtd' style={{width:60,fontSize:12,textAlign:'center'}}/>
                    <button onClick={()=>remVariant(i)} style={{width:26,height:26,borderRadius:6,border:'none',background:'rgba(255,51,51,0.1)',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><X size={11}/></button>
                  </div>
                ))}
              </div>
            )}
            {/* Active */}
            <div style={{marginBottom:16}}>
              <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,color:'var(--muted)'}}>
                <input type='checkbox' checked={!!form.active} onChange={e=>upd('active',e.target.checked)} style={{accentColor:'var(--neon)'}}/>
                PRODUTO ATIVO (visível no catálogo e PDV)
              </label>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={save} disabled={saving} className='btn-neon-fill' style={{flex:2,fontSize:14}}>
                <Check size={13} style={{display:'inline',marginRight:5}}/>{saving?'SALVANDO...':'SALVAR PRODUTO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}