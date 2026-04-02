import { useState } from 'react'
import { Store, Phone, Wifi, WifiOff, Save, ExternalLink, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [storeName, setStoreName] = useState('Theo do Vapor')
  const [whatsappUrl, setWhatsappUrl] = useState('')
  const [whatsappKey, setWhatsappKey] = useState('')
  const [instance, setInstance] = useState('kurmo')
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [waStatus, setWaStatus] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [testing, setTesting] = useState(false)

  const testWhatsApp = async () => {
    if (!whatsappUrl) { toast.error('Informe a URL da Evolution API'); return }
    setTesting(true)
    try {
      const r = await fetch(`${whatsappUrl}/instance/connectionState/${instance}`, {
        headers: { apikey: whatsappKey }
      })
      setWaStatus(r.ok ? 'ok' : 'fail')
      toast[r.ok ? 'success' : 'error'](r.ok ? 'WhatsApp conectado!' : 'Falha na conexão')
    } catch { setWaStatus('fail'); toast.error('Não foi possível conectar') }
    finally { setTesting(false) }
  }

  const save = () => {
    // In production: save to localStorage / Supabase config table
    toast.success('Configurações salvas!', { icon: '⚙️' })
  }

  return (
    <div className="h-full overflow-y-auto bg-kurmo-bg">
      <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-2xl text-kurmo-text">Configurações</h1>
          <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-kurmo-accent hover:bg-violet-500 text-white text-sm font-medium transition-all">
            <Save className="w-4 h-4" /> Salvar tudo
          </button>
        </div>

        {/* Store */}
        <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
          <h2 className="font-semibold text-kurmo-text mb-4 flex items-center gap-2"><Store className="w-4 h-4 text-kurmo-accentLight" /> Sua loja</h2>
          <label className="block">
            <span className="text-xs text-kurmo-muted mb-1 block">Nome da loja</span>
            <input value={storeName} onChange={e => setStoreName(e.target.value)}
              className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none focus:border-kurmo-accent" />
          </label>
        </div>

        {/* Supabase */}
        <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
          <h2 className="font-semibold text-kurmo-text mb-1 flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" /> Supabase (banco de dados)
          </h2>
          <p className="text-xs text-kurmo-muted mb-4">
            Crie sua conta grátis em{' '}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-kurmo-accentLight hover:underline flex-inline items-center gap-1">
              supabase.com <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
          <div className="flex flex-col gap-3">
            <label>
              <span className="text-xs text-kurmo-muted mb-1 block">Project URL</span>
              <input value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)}
                placeholder="https://xxxx.supabase.co"
                className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none focus:border-kurmo-accent font-mono" />
            </label>
            <label>
              <span className="text-xs text-kurmo-muted mb-1 block">Anon Key</span>
              <input value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} type="password"
                placeholder="eyJhbGci..."
                className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none focus:border-kurmo-accent font-mono" />
            </label>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-5">
          <h2 className="font-semibold text-kurmo-text mb-1 flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-400" /> Integração WhatsApp
          </h2>
          <p className="text-xs text-kurmo-muted mb-4">
            Use a{' '}
            <a href="https://evolution-api.com" target="_blank" rel="noopener noreferrer" className="text-kurmo-accentLight hover:underline">
              Evolution API <ExternalLink className="w-3 h-3 inline" />
            </a>
            {' '}hospedada no Railway (plano grátis)
          </p>
          <div className="flex flex-col gap-3">
            <label>
              <span className="text-xs text-kurmo-muted mb-1 block">URL da Evolution API</span>
              <input value={whatsappUrl} onChange={e => setWhatsappUrl(e.target.value)}
                placeholder="https://your-evolution.up.railway.app"
                className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none focus:border-green-500 font-mono" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-xs text-kurmo-muted mb-1 block">API Key</span>
                <input value={whatsappKey} onChange={e => setWhatsappKey(e.target.value)} type="password"
                  placeholder="sua-api-key"
                  className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none focus:border-green-500 font-mono" />
              </label>
              <label>
                <span className="text-xs text-kurmo-muted mb-1 block">Nome da instância</span>
                <input value={instance} onChange={e => setInstance(e.target.value)}
                  className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-3 py-2.5 text-sm text-kurmo-text focus:outline-none focus:border-green-500" />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={testWhatsApp} disabled={testing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all text-sm font-medium disabled:opacity-50">
                {testing ? <Wifi className="w-4 h-4 animate-pulse" /> : <Wifi className="w-4 h-4" />}
                Testar conexão
              </button>
              {waStatus === 'ok' && <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle className="w-4 h-4" /> Conectado</span>}
              {waStatus === 'fail' && <span className="flex items-center gap-1 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> Falha</span>}
            </div>
          </div>
        </div>

        {/* Deploy guide */}
        <div className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-kurmo-accent/20 rounded-2xl p-5">
          <h2 className="font-semibold text-kurmo-text mb-3 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-kurmo-accentLight" /> Guia de deploy gratuito
          </h2>
          <div className="space-y-2 text-sm text-kurmo-muted">
            <div className="flex items-start gap-2"><span className="text-kurmo-accentLight font-bold">1.</span><span><strong className="text-kurmo-text">Vercel:</strong> Conecte o GitHub → Import → Deploy automático</span></div>
            <div className="flex items-start gap-2"><span className="text-kurmo-accentLight font-bold">2.</span><span><strong className="text-kurmo-text">Supabase:</strong> New project → Copie URL e anon key → Cole acima</span></div>
            <div className="flex items-start gap-2"><span className="text-kurmo-accentLight font-bold">3.</span><span><strong className="text-kurmo-text">Railway:</strong> New → Deploy Evolution API → Configure instância</span></div>
            <div className="flex items-start gap-2"><span className="text-kurmo-accentLight font-bold">4.</span><span>Adicione as variáveis de ambiente no Vercel e faça redeploy</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
