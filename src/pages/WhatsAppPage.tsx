import{useState,useEffect}from 'react'
import{supabase}from '@/lib/supabase'
import{MessageSquare,Save,RefreshCw,Wifi,WifiOff,Send}from 'lucide-react'

const DEFAULT_MSGS:{id:string;label:string;message:string}[]=[
  {id:'accepted',label:'✅ Pedido Aceito',message:'Ola {nome}! Pedido #{numero} foi ACEITO! Estamos preparando tudo.'},
  {id:'preparing',label:'👨 Em Preparo',message:'Ola {nome}! Pedido #{numero} esta sendo PREPARADO!'},
  {id:'ready',label:'🎁 Pronto para Entrega',message:'Ola {nome}! Pedido #{numero} esta PRONTO! O entregador vai sair agora.'},
  {id:'delivering',label:'🛵 Saiu para Entrega',message:'Ola {nome}! Pedido #{numero} esta A CAMINHO! Fique de olho.'},
  {id:'delivered',label:'🎉 Entregue',message:'Ola {nome}! Pedido #{numero} foi ENTREGUE! Obrigado pela preferencia!'},
  {id:'cancelled',label:'❌ Cancelado',message:'Ola {nome}! Infelizmente seu pedido #{numero} foi CANCELADO. Entre em contato.'}
]

const WA_URL='https://kurmo-whatsapp-api-production.up.railway.app'

export default function WhatsAppPage(){
  const[msgs,setMsgs]=useState<typeof DEFAULT_MSGS>(DEFAULT_MSGS)
  const[status,setStatus]=useState<'connected'|'disconnected'|'loading'>('loading')
  const[saving,setSaving]=useState<string|null>(null)
  const[testPhone,setTestPhone]=useState('')
  const[testMsg,setTestMsg]=useState('')
  const[sending,setSending]=useState(false)
  const[tableExists,setTableExists]=useState(false)

  useEffect(()=>{checkStatus();loadMsgs()},[])

  async function checkStatus(){
    try{
      const r=await fetch(WA_URL+'/status').then(r=>r.json())
      setStatus(r.status==='connected'?'connected':'disconnected')
    }catch{setStatus('disconnected')}
  }

  async function loadMsgs(){
    const{data,error}=await supabase.from('whatsapp_messages').select('id,label,message,active')
    if(error||!data){setTableExists(false);return}
    setTableExists(true)
    const merged=DEFAULT_MSGS.map(d=>{
      const dbMsg=data.find(m=>m.id===d.id)
      return dbMsg?{...d,message:dbMsg.message,label:dbMsg.label}:d
    })
    setMsgs(merged)
  }

  async function saveMsg(id:string,msg:string,label:string){
    setSaving(id)
    if(tableExists){
      await supabase.from('whatsapp_messages').upsert({id,label,message:msg,updated_at:new Date().toISOString()})
    }
    setMsgs(prev=>prev.map(m=>m.id===id?{...m,message:msg}:m))
    setSaving(null)
  }

  async function sendTest(){
    if(!testPhone||!testMsg){alert('Preencha telefone e mensagem');return}
    setSending(true)
    try{
      const n=testPhone.replace(/\D/g,'')
      const r=await fetch(WA_URL+'/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:n,message:testMsg})})
      const d=await r.json()
      if(d.success)alert('Mensagem enviada!')
      else alert('Erro: '+(d.error||'falha'))
    }catch(e:any){alert('Erro: '+e.message)}
    setSending(false)
  }

  const INP:React.CSSProperties={width:'100%',background:'#1c1c1c',border:'1px solid #2a2a2a',color:'#fff',borderRadius:10,padding:'10px 12px',fontSize:13,outline:'none',boxSizing:'border-box',resize:'vertical' as const,minHeight:80,fontFamily:'inherit',lineHeight:1.5}

  return(
    <div style={{padding:'16px 12px',maxWidth:700,margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
        <MessageSquare size={20} color='#00ff41'/>
        <h1 style={{fontFamily:'Bangers,cursive',fontSize:22,color:'#00ff41',letterSpacing:2,margin:0,flex:1}}>WHATSAPP</h1>
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:20,background:status==='connected'?'rgba(0,255,65,0.1)':'rgba(255,51,51,0.1)',border:'1px solid '+(status==='connected'?'rgba(0,255,65,0.3)':'rgba(255,51,51,0.3)')}}>
          {status==='connected'?<Wifi size={14} color='#00ff41'/>:<WifiOff size={14} color='#ff5555'/>}
          <span style={{fontSize:12,color:status==='connected'?'#00ff41':'#ff5555',fontWeight:600}}>{status==='connected'?'CONECTADO':'DESCONECTADO'}</span>
        </div>
        <button onClick={checkStatus} style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:8,padding:'6px 10px',cursor:'pointer',color:'#888',display:'flex',alignItems:'center',gap:4,fontSize:12}}>
          <RefreshCw size={12}/>Atualizar
        </button>
      </div>

      {status==='disconnected'&&(
        <div style={{background:'rgba(255,51,51,0.06)',border:'1px solid rgba(255,51,51,0.2)',borderRadius:12,padding:'12px 16px',marginBottom:20}}>
          <p style={{fontSize:13,color:'#ff5555',margin:0}}>⚠️ WhatsApp desconectado. Acesse <a href='https://kurmo-whatsapp-api-production.up.railway.app/qr' target='_blank' style={{color:'#3b82f6'}}>este link</a> para escanear o QR Code e reconectar.</p>
        </div>
      )}

      {!tableExists&&(
        <div style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:12,padding:'12px 16px',marginBottom:20}}>
          <p style={{fontSize:13,color:'#f59e0b',margin:0}}>⚠️ Tabela de mensagens nao encontrada. Execute o SQL no Supabase para habilitar a edicao. Usando mensagens padrao por enquanto.</p>
        </div>
      )}

      {/* Mensagens por status */}
      <h2 style={{fontFamily:'Bangers,cursive',fontSize:17,color:'#fff',letterSpacing:1,marginBottom:12}}>MENSAGENS AUTOMATICAS</h2>
      <p style={{fontSize:12,color:'#666',marginBottom:16}}>Use <strong style={{color:'#aaa'}}>{'{nome}'}</strong> para o nome do cliente e <strong style={{color:'#aaa'}}>{'{numero}'}</strong> para o numero do pedido.</p>

      {msgs.map(m=>(
        <div key={m.id} style={{background:'#161616',borderRadius:12,padding:16,marginBottom:10,border:'1px solid #1e1e1e'}}>
          <p style={{fontSize:13,fontWeight:700,color:'#e5e5e5',margin:'0 0 8px'}}>{m.label}</p>
          <textarea
            value={m.message}
            onChange={e=>setMsgs(prev=>prev.map(x=>x.id===m.id?{...x,message:e.target.value}:x))}
            style={INP}
          />
          <button
            onClick={()=>saveMsg(m.id,m.message,m.label)}
            disabled={saving===m.id}
            style={{marginTop:8,padding:'8px 16px',borderRadius:8,border:'none',background:saving===m.id?'#2a2a2a':'#00ff41',color:saving===m.id?'#555':'#000',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:13,letterSpacing:1,display:'flex',alignItems:'center',gap:5}}>
            <Save size={12}/>{saving===m.id?'SALVANDO...':'SALVAR'}
          </button>
        </div>
      ))}

      {/* Teste de envio */}
      <h2 style={{fontFamily:'Bangers,cursive',fontSize:17,color:'#fff',letterSpacing:1,margin:'24px 0 12px'}}>ENVIAR MENSAGEM TESTE</h2>
      <div style={{background:'#161616',borderRadius:12,padding:16,border:'1px solid #1e1e1e'}}>
        <input value={testPhone} onChange={e=>setTestPhone(e.target.value)} placeholder='Telefone com DDD (ex: 27999999999)' style={{...INP,minHeight:'auto',height:44,marginBottom:10}}/>
        <textarea value={testMsg} onChange={e=>setTestMsg(e.target.value)} placeholder='Mensagem de teste...' style={{...INP,marginBottom:10}}/>
        <button onClick={sendTest} disabled={sending} style={{padding:'10px 20px',borderRadius:10,border:'none',background:sending?'#2a2a2a':'#3b82f6',color:sending?'#555':'#fff',cursor:'pointer',fontFamily:'Bangers,cursive',fontSize:15,letterSpacing:1,display:'flex',alignItems:'center',gap:6}}>
          <Send size={14}/>{sending?'ENVIANDO...':'ENVIAR TESTE'}
        </button>
      </div>
    </div>
  )
}