import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Zap, Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Preencha email e senha'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      toast.success('Bem-vindo! 🎉')
      onLogin()
    } catch (err: any) {
      toast.error(err.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-kurmo-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-sm animate-scale-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center mb-4 shadow-2xl glow-accent">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-gradient">Kurmo PDV</h1>
          <p className="text-kurmo-muted text-sm mt-1">Acesse sua conta</p>
        </div>
        <div className="bg-kurmo-card border border-kurmo-border rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div><label className="text-xs font-medium text-kurmo-muted mb-1.5 block">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-4 py-3 text-sm text-kurmo-text focus:outline-none focus:border-kurmo-accent" autoFocus /></div>
            <div><label className="text-xs font-medium text-kurmo-muted mb-1.5 block">Senha</label><div className="relative"><input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-kurmo-surface border border-kurmo-border rounded-xl px-4 py-3 pr-11 text-sm text-kurmo-text focus:outline-none focus:border-kurmo-accent" /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-kurmo-muted">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white text-sm font-display disabled:opacity-50 relative overflow-hidden group mt-2" style={{background:'linear-gradient(135deg,#7c3aed,#06b6d4)'}}><div className="absolute inset-0 bg-white opacity-0 group-hover:oroacity-10" /><div className="flex items-center justify-center gap-2">{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}{loading ? 'Entrando...' : 'Entrar'}</div></button>
          </form>
        </div>
        <p className="text-center text-xs text-kurmo-muted mt-4">Kurmo PDV v1.0 — Use o email cadastrado no Supabase</p>
      </div>
    </div>
  )
}
