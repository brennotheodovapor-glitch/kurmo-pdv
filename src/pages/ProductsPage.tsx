import { useState, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, X, Check, Image, Package, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Product = { id:string; name:string; price:number; cost_price:number; stock:number; category:string; active:boolean; image_url?:string; description?:string }
const CATS = ['Descartaveis','Vapes','Liquids','Pods','Acessorios']
const INIT: Product[] = [
  {id:'1',name:'Lost Mary 600 Puffs',price:45,cost_price:20,stock:30,category:'Descartaveis',active:true,description:'600 puffs, sabores variados'},
  {id:'2',name:'Elfbar BC5000',price:120,cost_price:60,stock:15,category:'Descartaveis',active:true,description:'5000 puffs recarregavel'},
  {id:'3',name:'Uwell Caliburn G3',price:180,cost_price:90,stock:8,category:'Vapes',active:true},
  {id:'4',name:'Salt Nic Mango 30ml',price:35,cost_price:15,stock:50,category:'Liquids',active:true},
  {id:'5',name:'Pod Caliburn A3',price:95,cost_price:45,stock:12,category:'Pods',active:true},
]
const EMPTY: Omit<Product,'id'> = {name:'',price:0,cost_price:0,stock:0,category:'Descartaveis',active:true,image_url:'',description:''}
const fmt = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const EMO: Record<string,string> = {Descartaveis:'\u26a1',Vapes:'\ud83d\udca8',Liquids:'\ud83d\udca7',Pods:'\ud83d\udd0b',Acessorios:'\ud83d\udd27'}
export default function ProductsPage() {
  const [products,setProducts] = useState(INIT)
  const [search,setSearch] = useState('')
  const [catF,setCatF] = useState<string|null>(null)
  const [modal,setModal] = useState(false)
  const [edit,setEdit] = useState<Product|null>(null)
  const [form,setForm] = useState<Omit<Product,'id'>>(EMPTY)
  const [upl,setUpl] = useState(false)
  const [prev,setPrev] = useState<string|null>(null)
  const fRef = useRef<HTMLInputElement>(null)
  const filt = products.filter(p=>{ if(catF&&p.category!==catF)return false; if(search)return p.name.toLowerCase().includes(search.toLowerCase()); return true })
  const openC = ()=>{setEdit(null);setForm(EMPTY);setPrev(null);setModal(true)}
  const openE = (p:Product)=>{setEdit(p);setForm({...p});setPrev(p.image_url||null);setModal(true)}
  const handleImg = async (e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file)return
    const r=new FileReader(); r.onload=ev=>setPrev(ev.target?.result as string); r.readAsDataURL(file)
    setUpl(true)
    try{
      const ext=file.name.split('.').pop()
      const fn='products/'+Date.now()+'.'+ext
      const {data,error}=await supabase.storage.from('product-images').upload(fn,file,{upsert:true})
      if(!error&&data){
        const {data:{publicUrl}}=supabase.storage.from('product-images').getPublicUrl(fn)
        setForm(f=>({...f,image_url:publicUrl})); toast.success('Foto enviada!')
      } else { toast('Foto carregada localmente') }
    } catch { toast('Preview local') } finally { setUpl(false) }
  }
  const save = ()=>{
    if(!form.name.trim()){toast.error('Nome obrigatorio');return}
    if(edit){setProducts(p=>p.map(i=>i.id===edit.id?{...i,...form}:i));toast.success('Atualizado!')}
    else{setProducts(p=>[...p,{...form,id:crypto.randomUUID()}]);toast.success('Cadastrado!')}
    setModal(false)
  }
  const del=(id:string)=>{setProducts(p=>p.filter(i=>i.id!==id));toast.success('Removido')}
  const mar=(p:Product)=>p.price>0?((p.price-p.cost_price)/p.price*100).toFixed(0):'0'
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <Package size={20} color="var(--neon)"/>
        <h1 className="font-bangers neon-text-sm" style={{fontSize:26}}>PRODUTOS</h1>
        <div style={{position:'relative',flex:1,maxWidth:280}}>
          <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar produto..." style={{paddingLeft:32}}/>
        </div>
        <div style={{display:'flex',gap:6}}>
          {CATS.map(c=>(<button key={c} onClick={()=>setCatF(c===catF?null:c)} style={{padding:'6px 12px',borderRadius:8,border:catF===c?'1px solid var(--neon)':'1px solid var(--border)',background:catF===c?'var(--neon-glow)':'transparent',color:catF===c?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12}}>{EMO[c]} {c}</button>))}
        </div>
        <button onClick={openC} className="btn-neon-fill" style={{marginLeft:'auto',fontSize:13,padding:'8px 16px'}}>
          <Plus size={14} style={{display:'inline',marginRight:6}}/>NOVO PRODUTO
        </button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        <div className="card" style={{overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                {['PRODUTO','CAT','PRECO','CUSTO','MARGEM','ESTOQUE','STATUS',''].map(h=>(<th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>{h}</th>))}
            </tr></thead>
            <tbody>{filt.map(p=>(<tr key={p.id} style={{borderBottom:'1px solid rgba(26,46,26,0.5)'}}>
              <td style={{padding:'10px 14px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  {p.image_url?(<img src={p.image_url} alt={p.name} style={{width:36,height:36,borderRadius:8,objectFit:'cover',border:'1px solid var(--border)'}}/>):(<div style={{width:36,height:36,borderRadius:8,background:'var(--surface)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{EMO[p.category]||'\ud83d\udce6'}</div>)}
                  <div><p style={{fontSize:13,fontWeight:600,color:'var(--white)'}}>{p.name}</p>{p.description&&<p style={{fontSize:11,color:'var(--muted)'}}>{p.description}</p>}</div>
                </div>
              </td>
              <td style={{padding:'10px 14px',fontSize:12,color:'var(--muted)'}}>{p.category}</td>
              <td style={{padding:'10px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:'var(--neon)'}}>{fmt(p.price)}</td>
              <td style={{padding:'10px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--muted)'}}>{fmt(p.cost_price)}</td>
              <td style={{padding:'10px 14px'}}><span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:20,background:parseInt(mar(p))>=40?'rgba(0,255,65,0.1)':parseInt(mar(p))>=25?'rgba(255,170,0,0.1)':'rgba(255,51,51,0.1)',color:parseInt(mar(p))>=40?'var(--neon)':parseInt(mar(p))>=25?'#ffaa00':'#ff3333'}}>{mar(p)}%</span></td>
              <td style={{padding:'10px 14px',fontSize:12,color:p.stock===0?'#ff3333':p.stock<=5?'#ffaa00':'var(--muted)'}}>{p.stock<=5&&p.stock>0&&<AlertTriangle size={12} style={{display:'inline',marginRight:3}}/>}{p.stock} un</td>
              <td style={{padding:'10px 14px'}}><span style={{fontSize:11,padding:'3px 8px',borderRadius:20,background:p.active?'rgba(0,255,65,0.1)':'rgba(77,122,77,0.1)',color:p.active?'var(--neon)':'var(--muted)'}}>{p.active?'ATIVO':'INATIVO'}</span></td>
              <td style={{padding:'10px 14px'}}><div style={{display:'flex',gap:6}}>
                <button onClick={()=>openE(p)} style={{width:30,height:30,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={13}/></button>
                <button onClick={()=>del(p.id)} style={{width:30,height:30,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={13}/></button>
              </div></td>
            </tr>))}</tbody>
          </table>
          {filt.length===0&&<div style={{padding:48,display:'flex',flexDirection:'column',alignItems:'center',color:'var(--muted)'}}><Package size={32} style={{marginBottom:8,opacity:0.4}}/><p style={{fontSize:13}}>Nenhum produto encontrado</p></div>}
        </div>
      </div>
      {modal&&(
        <div className="animate-fade-in" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div className="animate-slide-in card" style={{width:'100%',maxWidth:520,padding:28,margin:16,border:'1px solid var(--border-bright)',boxShadow:'0 0 40px rgba(0,255,65,0.15)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 className="font-bangers neon-text-sm" style={{fontSize:24}}>{edit?'EDITAR':'NOVO'} PRODUTO</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'flex',gap:16}}>
              <div style={{flexShrink:0}}>
                <div onClick={()=>fRef.current?.click()} style={{width:100,height:100,borderRadius:12,border:'2px dashed var(--border)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',background:'var(--surface)'}}>
                 {prev?<img src={prev} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(<><Image size={24} color="var(--muted)" style={{marginBottom:4}}/><p style={{fontSize:10,color:'var(--muted)',textAlign:'center'}}>{upl?'Enviando...':'+ Foto'}</p></>)}
                </div>
                <input ref={fRef} type="file" accept="image/*" onChange={handleImg} style={{display:'none'}}/>
                {prev&&<button onClick={()=>{setPrev(null);setForm(f=>({...f,image_url:''}))}} style={{fontSize:10,color:'#ff3333',background:'none',border:'none',cursor:'pointer',width:'100%',marginTop:4}}>Remover</button>}
              </div>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:12}}>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>NOME</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Elfbar BC5000"/></div>
                <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>DESCRIC@</label><input value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Descricao do produto"/></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>PRECO VENDA</label><input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:parseFloat(e.target.value)||0}))}/></div>
                  <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>PRECO CUSTO</label><input type="number" value={form.cost_price} onChange={e=>setForm(f=>({...f,cost_price:parseFloat(e.target.value)||0}))}/></div>
                  <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>ESTOQUE</label><input type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:parseInt(e.target.value)||0}))}/></div>
                  <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>CATEGORIA</label><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                </div>
              </div>
            </div>
            {form.price>0&&form.cost_price>0&&(<div style={{marginTop:12,padding:'10px 14px',background:'var(--surface)',borderRadius:8,display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:12,color:'var(--muted)'}}>Margem de lucro</span>
              <span style={{fontSize:13,fontWeight:700,color:((form.price-form.cost_price)/form.price*100)>=40?'var(--neon)':'#ffaa00',fontFamily:'JetBrains Mono,monospace'}}>{((form.price-form.cost_price)/form.price*100).toFixed(1)}% - Lucro: {fmt(form.price-form.cost_price)}</span>
            </div>)}
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,coursive',fontSize:15}}>CANCELAR</button>
              <button onClick={save} className="btn-neon-fill" style={{flex:2,fontSize:15}}><Check size={14} style={{display:'inline',marginRight:6}}/>SALVAR PRODUTO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
