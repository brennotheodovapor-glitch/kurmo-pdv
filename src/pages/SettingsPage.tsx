import{useState}from 'react'
import{Settings,MessageCircle,CheckCircle,XCircle,Loader2,ExternalLink,Copy,Smartphone,Send}from 'lucide-react'
import{sendWhatsApp}from '@/lib/whatsapp'
import toast from 'react-hot-toast'

export default function SettingsPage(){
  const[inst,setInst]=useState(import.meta.env.VITE_ZAPI_INSTANCE||'')
  const[token,setToken]=useState(import.meta.env.VITE_ZAPI_TOKEN||'')
  const[security,setSecurity]=useState(import.meta.env.VITE_ZAPI_SECURITY||'')
  const[testPhone,setTestPhone]=useState('')
  const[testing,setTesting]=useState(false)
  const[connStatus,setConnStatus]=useState<'idle'|'ok'|'error'|'disconnected'>('idle')
  const[checking,setChecking]=useState(false)

  const configured=!!(inst&&token)

  async function checkStatus(){
    if(!inst||!token){toast.error('Preencha Instance ID e Token');return}
    setChecking(true);setConnStatus('idle')
    try{
      const res=await fetch('https://api.z-api.io/instances/'+inst+'/token/'+token+'/status',{
        headers:{'Client-Token':token,...(security?{'Security-Token':security}:{})}
      })
      const data=await res.json()
      if(res.ok){
        const connected=data.connected||data.status==='connected'||data.value==='connected'
        setConnStatus(connected?'ok':'disconnected')
        if(connected)toast.success('WhatsApp conectado!')
        else toast.error('WhatsApp desconectado. Escaneie o QR Code no painel Z-API.')
      }else{
        setConnStatus('error');toast.error('Erro na API: '+res.status)
      }
    }catch(e:any){setConnStatus('error');toast.error('Erro: '+e.message)}
    finally{setChecking(false)}
  }

  async function sendTest(){
    if(!testPhone){toast.error('Informe o numero');return}
    if(!configured){toast.error('Configure o Instance ID e Token primeiro');return}
    setTesting(true)
    const ok=await sendWhatsApp(testPhone,'Teste do sistema *UZT 027* - WhatsApp funcionando!')
    if(ok)toast.success('Mensagem enviada com sucesso!')
    else toast.error('Falha ao enviar. Verifique as credenciais.')
    setTesting(false)
  }

  function copyEnv(){
    const t='VITE_ZAPI_INSTANCE='+inst+'\nVITE_ZAPI_TOKEN='+token+(security?'\nVITE_ZAPI_SECURITY='+security:'')
    navigator.clipboard.writeText(t)
    toast.success('Copiado! Cole no Vercel em Settings > Environment Variables')
  }

  const STATUS_COLOR={idle:'var(--muted)',ok:'#25D366',error:'#ff3333',disconnected:'#ffaa00'}
  const STATUS_LABEL={idle:'Nao verificado',ok:'Conectado',error:'Erro de credenciais',disconnected:'Desconectado — escaneie o QR'}

  return(
    <div style={{height:'100%',overflowY:'auto',padding:'20px',background:'var(--bg)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:24}}>
        <Settings size={22} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>CONFIGURACOES</h1>
      </div>

      <div className='card' style={{padding:24,maxWidth:680}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
          <MessageCircle size={22} color='#25D366'/>
          <h2 className='font-bangers' style={{fontSize:20,color:'var(--white)',letterSpacing:1}}>WHATSAPP — Z-API</h2>
          {connStatus==='ok'&&<CheckCircle size={16} color='#25D366'/>}
          {connStatus==='error'&&<XCircle size={16} color='#ff3333'/>}
          {connStatus!=='idle'&&<span style={{fontSize:11,color:STATUS_COLOR[connStatus],fontFamily:'Bangers,cursive'}}>{STATUS_LABEL[connStatus]}</span>}
        </div>
        <p style={{fontSize:12,color:'var(--muted)',marginBottom:20}}>Envia atualizacoes automaticas de status ao cliente via WhatsApp. Plano gratuito: 1.000 mensagens/mes.</p>

        {/* Setup guide */}
        <div style={{padding:'14px 16px',background:'rgba(37,211,102,0.05)',border:'1px solid rgba(37,211,102,0.2)',borderRadius:10,marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <p style={{fontSize:12,fontWeight:700,color:'#25D366',letterSpacing:0.5}}>COMO CONFIGURAR (3 passos)</p>
            <a href='https://www.z-api.io' target='_blank' rel='noopener noreferrer' style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,color:'#25D366',textDecoration:'none',border:'1px solid rgba(37,211,102,0.3)',borderRadius:6,padding:'3px 8px'}}>
              <ExternalLink size={11}/>z-api.io
            </a>
          </div>
          {[
            {n:1,t:'Criar conta gratuita',d:'Acesse z-api.io e crie sua conta. O plano gratuito tem 1.000 mensagens/mes.'},
            {n:2,t:'Criar instancia',d:'No painel Z-API clique em Criar Instancia. Copie o Instance ID e o Token mostrados.'},
            {n:3,t:'Conectar WhatsApp',d:'Na instancia criada, clique em Conectar e escaneie o QR Code com o WhatsApp do numero que vai enviar as mensagens.'},
          ].map(s=>(
            <div key={s.n} style={{display:'flex',gap:10,marginBottom:10,alignItems:'flex-start'}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(37,211,102,0.15)',border:'1px solid rgba(37,211,102,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#25D366',flexShrink:0}}>{s.n}</div>
              <div>
                <p style={{fontSize:12,fontWeight:600,color:'var(--white)',marginBottom:2}}>{s.t}</p>
                <p style={{fontSize:11,color:'var(--muted)',lineHeight:1.4}}>{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Credentials */}
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
          <div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>INSTANCE ID *</label>
            <input value={inst} onChange={e=>setInst(e.target.value)} placeholder='Ex: 3DF2A1B4C5...' style={{fontSize:13,fontFamily:'JetBrains Mono,monospace'}}/>
            <p style={{fontSize:10,color:'var(--muted)',marginTop:3}}>Encontrado no painel Z-API em sua instancia</p>
          </div>
          <div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>TOKEN *</label>
            <input value={token} onChange={e=>setToken(e.target.value)} placeholder='Token da instancia' type='password' style={{fontSize:13,fontFamily:'JetBrains Mono,monospace'}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>SECURITY TOKEN (opcional)</label>
            <input value={security} onChange={e=>setSecurity(e.target.value)} placeholder='Recomendado para producao' type='password' style={{fontSize:13,fontFamily:'JetBrains Mono,monospace'}}/>
            <p style={{fontSize:10,color:'var(--muted)',marginTop:3}}>Protege sua API de chamadas nao autorizadas</p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
          <button onClick={checkStatus} disabled={checking} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--muted)',cursor:'pointer',fontSize:13}}>
            {checking?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Smartphone size={13}/>}
            Verificar status
          </button>
          <button onClick={copyEnv} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--muted)',cursor:'pointer',fontSize:13}}>
            <Copy size={13}/>Copiar para Vercel
          </button>
        </div>

        {/* Test message */}
        <div style={{padding:'14px 16px',background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)',marginBottom:16}}>
          <p style={{fontSize:11,color:'var(--muted)',letterSpacing:1,marginBottom:8}}>ENVIAR MENSAGEM DE TESTE</p>
          <div style={{display:'flex',gap:8}}>
            <input value={testPhone} onChange={e=>setTestPhone(e.target.value)} placeholder='(27) 99999-9999' type='tel' style={{flex:1,fontSize:13}}/>
            <button onClick={sendTest} disabled={testing||!configured} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:8,border:'none',background:'#25D366',color:'#fff',cursor:configured?'pointer':'not-allowed',fontSize:13,opacity:configured?1:0.5,whiteSpace:'nowrap'}}>
              {testing?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Send size={13}/>}
              Enviar teste
            </button>
          </div>
          {!configured&&<p style={{fontSize:11,color:'#ffaa00',marginTop:6}}>Preencha Instance ID e Token para habilitar o envio.</p>}
        </div>

        {/* Message preview */}
        <div style={{padding:'12px 14px',background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)',marginBottom:16}}>
          <p style={{fontSize:11,color:'var(--muted)',letterSpacing:1,marginBottom:10}}>MENSAGENS AUTOMATICAS</p>
          {[
            {s:'ACEITO',c:'#06b6d4',m:'Oi [cliente]! Seu pedido #X foi ACEITO e esta sendo preparado...'},
            {s:'PREPARANDO',c:'#7c3aed',m:'Pedido #X esta SENDO PREPARADO agora...'},
            {s:'A CAMINHO',c:'#f59e0b',m:'Pedido #X SAIU PARA ENTREGA! O entregador esta a caminho...'},
            {s:'ENTREGUE',c:'#25D366',m:'[cliente], seu Pedido #X foi ENTREGUE! Obrigado pela preferencia...'},
            {s:'CANCELADO',c:'#ff3333',m:'Pedido #X foi CANCELADO. Em caso de duvidas, fale conosco...'},
          ].map((k,i)=>(
            <div key={i} style={{display:'flex',gap:10,padding:'6px 0',borderBottom:'1px solid rgba(26,46,26,0.4)',alignItems:'flex-start'}}>
              <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,background:k.c+'20',color:k.c,whiteSpace:'nowrap',marginTop:1}}>{k.s}</span>
              <span style={{fontSize:11,color:'var(--muted)',lineHeight:1.4}}>{k.m}</span>
            </div>
          ))}
          <p style={{fontSize:10,color:'var(--muted)',marginTop:8,opacity:0.7}}>Enviadas automaticamente ao mudar o status no Catalogo ou Delivery.</p>
        </div>

        {/* Vercel env vars reminder */}
        <div style={{padding:'12px 14px',background:'rgba(255,170,0,0.06)',borderRadius:8,border:'1px solid rgba(255,170,0,0.2)'}}>
          <p style={{fontSize:11,fontWeight:600,color:'#ffaa00',marginBottom:6}}>IMPORTANTE — ATIVAR EM PRODUCAO</p>
          <p style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>As credenciais aqui sao apenas para preview. Para funcionar no site publicado, adicione no Vercel:</p>
          <div style={{background:'var(--surface)',borderRadius:6,padding:'8px 10px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--neon)',marginBottom:8}}>
            VITE_ZAPI_INSTANCE=sua-instancia{'\n'}<br/>
            VITE_ZAPI_TOKEN=seu-token{'\n'}<br/>
            VITE_ZAPI_SECURITY=seu-security-token
          </div>
          <p style={{fontSize:11,color:'var(--muted)'}}>Vercel {'>'} seu projeto {'>'} Settings {'>'} Environment Variables {'>'} Add {'>'} Redeploy</p>
        </div>
      </div>
    </div>
  )
}