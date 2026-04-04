import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import Logo from '@/components/shared/Logo'

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !pw) { toast.error('Preencha email e senha'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) throw error
      toast.success('Acesso liberado!')
      onLogin()
    } catch (err: any) {
      toast.error(err.message === 'Invalid login credentials' ? 'Email ou senha invalidos' : err.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center',
      position:'relative', overflow:'hidden'
    }}>
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:'linear-gradient(rgba(0,255,65,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.04) 1px, transparent 1px)',
        backgroundSize:'40px 40px'
      }}/>
      <div style={{
        position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)',
        width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(0,255,65,0.08) 0%, transparent 70%)'
      }}/>
      <div className="animate-slide-in" style={{ position:'relative', width:'100%', maxWidth:380, padding:24 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:32 }}>
          <div className="animate-pulse-neon" style={{ marginBottom:16 }}><Logo size={72}/></div>
          <h1 className="font-bangers neon-text" style={{ fontSize:42, lineHeight:1 }}>KURMO PDV</h1>
          <p style={{ color:'var(--muted)', fontSize:13, marginTop:6, letterSpacing:2 }}>SISTEMA DE VENDAS</p>
        </div>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:28 }}>
          <form onSubmit={login} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6, letterSpacing:1 }}>EMAIL</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" autoFocus/>
            </div>
            <div style={{ position:'relative' }}>
              <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6, letterSpacing:1 }}>SENHA</label>
              <input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} placeholder="........" style={{ paddingRight:44 }}/>
              <button type="button" onClick={()=>setShow(!show)} style={{
                position:'absolute', right:12, bottom:10, background:'none', border:'none', color:'var(--muted)', cursor:'pointer'
              }}>
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            <button type="submit" disabled={loading} className="btn-neon-fill" style={{ marginTop:8, fontSize:18, padding:'12px 0' }}>
              {loading ? 'ACESSANDO...' : 'ENTRAR'}
            </button>
          </form>
        </div>
        <p style={{ textAlign:'center', color:'var(--muted)', fontSize:11, marginTop:16, letterSpacing:1 }}>
          KURMO PDV v2.0 - USE O EMAIL DO SUPABASE
        </p>
      </div>
    </div>
  )
}
