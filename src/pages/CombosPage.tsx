import{useState,useEffect}from 'react'
import{Link2,Search,Plus,X,Check,Package}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'
type Product={id:string;name:string;price:number;image_url?:string}
type Combo={id:string;product_id:string;related_product_id:string;combo_price:number|null;active:boolean;product?:Product;related?:Product}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
export default function CombosPage(){
  const[products,setProducts]=useState<Product[]>([])
  const[combos,setCombos]=useState<Combo[]>([])
  const[loading,setLoading]=useState(true)
  const[selProduct,setSelProduct]=useState('')
  const[selRelated,setSelRelated]=useState('')
  const[comboPrice,setComboPrice]=useState('')
  const[search,setSearch]=useState('')
  const[saving,setSaving]=useState(false)
  useEffect(()=>{load()},[])
  async function load(){
    setLoading(true)
    const[p,c]=await Promise.all([
      supabase.from('products').select('id,name,price,image_url').eq('active',true).order('name'),
      supabase.from('product_combos').select('*').eq('active',true)
    ])
    setProducts(p.data||[])
    // Enrich combos with product names
    const prods=p.data||[]
    const enriched=(c.data||[]).map((combo:any)=>({
      ...combo,
      product:prods.find(p=>p.id===combo.product_id),
      related:prods.find(p=>p.id===combo.related_product_id)
    }))
    setCombos(enriched)
    setLoading(false)
  }
  async function addCombo(){
    if(!selProduct||!selRelated){toast.error('Selecione os dois produtos');return}
    if(selProduct===selRelated){toast.error('Produtos devem ser diferentes');return}
    const exists=combos.find(c=>c.product_id===selProduct&&c.related_product_id===selRelated)
    if(exists){toast.error('Combinação já existe');return}
    setSaving(true)
    const{error}=await supabase.from('product_combos').insert({product_id:selProduct,related_product_id:selRelated,combo_price:comboPrice?parseFloat(comboPrice):null,active:true})
    if(error){toast.error(error.message);setSaving(false);return}
    toast.success('Combo criado!')
    setSelProduct('');setSelRelated('');setComboPrice('')
    load()
    setSaving(false)
  }
  async function removeCombo(id:string){
    await supabase.from('product_combos').update({active:false}).eq('id',id)
    toast.success('Combo removido')
    load()
  }
  const filtered=combos.filter(c=>
    !search||c.product?.name.toLowerCase().includes(search.toLowerCase())||c.related?.name.toLowerCase().includes(search.toLowerCase())
  )
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10}}>
        <Link2 size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>COMBOS & RELACIONADOS</h1>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {/* Add combo */}
        <div className='card' style={{padding:'16px',marginBottom:16}}>
          <p style={{fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1,marginBottom:12}}>CRIAR NOVO COMBO</p>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
            <div style={{flex:1,minWidth:150}}>
              <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4}}>PRODUTO PRINCIPAL</label>
              <select value={selProduct} onChange={e=>setSelProduct(e.target.value)} style={{width:'100%',fontSize:13}}>
                <option value=''>Selecione...</option>
                {products.map(p=><option key={p.id} value={p.id}>{p.name} — {fmt(p.price)}</option>)}
              </select>
            </div>
            <div style={{display:'flex',alignItems:'center',padding:'0 4px',color:'var(--muted)',fontSize:18}}>+</div>
            <div style={{flex:1,minWidth:150}}>
              <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4}}>PRODUTO RELACIONADO</label>
              <select value={selRelated} onChange={e=>setSelRelated(e.target.value)} style={{width:'100%',fontSize:13}}>
                <option value=''>Selecione...</option>
                {products.filter(p=>p.id!==selProduct).map(p=><option key={p.id} value={p.id}>{p.name} — {fmt(p.price)}</option>)}
              </select>
            </div>
            <div style={{width:120}}>
              <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4}}>PREÇO COMBO (opt)</label>
              <input type='number' min='0' step='0.01' value={comboPrice} onChange={e=>setComboPrice(e.target.value)} placeholder='Ex: 49,90' style={{width:'100%',fontSize:13}}/>
            </div>
            <button onClick={addCombo} disabled={saving} className='btn-neon-fill' style={{fontSize:12,padding:'9px 16px',whiteSpace:'nowrap'}}>
              <Plus size={13} style={{display:'inline',marginRight:4}}/>ADICIONAR
            </button>
          </div>
          <p style={{fontSize:11,color:'var(--muted)',marginTop:8}}>💡 Ao vender o produto principal no PDV, o produto relacionado será sugerido automaticamente. Se tiver preço combo, aparece com desconto.</p>
        </div>
        {/* Search */}
        <div style={{position:'relative',marginBottom:12}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar combos...' style={{paddingLeft:28,fontSize:13,width:'100%'}}/>
        </div>
        {/* List */}
        {loading?<div style={{textAlign:'center',padding:32,color:'var(--muted)'}}>Carregando...</div>:
        filtered.length===0?<div style={{textAlign:'center',padding:32,color:'var(--muted)'}}><Link2 size={28} style={{opacity:0.2,marginBottom:8}}/><p>Nenhum combo cadastrado</p></div>:
        filtered.map(combo=>(
          <div key={combo.id} className='card' style={{marginBottom:8,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <div style={{flex:1,display:'flex',alignItems:'center',gap:8,minWidth:0}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{combo.product?.name||'?'}</p>
                <p style={{fontSize:11,color:'var(--muted)'}}>{fmt(combo.product?.price||0)}</p>
              </div>
              <div style={{padding:'3px 10px',borderRadius:12,background:'rgba(0,255,65,0.08)',border:'1px solid var(--neon-dim)',fontSize:11,color:'var(--neon)',fontFamily:'Bangers,cursive',flexShrink:0}}>+ COMBO</div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:'var(--white)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{combo.related?.name||'?'}</p>
                <p style={{fontSize:11,color:'var(--muted)'}}>{fmt(combo.related?.price||0)}</p>
              </div>
            </div>
            {combo.combo_price&&(
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{fontSize:12,color:'var(--muted)',textDecoration:'line-through'}}>{fmt((combo.product?.price||0)+(combo.related?.price||0))}</p>
                <p style={{fontSize:14,fontWeight:700,color:'#f59e0b',fontFamily:'JetBrains Mono,monospace'}}>{fmt(combo.combo_price)}</p>
              </div>
            )}
            <button onClick={()=>removeCombo(combo.id)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <X size={12}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}