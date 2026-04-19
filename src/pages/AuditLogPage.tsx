import{useState,useEffect}from 'react'
import{FileText,Search,Clock}from 'lucide-react'
import{supabase}from '@/lib/supabase'
type Log={id:string;table_name:string;record_id:string;action:string;old_data:any;new_data:any;user_name:string|null;created_at:string}
const ACTION_COLOR:Record<string,string>={INSERT:'#00ff41',UPDATE:'#06b6d4',DELETE:'#ff3333',CANCEL:'#ff3333',STATUS_CHANGE:'#f59e0b'}
const today=()=>new Date().toISOString().split('T')[0]
export default function AuditLogPage(){
  const[logs,setLogs]=useState<Log[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[dateFrom,setDateFrom]=useState(today())
  const[dateTo,setDateTo]=useState(today())
  const[expanded,setExpanded]=useState<string|null>(null)
  useEffect(()=>{load()},[dateFrom,dateTo])
  async function load(){
    setLoading(true)
    const{data}=await supabase.from('audit_log').select('*').gte('created_at',dateFrom+'T00:00:00').lte('created_at',dateTo+'T23:59:59').order('created_at',{ascending:false}).limit(200)
    setLogs(data||[])
    setLoading(false)
  }
  const filtered=logs.filter(l=>!search||l.table_name.includes(search)||l.action.includes(search)||(l.user_name||'').toLowerCase().includes(search.toLowerCase()))
  return(
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'var(--bg)'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <FileText size={20} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>HISTÓRICO DE ALTERAÇÕES</h1>
        <div style={{position:'relative',flex:1,minWidth:160,maxWidth:240}}>
          <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Filtrar...' style={{paddingLeft:28,fontSize:13}}/>
        </div>
        <input type='date' value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{fontSize:12,padding:'5px 8px'}}/>
        <span style={{fontSize:11,color:'var(--muted)'}}>até</span>
        <input type='date' value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{fontSize:12,padding:'5px 8px'}}/>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
        {loading?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando...</div>:
        filtered.length===0?<div style={{textAlign:'center',padding:48,color:'var(--muted)'}}><FileText size={32} style={{opacity:0.2,marginBottom:8}}/><p>Nenhum registro</p></div>:
        filtered.map(l=>(
          <div key={l.id} className='card' style={{marginBottom:6,overflow:'hidden',borderLeft:'3px solid '+(ACTION_COLOR[l.action]||'var(--border)')}}>
            <div onClick={()=>setExpanded(expanded===l.id?null:l.id)} style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',flexWrap:'wrap'}}>
              <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,background:(ACTION_COLOR[l.action]||'#888')+'20',color:ACTION_COLOR[l.action]||'#888',whiteSpace:'nowrap'}}>{l.action}</span>
              <span style={{fontSize:12,color:'var(--muted)',fontFamily:'Bangers,cursive'}}>{l.table_name}</span>
              <span style={{fontSize:11,color:'var(--text)',flex:1}}>{l.user_name||'Sistema'}</span>
              <span style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:3}}><Clock size={10}/>{new Date(l.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
            </div>
            {expanded===l.id&&(l.old_data||l.new_data)&&(
              <div style={{padding:'0 14px 12px',borderTop:'1px solid var(--border)'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {l.old_data&&<div><p style={{fontSize:10,color:'var(--muted)',marginBottom:4}}>ANTES</p><pre style={{fontSize:10,color:'#ff8888',background:'var(--surface)',padding:8,borderRadius:6,overflow:'auto',maxHeight:120}}>{JSON.stringify(l.old_data,null,2)}</pre></div>}
                  {l.new_data&&<div><p style={{fontSize:10,color:'var(--muted)',marginBottom:4}}>DEPOIS</p><pre style={{fontSize:10,color:'#88ff88',background:'var(--surface)',padding:8,borderRadius:6,overflow:'auto',maxHeight:120}}>{JSON.stringify(l.new_data,null,2)}</pre></div>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}