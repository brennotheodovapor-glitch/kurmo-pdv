import{useState,useEffect}from 'react'
import{MapPin,Plus,Edit2,Trash2,X,Check,Clock,DollarSign}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

type Zone={id:string;name:string;fee:number;min_time:number;max_time:number;active:boolean}
const EMPTY={name:'',fee:0,min_time:30,max_time:60,active:true}
const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function DeliveryZonesPage(){
  const[zones,setZones]=useState<Zone[]>([])
  const[loading,setLoading]=useState(true)
  const[modal,setModal]=useState(false)
  const[edit,setEdit]=useState<Zone|null>(null)
  const[form,setForm]=useState(EMPTY)

  useEffect(()=>{load()},[]) 

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('delivery_zones').select('*').order('name')
    setZones(data||[])
    setLoading(false)
  }

  function openC(){setEdit(null);setForm(EMPTY);setModal(true)}
  function openE(z:Zone){setEdit(z);setForm({name:z.name,fee:z.fee,min_time:z.min_time,max_time:z.max_time,active:z.active});setModal(true)}

  async function save(){
    if(!form.name.trim()){toast.error('Informe o nome do bairro');return}
    if(edit){
      const{error}=await supabase.from('delivery_zones').update(form).eq('id',edit.id)
      if(error){toast.error('Erro: '+error.message);return}
      toast.success('Bairro atualizado!')
    }else{
      const{error}=await supabase.from('delivery_zones').insert(form)
      if(error){toast.error('Erro: '+error.message);return}
      toast.success('Bairro cadastrado!')
    }
    setModal(false);load()
  }

  async function del(id:string){
    if(!confirm('Remover bairro?'))return
    await supabase.from('delivery_zones').delete().eq('id',id)
    toast.success('Removido');load()
  }

  async function toggleActive(z:Zone){
    await supabase.from('delivery_zones').update({active:!z.active}).eq('id',z.id)
    load()
  }

  const totalZones=zones.length
  const avgFee=totalZones>0?zones.reduce((s,z)=>s+z.fee,0)/totalZones:0

  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <MapPin size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>BAIRROS E FRETES</h1>
        <span style={{fontSize:12,color:'var(--muted)',background:'var(--card)',padding:'4px 10px',borderRadius:20}}>{totalZones} bairros</span>
        <button onClick={openC} className='btn-neon-fill' style={{marginLeft:'auto',fontSize:13,padding:'8px 16px'}}>
          <Plus size={14} style={{display:'inline',marginRight:6}}/>NOVO BAIRRO
        </button>
      </div>

      {totalZones>0&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,padding:'16px 20px 0',maxWidth:900}}>
          {[
            {label:'Total de bairros',value:String(totalZones),color:'#06b6d4'},
            {label:'Frete medio',value:fmt(avgFee),color:'#00ff41'},
            {label:'Bairros ativos',value:String(zones.filter(z=>z.active).length),color:'#10b981'},
          ].map((k,i)=>(
            <div key={i} className='card' style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
              <div>
                <p style={{fontSize:20,fontWeight:700,color:k.color,fontFamily:'JetBrains Mono,monospace'}}>{k.value}</p>
                <p style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        zones.length===0?(
          <div style={{textAlign:'center',padding:64,color:'var(--muted)'}}>
            <MapPin size={48} style={{marginBottom:16,opacity:0.3}}/>
            <p style={{fontFamily:'Bangers,cursive',fontSize:18,letterSpacing:1}}>NENHUM BAIRRO CADASTRADO</p>
            <p style={{fontSize:13,marginTop:8,maxWidth:300,margin:'8px auto 0'}}>Cadastre os bairros que voce atende com o valor do frete de cada um.</p>
          </div>
        ):(
          <div className='card' style={{overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                {['BAIRRO','FRETE','TEMPO ESTIMADO','STATUS',''].map(h=>(
                  <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {zones.map(z=>(
                  <tr key={z.id} style={{borderBottom:'1px solid rgba(26,46,26,0.5)',opacity:z.active?1:0.5}}>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:z.active?'var(--neon)':'var(--muted)',flexShrink:0}}/>
                        <p style={{fontSize:14,fontWeight:600,color:'var(--white)'}}>{z.name}</p>
                      </div>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{fontSize:16,fontWeight:700,color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>
                        {z.fee===0?'Gratis':fmt(z.fee)}
                      </span>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:13,color:'var(--muted)',display:'flex',alignItems:'center',gap:5}}>
                      <Clock size={13}/>{z.min_time}–{z.max_time} min
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <button onClick={()=>toggleActive(z)} style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:20,border:'none',background:z.active?'rgba(0,255,65,0.1)':'rgba(100,116,139,0.15)',color:z.active?'var(--neon)':'var(--muted)',cursor:'pointer'}}>
                        {z.active?'ATIVO':'INATIVO'}
                      </button>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>openE(z)} style={{width:30,height:30,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Edit2 size={13}/></button>
                        <button onClick={()=>del(z.id)} style={{width:30,height:30,borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'#ff3333',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={13}/></button>
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
        <div className='animate-fade-in' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div className='animate-slide-in card' style={{width:'100%',maxWidth:440,padding:24,border:'1px solid var(--border-bright)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 className='font-bangers neon-text-sm' style={{fontSize:22}}>{edit?'EDITAR':'NOVO'} BAIRRO</h2>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>NOME DO BAIRRO</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder='Ex: Centro, Jardim Botanico...'/>
              </div>
              <div>
                <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>TAXA DE ENTREGA (R$)</label>
                <div style={{position:'relative'}}>
                  <input type='number' min='0' step='0.50' value={form.fee===0?'':form.fee} onChange={e=>setForm(f=>({...f,fee:e.target.value===''?0:parseFloat(e.target.value)||0}))} placeholder='0,00'/>
                  <DollarSign size={14} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--neon)'}}/>
                </div>
                <p style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Digite 0 para entrega gratis</p>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>TEMPO MIN (min)</label>
                  <input type='number' min='0' value={form.min_time===0?'':form.min_time} onChange={e=>setForm(f=>({...f,min_time:e.target.value===''?0:parseInt(e.target.value)||0}))} placeholder='30'/>
                </div>
                <div>
                  <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>TEMPO MAX (min)</label>
                  <input type='number' min='0' value={form.max_time===0?'':form.max_time} onChange={e=>setForm(f=>({...f,max_time:e.target.value===''?0:parseInt(e.target.value)||0}))} placeholder='60'/>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--surface)',borderRadius:8}}>
                <input type='checkbox' id='zone_active' checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))} style={{width:16,height:16,accentColor:'var(--neon)'}}/>
                <label htmlFor='zone_active' style={{fontSize:13,color:'var(--text)',cursor:'pointer'}}>Bairro ativo para entrega</label>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:14}}>CANCELAR</button>
              <button onClick={save} className='btn-neon-fill' style={{flex:2,fontSize:14}}>
                <Check size={13} style={{display:'inline',marginRight:5}}/>SALVAR BAIRRO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}