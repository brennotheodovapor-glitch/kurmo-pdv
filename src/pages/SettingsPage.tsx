import{useState}from 'react'
import{Settings,MessageCircle,CheckCircle,XCircle,Loader2,ExternalLink,Copy}from 'lucide-react'
import toast from 'react-hot-toast'

const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function SettingsPage(){
  const[waUrl,setWaUrl]=useState(import.meta.env.VITE_WA_URL||'')
  const[waKey,setWaKey]=useState(import.meta.env.VITE_WA_KEY||'')
  const[waInst,setWaInst]=useState(import.meta.env.VITE_WA_INSTANCE||'kurmo')
  const[testPhone,setTestPhone]=useState('')
  const[testing,setTesting]=useState(false)
  const[waStatus,setWaStatus]=useState<'idle'|'ok'|'error'>('idle')
  const[qrCode,setQrCode]=useState<string|null>(null)
  const[checkingQr,setCheckingQr]=useState(false)

  async function testConnection(){
    if(!waUrl||!waKey){toast.error('Preencha a URL e API Key');return}
    setTesting(true);setWaStatus('idle')
    try{
      const res=await fetch(waUrl+'/instance/fetchInstances',{headers:{'apikey':waKey}})
      if(res.ok){setWaStatus('ok');toast.success('Conexao OK!')}
      else{setWaStatus('error');toast.error('Erro: '+res.status)}
    }catch(e:any){setWaStatus('error');toast.error('Erro de conexao: '+e.message)}
    finally{setTesting(false)}
  }

  async function getQR(){
    if(!waUrl||!waKey||!waInst){toast.error('Preencha os campos');return}
    setCheckingQr(true)
    try{
      const res=await fetch(waUrl+'/instance/connect/'+waInst,{headers:{'apikey':waKey}})
      const data=await res.json()
      if(data.base64){setQrCode(data.base64);toast.success('QR Code gerado! Escaneie com o WhatsApp')}
      else if(data.instance?.state==='open'){setQrCode(null);toast.success('WhatsApp ja conectado!')}
      else{toast.error('Resposta inesperada: '+JSON.stringify(data).substring(0,80))}
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setCheckingQr(false)}
  }

  async function sendTest(){
    if(!testPhone||!waUrl||!waKey){toast.error('Preencha o telefone e configure a API');return}
    setTesting(true)
    try{
      let n=testPhone.replace(/\D/g,'')
      if(!n.startsWith('55'))n='55'+n
      const res=await fetch(waUrl+'/message/sendText/'+waInst,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':waKey},
        body:JSON.stringify({number:n+'@s.whatsapp.net',textMessage:{text:'Teste do sistema UZT 027 - WhatsApp funcionando!'}})
      })
      if(res.ok)toast.success('Mensagem de teste enviada!')
      else toast.error('Erro ao enviar: '+res.status)
    }catch(e:any){toast.error('Erro: '+e.message)}
    finally{setTesting(false)}
  }

  function copyEnvVars(){
    const text='VITE_WA_URL='+waUrl+'\nVITE_WA_KEY='+waKey+'\nVITE_WA_INSTANCE='+waInst
    navigator.clipboard.writeText(text)
    toast.success('Copiado! Cole nas variaveis de ambiente do Vercel')
  }

  return(
    <div style={{height:'100%',overflowY:'auto',padding:'20px',background:'var(--bg)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:24}}>
        <Settings size={22} color='var(--neon)'/>
        <h1 className='font-bangers neon-text-sm' style={{fontSize:26}}>CONFIGURACOES</h1>
      </div>

      {/* WhatsApp Integration */}
      <div className='card' style={{padding:24,marginBottom:20,maxWidth:700}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
          <MessageCircle size={20} color='#25D366'/>
          <h2 style={{fontSize:18,fontWeight:700,color:'var(--white)',fontFamily:'Bangers,cursive',letterSpacing:1}}>INTEGRACAO WHATSAPP</h2>
          {waStatus==='ok'&&<CheckCircle size={16} color='#25D366'/>}
          {waStatus==='error'&&<XCircle size={16} color='#ff3333'/>}
        </div>
        <p style={{fontSize:12,color:'var(--muted)',marginBottom:20}}>Envia atualizacoes automaticas de status ao cliente via WhatsApp usando a Evolution API (gratuita).</p>

        {/* Setup guide */}
        <div style={{padding:'12px 16px',background:'rgba(37,211,102,0.06)',border:'1px solid rgba(37,211,102,0.2)',borderRadius:10,marginBottom:20}}>
          <p style={{fontSize:12,fontWeight:600,color:'#25D366',marginBottom:8}}>COMO CONFIGURAR (5 minutos)</p>
          {[
            'Acesse railway.com e faca login com GitHub',
            'Clique em New Project > Deploy from Template > busque Evolution API',
            'Clique em Deploy e aguarde o deploy terminar',
            'Copie a URL publica do servico (Settings > Networking > Public URL)',
            'Crie uma instancia: POST /instance/create com apikey no header',
            'Cole a URL e API Key abaixo e clique em Conectar WhatsApp',
          ].map((s,i)=>(
            <div key={i} style={{display:'flex',gap:8,marginBottom:5,alignItems:'flex-start'}}>
              <span style={{width:18,height:18,borderRadius:'50%',background:'rgba(37,211,102,0.2)',color:'#25D366',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>{i+1}</span>
              <p style={{fontSize:12,color:'var(--text)',lineHeight:1.4}}>{s}</p>
            </div>
          ))}
          <a href='https://railway.com/template/evolution-api' target='_blank' rel='noopener noreferrer' style={{display:'inline-flex',alignItems:'center',gap:5,marginTop:8,fontSize:12,color:'#25D366',textDecoration:'none',border:'1px solid rgba(37,211,102,0.3)',borderRadius:7,padding:'5px 12px'}}>
            <ExternalLink size={12}/>Abrir Template no Railway
          </a>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>URL DA EVOLUTION API *</label>
            <input value={waUrl} onChange={e=>setWaUrl(e.target.value)} placeholder='https://sua-evolution-api.railway.app' style={{fontSize:13}}/>
            <p style={{fontSize:10,color:'var(--muted)',marginTop:3}}>URL publica do seu servidor Evolution API no Railway</p>
          </div>
          <div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>API KEY *</label>
            <input value={waKey} onChange={e=>setWaKey(e.target.value)} placeholder='sua-api-key-secreta' type='password' style={{fontSize:13}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:5,letterSpacing:1}}>NOME DA INSTANCIA</label>
            <input value={waInst} onChange={e=>setWaInst(e.target.value)} placeholder='kurmo' style={{fontSize:13}}/>
            <p style={{fontSize:10,color:'var(--muted)',marginTop:3}}>Nome da instancia criada na Evolution API (padrao: kurmo)</p>
          </div>
        </div>

        <div style={{display:'flex',gap:10,marginTop:16,flexWrap:'wrap'}}>
          <button onClick={testConnection} disabled={testing} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--muted)',cursor:'pointer',fontSize:13}}>
            {testing?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<CheckCircle size={13}/>}Testar conexao
          </button>
          <button onClick={getQR} disabled={checkingQr} className='btn-neon-fill' style={{display:'flex',alignItems:'center',gap:6,fontSize:13,padding:'8px 16px',background:'#25D366',color:'#fff',border:'none'}}>
            {checkingQr?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<MessageCircle size={13}/>}Conectar WhatsApp
          </button>
          <button onClick={copyEnvVars} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--muted)',cursor:'pointer',fontSize:13}}>
            <Copy size={13}/>Copiar variaveis Vercel
          </button>
        </div>

        {/* QR Code display */}
        {qrCode&&(
          <div style={{marginTop:16,padding:16,background:'var(--surface)',borderRadius:12,border:'1px solid #25D366',textAlign:'center'}}>
            <p style={{fontSize:13,color:'#25D366',marginBottom:12,fontWeight:600}}>Escaneie com o WhatsApp do numero que vai enviar as mensagens</p>
            <img src={qrCode} alt='QR Code WhatsApp' style={{maxWidth:240,borderRadius:8,background:'white',padding:8}}/>
            <p style={{fontSize:11,color:'var(--muted)',marginTop:8}}>O QR Code expira em 60 segundos. Apos escanear, as mensagens serao enviadas automaticamente.</p>
            <button onClick={getQR} style={{marginTop:8,fontSize:11,color:'#25D366',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Gerar novo QR Code</button>
          </div>
        )}

        {/* Test message */}
        <div style={{marginTop:16,padding:'14px 16px',background:'var(--surface)',borderRadius:10,border:'1px solid var(--border)'}}>
          <p style={{fontSize:11,color:'var(--muted)',letterSpacing:1,marginBottom:8}}>ENVIAR MENSAGEM DE TESTE</p>
          <div style={{display:'flex',gap:8}}>
            <input value={testPhone} onChange={e=>setTestPhone(e.target.value)} placeholder='(27) 99999-9999' type='tel' style={{flex:1,fontSize:13}}/>
            <button onClick={sendTest} disabled={testing} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #25D366',background:'rgba(37,211,102,0.1)',color:'#25D366',cursor:'pointer',fontSize:13,whiteSpace:'nowrap'}}>
              {testing?'Enviando...':'Enviar teste'}
            </button>
          </div>
        </div>

        {/* Info about messages */}
        <div style={{marginTop:14,padding:'10px 14px',background:'var(--surface)',borderRadius:8}}>
          <p style={{fontSize:11,color:'var(--muted)',letterSpacing:1,marginBottom:8}}>MENSAGENS AUTOMATICAS ENVIADAS</p>
          {[
            {s:'ACEITO',m:'Pedido aceito e sendo preparado'},
            {s:'PREPARANDO',m:'Pedido sendo preparado'},
            {s:'A CAMINHO',m:'Pedido saiu para entrega'},
            {s:'ENTREGUE',m:'Pedido entregue com sucesso'},
            {s:'CANCELADO',m:'Pedido cancelado'},
          ].map((k,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0',borderBottom:'1px solid rgba(26,46,26,0.4)'}}>
              <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10,background:'rgba(37,211,102,0.1)',color:'#25D366',whiteSpace:'nowrap'}}>{k.s}</span>
              <span style={{fontSize:12,color:'var(--muted)'}}>{k.m}</span>
            </div>
          ))}
          <p style={{fontSize:11,color:'var(--muted)',marginTop:8,opacity:0.7}}>As mensagens sao enviadas automaticamente ao alterar o status de cada pedido.</p>
        </div>

        {/* Important note about env vars */}
        <div style={{marginTop:14,padding:'10px 14px',background:'rgba(255,170,0,0.06)',borderRadius:8,border:'1px solid rgba(255,170,0,0.2)',fontSize:12,color:'#ffaa00'}}>
          <strong>Importante:</strong> Para funcionar em producao, adicione as variaveis de ambiente no Vercel:<br/>
          <code style={{fontSize:11,color:'var(--neon)',display:'block',marginTop:4}}>VITE_WA_URL, VITE_WA_KEY, VITE_WA_INSTANCE</code>
          <p style={{marginTop:4,fontSize:11}}>Use o botao Copiar variaveis Vercel e cole em Settings > Environment Variables no Vercel.</p>
        </div>
      </div>
    </div>
  )
}