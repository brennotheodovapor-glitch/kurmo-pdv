import{useState,useEffect}from 'react'
import{Tag,Plus,Trash2,Edit2,X,Check,Copy,ToggleLeft,ToggleRight}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Coupon={id:string;code:string;discount_type:'percent'|'fixed';discount_value:number;min_order:number;max_uses:number|null;used_count:number;active:boolean;expires_at:string|null;created_at:string}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const EMPTY={code:'',discount_type:'percent' as const,discount_value:10,min_order:0,max_uses:null as number|null,active:true,expires_at:null as string|null}

export default function CouponsPage(){
  const[coupons,setCoupons]=useState<Coupon[]>([])
  const[loading,setLoading]=useState(true)
  const[modal,setModal]=useState(false)
  const[edit,setEdit]=useState<Coupon|null>(null)
  const[form,setForm]=useState(EMPTY)
  const[saving,setSaving]=useState(false)

  useEffect(()=>{load()},[]) 

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('coupons').select('*').order('created_at',{ascending:false})
    setCoupons(data||[])
    setLoading(false)
  }

  function openNew(){setEdit(null);setForm(EMPTY);setModal(true)}
  function openEdit(c:Coupon){setEdit(c);setForm({code:c.code,discount_type:c.discount_type as 'percent'|'fixed',discount_value:c.discount_value,min_order:c.min_order,max_uses:c.max_uses,active:c.active,expires_at:c.expires_at});setModal(true)}

  async function save(){
    if(!form.code.trim()){toast.error('Informe o codigo');return}
    if(form.discount_value<=0){toast.error('Desconto deve ser maior que 0');return}
    setSaving(true)
    const payload={...form,code:form.code.trim().toUpperCase()}
    if(edit){
      const{error}=await supabase.from('coupons').update(payload).eq('id',edit.id)
      if(error){toast.error(error.message);setSaving(false);return}
      toast.success('Cupom atualizado!')
    }else{
      const{error}=await supabase.from('coupons').insert(payload)
      if(error){toast.error(error.message);setSaving(false);return}
      toast.success('Cupom criado!')
    }
    setSaving(false);setModal(false);load()
  }

  async function toggle(c:Coupon){
    await supabase.from('coupons').update({active:!c.active}).eq('id',c.id)
    toast.success(c.active?'Cupom desativado':'Cupom ativado!')
    load()
  }

  async function del(id:string){
    if(!confirm('Remover cupom?'))return
    await supabase.from('coupons').delete().eq('id',id)
    toast.success('Removido');load()
  }

  function copyCode(code:string){
    navigator.clipboard.writeText(code)
    toast.success('Codigo copiado: '+code)
  }

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10}}>
        <Tag size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>CUPONS DE DESCONTO</h1>
        <button onClick={openNew} className='btn-neon-fill' style={{marginLeft:'auto',fontSize:13,padding:'8px 16px',display:'flex',alignItems:'center',gap:6}}>
          <Plus size={14}/>NOVO CUPOM
        </button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        coupons.length===0?(
          <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}><Tag size={40} style={{opacity:0.3,marginBottom:12}}/><p style={{fontFamily:'Bangers,cursive',fontSize:18,marginBottom:6}}>NENHUM CUPOM</p><p style={{fontSize:12}}>Crie cupons de desconto para usar no PDV</p></div>
        ):(
          <div className='card' style={{overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid var(--border)',background:'var(--surface)'}}>
                {['CODIGO','DESCONTO','USO MINIMO','USOS','VALIDADE','STATUS',''].map(h=>(
                  <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {coupons.map(c=>(
                  <tr key={c.id} style={{borderBottom:'1px solid rgba(26,46,26,0.4)',opacity:c.active?1:0.5}}>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,color:'var(--neon)',letterSpacing:1}}>{c.code}</span>
                        <button onClick={()=>copyCode(c.code)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',padding:2,borderRadius:4}}><Copy size={11}/></button>
                      </div>
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      <span style={{fontSize:15,fontWeight:700,color:c.discount_type==='percent'?'#06b6d4':'#10b981',fontFamily:'JetBrains Mono,monospace'}}>
                        {c.discount_type==='percent'?c.discount_value+'%':fmt(c.discount_value)}
                      </span>
                    </td>
                    <td style={{padding:'10px 14px',fontSize:12,color:'var(--muted)'}}>{c.min_order>0?fmt(c.min_order):'Sem minimo'}</td>
                    <td style={{padding:'10px 14px',fontSize:12,color:'var(--muted)'}}>{c.used_count}{c.max_uses?'/'+c.max_uses:''}</td>
                    <td style={{padding:'10px 14px',fontSize:12,color:c.expires_at&&new Date(c.expires_at)<new Date()?'#ff3333':'var(--muted)'}}>{c.expires_at?new Date(c.expires_at).toLocaleDateString('pt-BR'):'Sem validade'}</td>
                    <td style={{padding:'10px 14px'}}>
                      <button onClick={()=>toggle(c)} style={{background:'none',border:'none',cursor:'pointer',color:c.active?'var(--neon)':'var(--muted)',display:'flex',alignItems:'center',gap:4,fontSize:11,fontFamily:'Bangers,cursive'}}>
                        {c.active?<ToggleRight size={20} color='var(--neon)'/>:<ToggleLeft size={20} color='var(--muted)'/>}
                        {c.active?'ATIVO':'INATIVO'}
                      </button>
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',gap:5}}>
                        <button onClick={()=>openEdit(c)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={12}/></button>
                        <button onClick={()=>del(c.id)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal&&(
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='card' style={{width:'100%',maxWidth:440,padding:24,border:'1px solid var(--border-bright)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <h2 className='font-bangers neon-text-sm' style={{fontSize:20}}>{edit?'EDITAR':'NOVO'} CUPOM</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={18}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>CODIGO DO CUPOM *</label>
                <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder='EX: DESCONTO10' style={{fontFamily:'JetBrains Mono,monospace',fontSize:16,letterSpacing:2,textTransform:'uppercase'}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>TIPO</label>
                  <select value={form.discount_type} onChange={e=>setForm(f=>({...f,discount_type:e.target.value as any}))}>
                    <option value='percent'>Porcentagem (%)</option>
                    <option value='fixed'>Valor fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>VALOR *</label>
                  <input type='number' min='0.01' step={form.discount_type==='percent'?'1':'0.01'} value={form.discount_value===0?'':form.discount_value} onChange={e=>setForm(f=>({...f,discount_value:parseFloat(e.target.value)||0}))} placeholder={form.discount_type==='percent'?'10':'5.00'}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>PEDIDO MINIMO (R$)</label>
                  <input type='number' min='0' step='0.01' value={form.min_order===0?'':form.min_order} onChange={e=>setForm(f=>({...f,min_order:parseFloat(e.target.value)||0}))} placeholder='0,00'/>
                </div>
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>MAX. USOS (vazio = ilimitado)</label>
                  <input type='number' min='1' value={form.max_uses===null?'':form.max_uses} onChange={e=>setForm(f=>({...f,max_uses:e.target.value===''?null:parseInt(e.target.value)||null}))} placeholder='Ilimitado'/>
                </div>
              </div>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>VALIDADE (vazio = sem validade)</label>
                <input type='date' value={form.expires_at?form.expires_at.substring(0,10):''} onChange={e=>setForm(f=>({...f,expires_at:e.target.value||null}))}/>
              </div>
              {form.discount_value>0&&(
                <div style={{padding:'8px 12px',background:'var(--neon-glow)',borderRadius:8,border:'1px solid var(--neon-dim)',fontSize:12,color:'var(--neon)',display:'flex',justifyContent:'space-between'}}>
                  <span>Preview do desconto</span>
                  <strong>{form.discount_type==='percent'?form.discount_value+'% de desconto':'R$ '+form.discount_value.toFixed(2)+' de desconto'}</strong>
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:10,marginTop:18}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:11,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={save} disabled={saving} className='btn-neon-fill' style={{flex:2,fontSize:14}}>
                <Check size={13} style={{display:'inline',marginRight:5}}/>{saving?'SALVANDO...':'SALVAR CUPOM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}