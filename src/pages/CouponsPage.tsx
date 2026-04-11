import{useState,useEffect}from 'react'
import{Tag,Plus,Edit2,Trash2,Check,X,ToggleLeft,ToggleRight}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const EMPTY={code:'',discount_type:'percent',discount_value:'',min_order:'',max_uses:'',expires_at:'',active:true}

export default function CouponsPage(){
  const[coupons,setCoupons]=useState<any[]>([])
  const[loading,setLoading]=useState(true)
  const[modal,setModal]=useState(false)
  const[editing,setEditing]=useState<any|null>(null)
  const[form,setForm]=useState<any>(EMPTY)
  const[saving,setSaving]=useState(false)

  useEffect(()=>{load()},[]) 

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('coupons').select('*').order('created_at',{ascending:false})
    setCoupons(data||[]);setLoading(false)
  }

  function openNew(){setEditing(null);setForm(EMPTY);setModal(true)}
  function openEdit(c:any){setEditing(c);setForm({...c,discount_value:String(c.discount_value),min_order:c.min_order?String(c.min_order):'',max_uses:c.max_uses?String(c.max_uses):'',expires_at:c.expires_at?c.expires_at.split('T')[0]:''});setModal(true)}

  async function save(){
    if(!form.code.trim()){toast.error('Informe o codigo do cupom');return}
    if(!form.discount_value||parseFloat(form.discount_value)<=0){toast.error('Informe o desconto');return}
    setSaving(true)
    const payload={
      code:form.code.toUpperCase().trim(),
      discount_type:form.discount_type,
      discount_value:parseFloat(form.discount_value),
      min_order:form.min_order?parseFloat(form.min_order):null,
      max_uses:form.max_uses?parseInt(form.max_uses):null,
      expires_at:form.expires_at?new Date(form.expires_at+'T23:59:59').toISOString():null,
      active:form.active
    }
    if(editing){
      const{error}=await supabase.from('coupons').update(payload).eq('id',editing.id)
      if(error){toast.error(error.message);setSaving(false);return}
      toast.success('Cupom atualizado!')
    }else{
      const{error}=await supabase.from('coupons').insert(payload)
      if(error){toast.error(error.message);setSaving(false);return}
      toast.success('Cupom criado!')
    }
    setModal(false);setSaving(false);load()
  }

  async function toggle(c:any){
    await supabase.from('coupons').update({active:!c.active}).eq('id',c.id)
    load()
  }

  async function del(id:string){
    if(!confirm('Remover este cupom?'))return
    await supabase.from('coupons').delete().eq('id',id)
    toast.success('Cupom removido');load()
  }

  const sf=(k:string,v:any)=>setForm((f:any)=>({...f,[k]:v}))

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12}}>
        <Tag size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>CUPONS DE DESCONTO</h1>
        <button onClick={openNew} className='btn-neon-fill' style={{marginLeft:'auto',fontSize:13,padding:'8px 16px'}}>
          <Plus size={14} style={{display:'inline',marginRight:6}}/>NOVO CUPOM
        </button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        coupons.length===0?(
          <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}><Tag size={48} style={{opacity:0.3,marginBottom:12}}/><p style={{fontFamily:'Bangers,cursive',fontSize:18}}>NENHUM CUPOM</p><p style={{fontSize:13,marginTop:6}}>Crie cupons de desconto para usar no PDV e Catalogo.</p></div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
            {coupons.map(c=>(
              <div key={c.id} className='card' style={{padding:'16px',opacity:c.active?1:0.6,borderTop:'3px solid '+(c.active?'var(--neon)':'var(--border)')}}> 
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                  <div>
                    <p style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:'var(--neon)',letterSpacing:2}}>{c.code}</p>
                    <p style={{fontSize:13,color:'var(--white)',marginTop:3}}>
                      {c.discount_type==='percent'?c.discount_value+'% de desconto':fmt(c.discount_value)+' de desconto'}
                    </p>
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <button onClick={()=>toggle(c)} style={{background:'none',border:'none',cursor:'pointer',color:c.active?'var(--neon)':'var(--muted)',padding:2}}>
                      {c.active?<ToggleRight size={22}/>:<ToggleLeft size={22}/>}
                    </button>
                    <button onClick={()=>openEdit(c)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',padding:2}}><Edit2 size={14}/></button>
                    <button onClick={()=>del(c.id)} style={{background:'none',border:'none',color:'#ff3333',cursor:'pointer',padding:2}}><Trash2 size={14}/></button>
                  </div>
                </div>
                <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                  {c.min_order>0&&<span style={{fontSize:11,color:'var(--muted)'}}>Min: {fmt(c.min_order)}</span>}
                  {c.max_uses&&<span style={{fontSize:11,color:'var(--muted)'}}>Uso: {c.used_count||0}/{c.max_uses}</span>}
                  {!c.max_uses&&<span style={{fontSize:11,color:'var(--muted)'}}>Usos: {c.used_count||0}</span>}
                  {c.expires_at&&<span style={{fontSize:11,color:new Date(c.expires_at)<new Date()?'#ff3333':'var(--muted)'}}>Exp: {new Date(c.expires_at).toLocaleDateString('pt-BR')}</span>}
                </div>
                <div style={{marginTop:8,padding:'4px 8px',borderRadius:6,background:c.active?'rgba(0,255,65,0.08)':'rgba(255,51,51,0.08)',display:'inline-block'}}>
                  <span style={{fontSize:10,fontWeight:700,color:c.active?'var(--neon)':'#ff3333',fontFamily:'Bangers,cursive'}}>{c.active?'ATIVO':'INATIVO'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:440,padding:24,border:'1px solid var(--border-bright)',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <h2 className='font-bangers neon-text-sm' style={{fontSize:20}}>{editing?'EDITAR CUPOM':'NOVO CUPOM'}</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={18}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>CODIGO DO CUPOM *</label>
                <input value={form.code} onChange={e=>sf('code',e.target.value.toUpperCase())} placeholder='EX: PROMO10' style={{fontSize:15,fontFamily:'JetBrains Mono,monospace',letterSpacing:2,textTransform:'uppercase' as const}} disabled={!!editing}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>TIPO DE DESCONTO</label>
                <div style={{display:'flex',gap:8}}>
                  {[{k:'percent',l:'Porcentagem (%)'},{k:'fixed',l:'Valor fixo (R$)'}].map(t=>(
                    <button key={t.k} onClick={()=>sf('discount_type',t.k)} style={{flex:1,padding:'8px',borderRadius:8,border:form.discount_type===t.k?'1px solid var(--neon)':'1px solid var(--border)',background:form.discount_type===t.k?'var(--neon-glow)':'transparent',color:form.discount_type===t.k?'var(--neon)':'var(--muted)',cursor:'pointer',fontSize:12}}>{t.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>VALOR DO DESCONTO * {form.discount_type==='percent'?'(%)':'(R$)'}</label>
                <input type='number' min='0' step={form.discount_type==='percent'?'1':'0.01'} value={form.discount_value} onChange={e=>sf('discount_value',e.target.value)} placeholder={form.discount_type==='percent'?'10':'15.00'} style={{fontSize:16}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>PEDIDO MINIMO (R$)</label>
                  <input type='number' min='0' step='0.01' value={form.min_order} onChange={e=>sf('min_order',e.target.value)} placeholder='Sem minimo'/>
                </div>
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>LIMITE DE USOS</label>
                  <input type='number' min='1' value={form.max_uses} onChange={e=>sf('max_uses',e.target.value)} placeholder='Ilimitado'/>
                </div>
              </div>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>VALIDADE</label>
                <input type='date' value={form.expires_at} onChange={e=>sf('expires_at',e.target.value)}/>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--surface)',borderRadius:8}}>
                <span style={{fontSize:13,color:'var(--text)',flex:1}}>Cupom ativo</span>
                <button onClick={()=>sf('active',!form.active)} style={{background:'none',border:'none',cursor:'pointer',color:form.active?'var(--neon)':'var(--muted)',padding:0}}>
                  {form.active?<ToggleRight size={26}/>:<ToggleLeft size={26}/>}
                </button>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:18}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={save} disabled={saving} className='btn-neon-fill' style={{flex:2,fontSize:15}}>{saving?'SALVANDO...':'SALVAR CUPOM'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}