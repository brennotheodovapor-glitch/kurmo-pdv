import{useState}from 'react'
import{Settings,MessageCircle,CheckCircle,XCircle,Loader2,ExternalLink,Copy,Send,Wifi,QrCode}from 'lucide-react'
import{sendWhatsApp}from '@/lib/whatsapp'
import toast from 'react-hot-toast'

export default function SettingsPage(){
  const[evoUrl,setEvoUrl]=useState(import.meta.env.VITE_EVO_URL||'')
  const[evoKey,setEvoKey]=useState(import.meta.env.VITE_EVO_KEY||'')
  const[evoInst,setEvoInst]=useState(import.meta.env.VITE_EVO_INSTANCE||'uzt027')
  const[testPhone,setTestPhone]=useState('')
  const[testing,setTesting]=useState(false)
  const[checking,setChecking]=useState(false)
  const[status,setStatus]=useState<'idle'|'ok'|'disconnected'|'error'>('idle')
  const[qrCode,setQrCode]=useState<string|null>(null)
  const[loadingQr,setLoadingQr]=useState(false)

  const configured=!!(evoUrl&&evoKey)

  async function checkStatus(){
    if(!configured){toast.error('Preencha a URL e API Key');return}
    setChecking(true);setStatus('idle');setQrCode(null)
    try{
      const res=await fetch(evoUrl+'/instance/connectionState/'+evoInst,{
        headers:{'apikey':evoKey}
      })
      const data=await res.json()
      const state=data?.instance?.state||data?.state||''
      if(state==='open'){setStatus('ok');toast.success('WhatsApp conectado!')}
      else{setStatus('disconnected');toast.error('Desconectado. Gere o QR Code para conectar.')}
    }catch(e:any){setStatus('error');toast.error('Erro ao conectar: '+e.message)}
    finally{setChecking(false)}
  }

  async function createAndConnect(){
    if(!configured){toast.error('Preencha a URL e API Key');return}
    setLoadingQr(true);setQrCode(null)
    try{
      // Try to create instance first (ignore if already exists)
      await fetch(evoUrl+'/instance/create',{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':evoKey},
        body:JSON.stringify({instanceName:evoInst,qrcode:true,integration:'WHATSAPP-BAILEYS'})
      })
      // Get QR code
      const res=await fetch(evoUrl+'/instance/connect/'+evoInst,{
        headers:{'apikey':evoKey}
      })
      const data=await res.json()
      if(data?.base64){
        setQrCode(data.base64)
        toast.success('QR Code gerado! Escaneie com o WhatsApp.')
      }else if(data?.instance?.state==='open'){
        setStatus('ok');setQrCode(null)
        toast.success('WhatsApp ja esta conectado!')
      }else{
        toast.error('Resposta inesperada. Verifique se a URL esta correta.')
        console.error(data)
      }
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setLoadingQr(false)}
  }

  async function sendTest(){
    if(!testPhone||!configured){toast.error('Preencha o telefone e configure a API');return}
    setTesting(true)
    const ok=await sendWhatsApp(testPhone,'Teste do sistema *UZT 027* - WhatsApp funcionando!')
    if(ok)toast.success('Mensagem enviada!')
    else toast.error('Falha. Verifique as credenciais e se o WhatsApp esta conectado.')
    setTesting(false)
  }

  function copyEnv(){
    const t='VITE_EVO_URL='+evoUrl+'\nVITE_EVO_KEY='+evoKey+'\nVITE_EVO_INSTANCE='+evoInst
    navigator.clipboard.writeText(t)
    toast.success('Copiado! Cole no Vercel em Settings > Environment Variables')
  }

  const ST={ok:'#25D366',disconnected:'#ffaa00',error:'#ff3333',idle:'var(--muted)'}
  const SL={ok:'Conectado',disconnected:'Desconectado',error:'Erro',idle:'Nao verificado'}

  return(
    <div style={{height:'100%',overflowY:'auto',padding:'20px',background:'var(--bg)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:24}}>
        <Settings size={22} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>CONFIGURACOES</h1>
      </div>

      <div className='card' style={{padding:24,maxWidth:700}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4,flexWrap:'wrap'}}>
          <MessageCircle size={22} color='#25D366'/>
          <h2 className='font-bangers' style={{fontSize:20,color:'var(--white)',letterSpacing:1}}>WHATSAPP — EVOLUTION API</h2>
          {status!=='idle'&&(
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              {status==='ok'?<CheckCircle size={15} color='#25D366'/>:status==='error'?<XCircle size={15} color='#ff3333'/>:<Wifi size={15} color='#ffaa00'/>}
              <span style={{fontSize:11,color:ST[status],fontFamily:'Bangers,cursive',letterSpacing:0.5}}>{SL[status]}</span>
            </div>
          )}
        </div>
        <p style={{fontSize:12,color:'var(--muted)',marginBottom:20}}>Envia atualizacoes automaticas de status ao cliente via WhatsApp. Usando Evolution API no Railway ($5/mes).</p>

        {/* Setup guide */}
        <div style={{padding:'14px 16px',background:'rgba(37,211,102,0.05)',border:'1px solid rgba(37,211,102,0.2)',borderRadius:10,marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
            <p style={{fontSize:12,fontWeight:700,color:'#25D366',letterSpacing:0.5}}>COMO CONFIGURAR (4 passos)</p>
            <a href='https://railway.com/deploy/evolution-api-whatsapp-automation' target='_blank' rel='noopener noreferrer' style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:'#25D366',textDecoration:'none',border:'1px solid rgba(37,211,102,0.3)',borderRadius:6,padding:'4px 10px'}}>
              <ExternalLink size={11}/>Deploy no Railway
            </a>
          </div>
          {[
            {n:1,t:'Assinar plano Hobby no Railway',d:'Em railway.com, assine o plano Hobby por $5/mes. Inclui $5 de creditos — suficiente para a Evolution API.'},
            {n:2,t:'Deploy da Evolution API',d:'Clique no link acima ou busque o template Evolution API no Railway. Clique em Deploy. Aguarde ~2 minutos.'},
            {n:3,t:'Pegar URL e criar API Key',d:'No Railway, va em seu servico > Settings > Networking > copie a Public URL. Em variaveis, defina AUTHENTICATION_API_KEY com uma senha de sua escolha.'},
            {n:4,t:'Colar aqui e conectar WhatsApp',d:'Cole a URL e API Key nos campos abaixo. Clique em Gerar QR Code e escaneie com o WhatsApp do numero que vai enviar mensagens.'},
          ].map(s=>(
            <div key={s.n} style={{display:'flex',gap:10,marginBottom:10,alignItems:'flex-start'}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(37,211,102,0.15)',border:'1px solid rgba(37,211,102,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#25D366',flexShrink:0,marginTop:1}}>{s.n}</div>
              <div>
                <p style={{fontSize:12,fontWeight:600,color:'var(--white)',marginBottom:2}}>{s.t}</p>
                <p style={{fontSize:11,color:'var(--muted)',lineHeight:1.5}}>{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Credentials */}
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
          <div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>URL DA EVOLUTION API *</label>
            <input value={evoUrl} onChange={e=>setEvoUrl(e.target.value)} placeholder='https://seu-app.up.railway.app' style={{fontSize:13,fontFamily:'JetBrains Mono,monospace'}}/>
            <p style={{fontSize:10,color:'var(--muted)',marginTop:3}}>URL publica do seu servico no Railway (Settings {'>'} Networking {'>'} Public URL)</p>
          </div>
          <div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>API KEY *</label>
            <input value={evoKey} onChange={e=>setEvoKey(e.target.value)} placeholder='Sua API key definida no Railway' type='password' style={{fontSize:13,fontFamily:'JetBrains Mono,monospace'}}/>
            <p style={{fontSize:10,color:'var(--muted)',marginTop:3}}>Valor da variavel AUTHENTICATION_API_KEY no Railway</p>
          </div>
          <div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>NOME DA INSTANCIA</label>
            <input value={evoInst} onChange={e=>setEvoInst(e.target.value)} placeholder='uzt027' style={{fontSize:13,fontFamily:'JetBrains Mono,monospace'}}/>
            <p style={{fontSize:10,color:'var(--muted)',marginTop:3}}>Nome para identificar a conexao (pode deixar como uzt027)</p>
          </div>
        </div>

        {/* Actions */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
          <button onClick={checkStatus} disabled={checking||!configured} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:configured?'var(--text)':'var(--muted)',cursor:configured?'pointer':'not-allowed',fontSize:13,opacity:configured?1:0.5}}>
            {checking?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Wifi size={13}/>}
            Verificar status
          </button>
          <button onClick={createAndConnect} disabled={loadingQr||!configured} className='btn-neon-fill' style={{display:'flex',alignItems:'center',gap:6,fontSize:13,padding:'9px 16px',opacity:configured?1:0.5,cursor:configured?'pointer':'not-allowed',background:'#25D366',color:'#fff',border:'none'}}>
            {loadingQr?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<QrCode size={13}/>}
            Gerar QR Code
          </button>
          <button onClick={copyEnv} disabled={!configured} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:configured?'var(--text)':'var(--muted)',cursor:configured?'pointer':'not-allowed',fontSize:13,opacity:configured?1:0.5}}>
            <Copy size={13}/>Copiar para Vercel
          </button>
        </div>

        {/* QR Code */}
        {qrCode&&(
          <div style={{padding:16,background:'var(--surface)',borderRadius:12,border:'1px solid #25D366',marginBottom:16,textAlign:'center'}}>
            <p style={{fontSize:13,color:'#25D366',fontWeight:600,marginBottom:10}}>Escaneie com o WhatsApp do numero que vai enviar as mensagens</p>
            <img src={qrCode.startsWith('data:')?qrCode:'data:image/png;base64,'+qrCode} alt='QR Code' style={{maxWidth:220,borderRadius:8,background:'white',padding:8,margin:'0 auto',display:'block'}}/>
            <p style={{fontSize:11,color:'var(--muted)',marginTop:8}}>O QR Code expira em 60 segundos. Apos escanear, clique em Verificar status.</p>
            <button onClick={createAndConnect} style={{marginTop:6,fontSize:11,color:'#25D366',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Gerar novo QR Code</button>
          </div>
        )}

        {/* Test message */}
        <div style={{padding:'14px 16px',background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)',marginBottom:16}}>
          <p style={{fontSize:11,color:'var(--muted)',letterSpacing:1,marginBottom:8}}>ENVIAR MENSAGEM DE TESTE</p>
          <div style={{display:'flex',gap:8}}>
            <input value={testPhone} onChange={e=>setTestPhone(e.target.value)} placeholder='(27) 99999-9999' type='tel' style={{flex:1,fontSize:13}}/>
            <button onClick={sendTest} disabled={testing||!configured} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:8,border:'none',background:configured?'#25D366':'var(--surface)',color:configured?'#fff':'var(--muted)',cursor:configured?'pointer':'not-allowed',fontSize:13,whiteSpace:'nowrap',opacity:configured?1:0.5}}>
              {testing?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Send size={13}/>}
              Enviar teste
            </button>
          </div>
          {!configured&&<p style={{fontSize:10,color:'#ffaa00',marginTop:5}}>Configure a URL e API Key para habilitar.</p>}
        </div>

        {/* Messages preview */}
        <div style={{padding:'12px 14px',background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)',marginBottom:16}}>
          <p style={{fontSize:11,color:'var(--muted)',letterSpacing:1,marginBottom:10}}>MENSAGENS AUTOMATICAS POR STATUS</p>
          {[
            {s:'ACEITO',    c:'#06b6d4',m:'Oi [cliente]! Seu pedido #X foi ACEITO e esta sendo preparado...'},
            {s:'PREPARANDO',c:'#7c3aed',m:'Pedido #X esta sendo PREPARADO agora. Aguarde!'},
            {s:'A CAMINHO', c:'#f59e0b',m:'Pedido #X SAIU PARA ENTREGA! O entregador esta a caminho...'},
            {s:'ENTREGUE',  c:'#25D366',m:'[cliente], seu Pedido #X foi ENTREGUE! Obrigado pela preferencia!'},
            {s:'CANCELADO', c:'#ff3333',m:'Pedido #X foi CANCELADO. Em caso de duvidas, fale conosco.'},
          ].map((k,i)=>(
            <div key={i} style={{display:'flex',gap:10,padding:'6px 0',borderBottom:'1px solid rgba(26,46,26,0.4)',alignItems:'flex-start'}}>
              <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,background:k.c+'20',color:k.c,whiteSpace:'nowrap',marginTop:1,flexShrink:0}}>{k.s}</span>
              <span style={{fontSize:11,color:'var(--muted)',lineHeight:1.4}}>{k.m}</span>
            </div>
          ))}
          <p style={{fontSize:10,color:'var(--muted)',marginTop:8,opacity:0.7}}>Enviadas automaticamente ao mudar o status no Catalogo ou Delivery.</p>
        </div>

        {/* Vercel env reminder */}
        <div style={{padding:'12px 14px',background:'rgba(255,170,0,0.06)',borderRadius:8,border:'1px solid rgba(255,170,0,0.2)'}}>
          <p style={{fontSize:11,fontWeight:600,color:'#ffaa00',marginBottom:6}}>ATIVAR EM PRODUCAO — VERCEL</p>
          <p style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>Apos configurar, cole as variaveis no Vercel para funcionar no site publicado:</p>
          <div style={{background:'var(--surface)',borderRadius:6,padding:'8px 12px',fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--neon)',lineHeight:2}}>
            VITE_EVO_URL=https://seu-app.up.railway.app<br/>
            VITE_EVO_KEY=sua-api-key<br/>
            VITE_EVO_INSTANCE=uzt027
          </div>
          <p style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Vercel {'>'} seu projeto {'>'} Settings {'>'} Environment Variables {'>'} Redeploy</p>
        </div>
      {/* WhatsApp Railway */}
      <div className='card' style={{padding:'16px',marginBottom:12}}>
        <p style={{fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1,marginBottom:12}}>🤖 WHATSAPP AUTOMÁTICO (RAILWAY)</p>
        <p style={{fontSize:11,color:'var(--muted)',marginBottom:10}}>Cole a URL da sua API no Railway para enviar mensagens automáticas de status do pedido.</p>
        <label style={{fontSize:10,color:'var(--muted)',display:'block',marginBottom:4}}>URL DA API (ex: https://seu-app.railway.app)</label>
        <input value={(settings as any).whatsapp_api_url||''} onChange={e=>setSettings((s:any)=>({...s,whatsapp_api_url:e.target.value}))} placeholder='https://seu-app.up.railway.app' style={{width:'100%',fontSize:13}}/>
      </div>
    </div>
  )
}