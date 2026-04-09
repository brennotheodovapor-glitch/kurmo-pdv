import{useState,useEffect,useRef}from 'react'
import{Plus,Search,Edit2,Trash2,X,Check,Image,Package,AlertTriangle}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'
type Product={id:string;name:string;price:number;cost_price:number;stock:number;category_id:string|null;active:boolean;image_url?:string;description?:string}
type Category={id:string;name:string;icon:string;color:string}
const EMPTY:Omit<Product,'id'>={name:'',price:0,cost_price:0,stock:0,category_id:null,active:true,image_url:'',description:''}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
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
  const fileRef=useRef<HTMLInputElement>(null)
  useEffect(()=>{loadData()},[])
  async function loadData(){
    setLoading(true)
    const[p,c]=await Promise.all([supabase.from('products').select('*').order('name'),supabase.from('categories').select('*').order('name')])
    setProducts(p.data||[]);setCategories(c.data||[]);setLoading(false)
  }
  const filtered=products.filter(p=>{
    if(catFilter&&p.category_id!==catFilter)return false
    if(search)return p.name.toLowerCase().includes(search.toLowerCase())
    return true
  })
  const openC=()=>{setEdit(null);setForm(EMPTY);setPreview(null);setModal(true)}
  const openE=(p:Product)=>{setEdit(p);setForm({...p});setPreview(p.image_url||null);setModal(true)}
  async function handleImg(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return
    const r=new FileReader();r.onload=ev=>setPreview(ev.target?.result as string);r.readAsDataURL(file)
    setUploading(true)
    try{
      const ext=file.name.split('.').pop()
      const fn='products/'+Date.now()+'.'+ext
      const{data,error}=await supabase.storage.from('product-images').upload(fn,file,{upsert:true})
      if(!error&&data){
        const{data:{publicUrl}}=supabase.storage.from('product-images').getPublicUrl(fn)
        setForm(f=>({...f,image_url:publicUrl}));toast.success('Foto enviada!')
      }
    }catch{}finally{setUploading(false)}
  }
  async function save(){
    if(!form.name.trim()){toast.error('Nome obrigatorio');return}
    if(edit){const{error}=await supabase.from('products').update(form).eq('id',edit.id);if(error){toast.error(error.message);return};toast.success('Atualizado!')}
    else{const{error}=await supabase.from('products').insert(form);if(error){toast.error(error.message);return};toast.success('Cadastrado!')}
    setModal(false);loadData()
  }
  async function del(id:string){if(!confirm('Remover?'))return;await supabase.from('products').delete().eq('id',id);toast.success('Removido');loadData()}
  const getCat=(id:string|null)=>categories.find(c=>c.id===id)
  const mar=(p:Product)=>p.price>0?((p.price-p.cost_price)/p.price*100).toFixed(0):'0'
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <Package size={18} color="var(--neon)"/>
        <h1 className="font-bangers neon-text-sm" style={{fontSize:24}}>PRODUTOS</h1>
        <div style={{position:'relative',flex:1,minWidth:160,maxWidth:280}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{paddingLeft:30,fontSize:13}}/>
        </div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          <button onClick={()=>setCatFilter(null)} style={{padding:'4px 9px',borderRadius:8,border:!catFilter?'1px solid var(--neon)':'1px solid var(--border)',background:!catFilter?'var(--neon-glow)':'transparent',color:!catFilter?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11}}>Todos</button>
          {categories.map(c=><button key={c.id} onClick={()=>setCatFilter(c.id===catFilter?null:c.id)} style={{padding:'4px 9px',borderRadius:8,border:catFilter===c.id?'1px solid var(--neon)':'1px solid var(--border)',background:catFilter===c.id?'var(--neon-glow)':'transparent',color:catFilter===c.id?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:11}}></button>)}
        </div>
        <button onClick={openC} className="btn-neon-fill" style={{fontSize:12,padding:'7px 14px'}}><Plus size={13} style={{display:'inline',marginRight:5}}/>NOVO</button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'14px 16px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:(
          <div className="card" style={{overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>PRODUTO</th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}} className="hide-mobile">CAT</th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>PRECO</th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}} className="hide-mobile">MARGEM</th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}>ESTOQUE</th>
                <th style={{padding:'9px 12px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600}}></th>
              </tr></thead>
              <tbody>{filtered.map(p=>(
                <tr key={p.id} style={{borderBottom:'1px solid rgba(26,46,26,0.5)'}}>
                  <td style={{padding:'9px 12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:9}}>
                      {p.image_url?<img src={p.image_url} alt={p.name} style={{width:34,height:34,borderRadius:7,objectFit:'cover',border:'1px solid var(--border)',flexShrink:0}}/>:<div style={{width:34,height:34,borderRadius:7,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{getCat(p.category_id)?.icon||'ð¦'}</div>}
                      <p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{p.name}</p>
                    </div>
                  </td>
                  <td style={{padding:'9px 12px',fontSize:12,color:'var(--muted)'}} className="hide-mobile">{getCat(p.category_id)?.name||'â'}</td>
                  <td style={{padding:'9px 12px',fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:'var(--neon)'}}>{fmt(p.price)}</td>
                  <td style={{padding:'9px 12px'}} className="hide-mobile"><span style={{fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:20,background:parseInt(mar(p))>=40?'rgba(0,255,65,0.1)':parseInt(mar(p))>=25?'rgba(255,170,0,0.1)':'rgba(255,51,51,0.1)',color:parseInt(mar(p))>=40?'var(--neon)':parseInt(mar(p))>=25?'#ffaa00':'#ff3333'}}>{mar(p)}%</span></td>
                  <td style={{padding:'9px 12px',fontSize:12,color:p.stock===0?'#ff3333':p.stock<=5?'#ffaa00':'var(--muted)'}}>{p.stock===0&&<AlertTriangle size={11} style={{display:'inline',marginRight:3}}/>}{p.stock}</td>
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
        <div className="animate-fade-in" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:50}}>
          <div className="animate-slide-in card modal-card" style={{width:'100%',maxWidth:520,padding:24,border:'1px solid var(--border-bright)',borderRadius:'16px 16px 0 0',maxHeight:'92vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h2 className="font-bangers neon-text-sm" style={{fontSize:22}}>{edit?'EDITAR':'NOVO'} PRODUTO</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
              <div style={{flexShrink:0}}>
                <div onClick={()=>fileRef.current?.click()} style={{width:90,height:90,borderRadius:12,border:'2px dashed var(--border)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',background:'var(--surface)'}}>
                  {preview?<img src={preview} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<><Image size={22} color="var(--muted)"/><p style={{fontSize:10,color:'var(--muted)',marginTop:4}}>{uploading?'Enviando...':'Foto'}</p></>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{display:'none'}}/>
              </div>
              <div style={{flex:1,minWidth:200,display:'flex',flexDirection:'column',gap:10}}>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>NOME</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nome do produto"/></div>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:4}}>CATEGORIA</label>
                  <select value={form.category_id||''} onChange={e=>setForm(f=>({...f,category_id:e.target.value||null}))}>
                    <option value="">Sem categoria</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:3}}>VENDA R$</label><input type="number" value={form.price===0?'':form.price} onChange={e=>setForm(f=>({...f,price:e.target.value===''?0:parseFloat(e.target.value)||0}))} placeholder="0,00"/></div>
                  <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:3}}>CUSTO R$</label><input type="number" value={form.cost_price===0?'':form.cost_price} onChange={e=>setForm(f=>({...f,cost_price:e.target.value===''?0:parseFloat(e.target.value)||0}))} placeholder="0,00"/></div>
                  <div><label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:3}}>ESTOQUE</label><input type="number" value={form.stock===0?'':form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value===''?0:parseInt(e.target.value)||0}))} placeholder="0"/></div>
                </div>
              </div>
            </div>
            {form.price>0&&form.cost_price>0&&(
              <div style={{marginTop:10,padding:'8px 12px',background:'var(--surface)',borderRadius:8,display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:12,color:'var(--muted)'}}>Margem</span>
                <span style={{fontSize:13,fontWeight:700,color:((form.price-form.cost_price)/form.price*100)>=40?'var(--neon)':'#ffaa00',fontFamily:'JetBrains Mono,monospace'}}>{((form.price-form.cost_price)/form.price*100).toFixed(1)}% â Lucro: {fmt(form.price-form.cost_price)}</span>
              </div>
            )}
            <div style={{display:'flex',gap:10,marginTop:14}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={save} className="btn-neon-fill" style={{flex:2,fontSize:14}}><Check size={13} style={{display:'inline',marginRight:5}}/>SALVAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}