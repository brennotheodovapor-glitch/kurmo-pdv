import{useState,useEffect}from 'react'
import{Clock,Check,Store}from 'lucide-react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'
type Day={id:number;day_of_week:number;is_open:boolean;open_time:string;close_time:string}
const DAYS=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
export default function SchedulePage(){
  const[days,setDays]=useState<Day[]>([])
  const[loading,setLoading]=useState(true)
  const[saving,setSaving]=useState(false)
  useEffect(()=>{load()},[])
  async function load(){
    const{data}=await supabase.from('store_schedule').select('*').order('day_of_week')
    setDays(data||[])
    setLoading(false)
  }
  function update(idx:number,field:string,value:any){
    setDays(d=>d.map((day,i)=>i===idx?{...day,[field]:value}:day))
  }
  async function save(){
    setSaving(true)
    try{
      for(const d of days){
        const{error}=await supabase.from('store_schedule').update({is_open:d.is_open,open_time:d.open_time,close_time:d.close_time}).eq('id',d.id)
        if(error)throw error
      }
      toast.success('Horários salvos!')
    }catch(e:any){toast.error(e.message)}
    finally{setSaving(false)}
  }
  // Check if currently open
  const now=new Date()
  const todaySchedule=days.find(d=>d.day_of_week===now.getDay())
  const currentTime=now.toTimeString().substring(0,5)
  const isOpenNow=todaySchedule?.is_open&&currentTime>=todaySchedule.open_time&&currentTime<=todaySchedule.close_time
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10}}>
        <Clock size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>AGENDA & HORÁRIOS</h1>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,padding:'6px 14px',borderRadius:20,background:isOpenNow?'rgba(0,255,65,0.1)':'rgba(255,51,51,0.1)',border:'1px solid '+(isOpenNow?'var(--neon)':'#ff3333')}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:isOpenNow?'var(--neon)':'#ff3333'}}/>
          <span style={{fontSize:12,color:isOpenNow?'var(--neon)':'#ff3333',fontFamily:'Bangers,cursive',letterSpacing:1}}>{isOpenNow?'ABERTO AGORA':'FECHADO AGORA'}</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px',maxWidth:560}}>
        <p style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>Configure os dias e horários em que o catálogo aceita pedidos. Fora do horário o cliente verá "Fechado".</p>
        {loading?<div style={{color:'var(--muted)',textAlign:'center',padding:32}}>Carregando...</div>:
        days.map((d,i)=>(
          <div key={d.id} className='card' style={{marginBottom:8,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <div style={{width:80,flexShrink:0}}>
              <p style={{fontSize:13,fontWeight:600,color:d.is_open?'var(--white)':'var(--muted)'}}>{DAYS[d.day_of_week]}</p>
            </div>
            {/* Toggle */}
            <button onClick={()=>update(i,'is_open',!d.is_open)} style={{width:44,height:24,borderRadius:12,background:d.is_open?'var(--neon)':'#333',border:'none',cursor:'pointer',position:'relative',flexShrink:0,transition:'background 0.2s'}}>
              <div style={{position:'absolute',top:3,left:d.is_open?21:3,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
            </button>
            {d.is_open?(
              <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                <label style={{fontSize:11,color:'var(--muted)'}}>Abre</label>
                <input type='time' value={d.open_time} onChange={e=>update(i,'open_time',e.target.value)} style={{fontSize:13,padding:'4px 8px',width:90}}/>
                <label style={{fontSize:11,color:'var(--muted)'}}>Fecha</label>
                <input type='time' value={d.close_time} onChange={e=>update(i,'close_time',e.target.value)} style={{fontSize:13,padding:'4px 8px',width:90}}/>
              </div>
            ):(
              <span style={{fontSize:12,color:'var(--muted)',flex:1}}>Fechado o dia todo</span>
            )}
            {d.day_of_week===now.getDay()&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:'rgba(0,255,65,0.08)',color:'var(--neon)',fontFamily:'Bangers,cursive'}}>HOJE</span>}
          </div>
        ))}
        <button onClick={save} disabled={saving} className='btn-neon-fill' style={{width:'100%',fontSize:14,padding:12,marginTop:8}}>
          <Check size={14} style={{display:'inline',marginRight:6}}/>{saving?'SALVANDO...':'SALVAR HORÁRIOS'}
        </button>
      </div>
    </div>
  )
}