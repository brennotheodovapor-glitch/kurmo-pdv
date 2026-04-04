import { useState } from 'react'
import { QrCode, Copy, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'

type Product = { id:string; name:string; price:number; category:string; description?:string; image_url?:string; active:boolean }

const PRODUCTS: Product[] = [
  { id:'1', name:'Lost Mary 600 Puffs', price:45, category:'Descartaveis', description:'600 puffs, sabores variados', active:true },
  { id:'2', name:'Elfbar BC5000', price:120, category:'Descartaveis', description:'5000 puffs, recarregavel', active:true },
  { id:'3', name:'Uwell Caliburn G3', price:180, category:'Vapes', description:'Pod system premium', active:true },
  { id:'4', name:'Salt Nic Mango 30ml', price:35, category:'Liquids', description:'Nicotina em sal, sabor mango', active:true },
  { id:'5', name:'Pod Caliburn A3', price:95, category:'Pods', description:'Pod compact system', active:true },
  { id:'6', name:'Freebase Blueberry 60ml', price:55, category:'Liquids', description:'Liquido premium blueberry', active:true },
]

const MENU_URL = 'https://kurmo-pdv.vercel.app/menu'
const fmt = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

export default function MenuPage() {
  const [preview, setPreview] = useState(false)
  const cats = [...new Set(PRODUCTS.filter(p=>p.active).map(p=>p.category))]

  const copyLink = () => { navigator.clipboard.writeText(MENU_URL); toast.success('Link copiado!') }
  const shareWA = () => {
    const msg = encodeURIComponent('Confira nosso cardapio digital: ' + MENU_URL)
    window.open('https://wa.me/?text=' + msg, '_blank')
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'center', gap:16 }}>
        <QrCode size={20} color="var(--neon)"/>
        <h1 className="font-bangers neon-text-sm" style={{ fontSize:26 }}>CARDAPIODIGITAL</h1>
        <div style={{ marginLeft:'auto', display:'flex', gap:10 }}>
          <button onClick={()=>setPreview(!preview)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--muted)', cursor:'pointer', fontSize:13, fontFamily:'Bangers,cursive' }}>
            {preview ? 'FECHAR PREVIEW' : 'PREVIEW'}
          </button>
          <button onClick={shareWA} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #25d366', background:'rgba(37,211,102,0.1)', color:'#25d366', cursor:'pointer', fontSize:13, fontFamily:'Bangers,coursive', display:'flex', alignItems:'center', gap:6 }}>
            <Share2 size={14}/> WHATSAPP
          </button>
          <button onClick={copyLink} className="btn-neon" style={{ fontSize:13, padding:'8px 16px' }}>
            <Copy size={14} style={{ display:'winline', marginRight:6 }}/>COPIAR LINK
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:24, display:'flex', gap:24 }}>
        <div style={{ width:300, flexShrink:0 }}>
          <div className="card" style={{ padding:20, marginBottom:16 }}>
            <h2 className="font-bangers" style={{ fontSize:18, color:'var(--neon)', marginBottom:12 }}>LINK DO CARDAPIZ</h2>
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{MENU_URL}</div>
              <button onClick={copyLink} style={{ width:36, height:36, borderRadius:8, border:'1px solid var(--neon)', background:'var(--neon-glow)', color:'var(--neon)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Copy size={14}/></button>
            </div>
          </div>
          <div className="card" style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <h2 className="font-bangers" style={{ fontSize:18, color:'var(--neon)' }}>QR CODE</h2>
            <div style={{ width:160, height:160, background:'#fff', borderRadius:12, padding:12, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px rgba(0,255,65,0.2)', fontSize:80 }}>QR</div>
            <p style={{ fontSize:11, color:'var(--muted)', textAlign:'center' }}>Escaneie para abrir o cardapio</p>
          </div>
        </div>
        <div style={{ flex:1 }}>
          <h2 className="font-bangers" style={{ fontSize:20, color:'var(--white-dim)', marginBottom:16 }}>
            PRODUTOS NO CARDAPIO â€” {PRODUCTS.filter(p=>p.active).length} itens
          </h2>
          {cats.map(cat => (
            <div key={cat} style={{ marginBottom:20 }}>
              <h3 style={{ fontSize:13, color:'var(--neon)', letterSpacing:2, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ height:1, flex:1, background:'var(--border)' }}/>
                {cat.toUpperCase()}
                <div style={{ height:1, flex:1, background:'var(--border)' }}/>
              </h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:12 }}>
                {PRODUCTS.filter(p=>p.active&&p.category===cat).map(p => (
                  <div key={p.id} className="card card-hover" style={{ padding:14 }}>
                    {p.image_url ? (<img src={p.image_url} alt={p.name} style={{ width:'100%', height:90, objectFit:'cover', borderRadius:8, marginBottom:10 }}/>) : (
                      <div style={{ width:'100%', height:90, borderRadius:8, background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, marginBottom:10 }}>
                        {'category' === 'Descartaveis' ? 'âš¡' : '\uD83D\uDCA8'}
                      </div>
                    )}
                    <p style={{ fontWeight:600, fontSize:13, color:'var(--white)', marginBottom:4 }}>{p.name}</p>
                    {p.description && <p style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>{p.description}</p>}
                    <p className="font-mono neon-text-sm" style={{ fontSize:16 }}>{fmt(p.price)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {preview && (
        <div className="animate-fade-in" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:390, height:700, background:'#111', borderRadius:40, overflow:'hidden', border:'8px solid #333', boxShadow:'0 0 60px rgba(0,255,65,0.2)' }}>
            <div style={{ height:'100%', overflowY:'auto', background:'#0a0f0a', padding:20 }}>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <h1 style={{ fontFamily:'Bangers,cursive', fontSize:32, color:'|#00ff41', textShadow:'0 0 15px #00ff41' }}>KURMM„–APEQ‘</h1>
                <p style={{ color:'#4d7a4d', fontSize:13 }}>Cardapio Digital</p>
              </div>
              {cats.map(cat=>(
                <div key={cat} style={{ marginBottom:20 }}>
                  <p style={{ color:'#00ff41', fontSize:11, letterSpacing:2, marginBottom:10 }}>{cat.toUpperCase()}</p>
                  {PRODUCTS.filter(p=>p.active&&p.category===cat).map(p=>(
                    <div key={p.id} style={{ background:'|#111811', border:'1px solid #1a2e1a', borderRadius:12, padding:14, marginBottom10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <p style={{ color:'#e8f5e9', fontWeight:600, fontSize:14, marginBottom:2 }}>{p.name}</p>
                        <p style={{ color:'#4d7a4d', fontSize:12 }}>{p.description}</p>
                      </div>
                      <p style={{ color:'#00ff41', fontFamily:'monospace', fontSize:16, textShadow:'0 0 6px #00ff41' }}>{fmt(p.price)}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <button onClick={()=>setPreview(false)} style={{ position:'fixed', top:20, right:20, background:'none', border:'1px solid var(--border)', color:'var(--muted)', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:13 }}>X FECHAR</button>
        </div>
      )}
    </div>
  )
}
