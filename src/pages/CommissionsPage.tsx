import { useState, useEffect } from 'react'
import { BarChart3, Download, TrendingUp, DollarSign, Users, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Seller = {id:string;name:string;email:string;commission_pct:number}
type SellerStats = {seller:Seller;total_orders:number;total_sales:number;commission_amount:number;orders:any[]}
const fmt = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
const TS = {contentStyle:{background:'#161625',border:'1px solid #1e1e2e',borderRadius:12,color:'#e2e8f0',fontSize:12}}

export default function CommissionsPage() {
  const [stats,setStats] = useState<SellerStats[]>([])
  const [month,setMonth] = useState(new Date().toISOString().substring(0,7))
  const [loading,setLoading] = useState(true)
  const [selected,setSelected] = useState<string|null>(null)

  useEffect(()=>{loadData()},[month])

  async function loadData() {
    setLoading(true)
    const {data:sels} = await supabase.from('sellers').select('*').eq('active',true)
    const start = month+'-01'
    const end = new Date(new Date(start).getFullYear(),new Date(start).getMonth()+1,1).toISOString().split('T')[0]
    const {data:orders} = await supabase.from('orders').select('id,order_number,total,seller_id,created_at,customer_name').eq('status','completed').gte('created_at',start).lt('created_at',end)
    const result: SellerStats[] = (sels||[]).map(s=>{
      const selOrders = (orders||[]).filter(o=>o.seller_id===s.id)
      const total_sales = selOrders.reduce((sum,o)=>sum+o.total,0)
      return {seller:s,total_orders:selOrders.length,total_sales,commission_amount:+(total_sales*s.commission_pct/100).toFixed(2),orders:selOrders}
    }).sort((a,b)=>b.total_sales-a.total_sales)
    setStats(result); setLoading(false)
  }

  function exportCSV() {
    const monthName = new Date(month+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
    let csv = 'RELATORIO DE COMISSOES - '+monthName.toUpperCase()+'\n\n'
    csv += 'Vendedor,Email,Comissao %,Total Pedidos,Total Vendas,Valor Comissao\n'
    stats.forEach(s=>{ csv += [s.seller.name,s.seller.email,s.seller.commission_pct+'%',s.total_orders,'R$ '+s.total_sales.toFixed(2),'R$ '+s.commission_amount.toFixed(2)].join(',')+('\n') })
    csv += '\nTOTAL,,,'+stats.reduce((s,x)=>s+x.total_orders,0)+',R$ '+stats.reduce((s,x)=>s+x.total_sales,0).toFixed(2)+',R$ '+stats.reduce((s,x)=>s+x.commission_amount,0).toFixed(2)
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download='comissoes-'+month+'.csv'; a.click()
    toast.success('Relatorio exportado!')
  }

  const totals = stats.reduce((acc,s)=>({sales:acc.sales+s.total_sales,comm:acc.comm+s.commission_amount,orders:acc.orders+s.total_orders}),{sales:0,comm:0,orders:0})
  const selDetail = selected ? stats.find(s=>s.seller.id===selected) : null
  const chartData = stats.filter(s=>s.total_sales>0).map(s=>({name:s.seller.name.split(' ')[0],vendas:s.total_sales,comissao:s.commission_amount}))

  return (
    <div style={{height:'100%',overflowY:'auto',background:'var(--bg)'}}>
      <div style={{padding:24,maxWidth:1100,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <BarChart3 size={20} color="var(--neon)"/>
            <h1 className="font-bangers neon-text-sm" style={{fontSize:26}}>COMISSOES DOS VENDEDORES</h1>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'7px 12px'}}>
              <Calendar size={14} color="var(--muted)"/>
              <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{background:'transparent',border:'none',color:'var(--text)',outline:'none',fontSize:13,cursor:'pointer'}}/>
            </div>
            <button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,background:'var(--card)',border:'1px solid var(--border)',color:'var(--muted)',cursor:'pointer',fontSize:13,fontFamily:'Bangers,cursive'}}>
              <Download size={14}/> EXPORTAR CSV
            </button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
          {[
            {label:'Total Vendas',value:fmt(totals.sales),icon:DollarSign,color:'#10b981'},
            {label:'Total Comissoes',value:fmt(totals.comm),icon:TrendingUp,color:'#7c3aed'},
            {label:'Total Pedidos',value:String(totals.orders),icon:Users,color:'#06b6d4'},
          ].map((k,i)=>(
            <div key={i} className="card" style={{padding:20,display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:46,height:46,borderRadius:12,background:k.color+'20',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><k.icon size={22} style={{color:k.color}}/></div>
              <div><p style={{fontSize:21,fontWeight:700,color:'var(--white)',fontFamily:'JetBrains Mono,monospace'}}>{k.value}</p><p style={{fontSize:12,color:'var(--muted)'}}>{k.label}</p></div>
            </div>
          ))}
        </div>

        {chartData.length>0 && (
          <div className="card" style={{padding:20,marginBottom:20}}>
            <h2 style={{fontWeight:600,color:'var(--white)',marginBottom:14,fontSize:14}}>Comparativo de Vendas por Vendedor</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e"/>
                <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:12}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#64748b',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>'R$'+v}/>
                <Tooltip {...TS} formatter={(v:number,name:string)=>[fmt(v),name==='vendas'?'Vendas':'Comissao']}/>
                <Bar dataKey="vendas" fill="#00ff41" radius={[4,4,0,0]} name="vendas"/>
                <Bar dataKey="comissao" fill="#7c3aed" radius={[4,4,0,0]} name="comissao"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {loading ? <div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Carregando dados...</div> : (
          <div className="card" style={{overflow:'hidden',marginBottom:16}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                {['VENDEDOR','PEDIDOS','TOTAL VENDAS','COMISSAO %','VALOR COMISSAO',''].map(h=><th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {stats.map(s=>(
                  <>
                  <tr key={s.seller.id} style={{borderBottom:'1px solid rgba(26,46,26,0.5)',cursor:'pointer',background:selected===s.seller.id?'rgba(0,255,65,0.04)':'transparent'}} onClick={()=>setSelected(selected===s.seller.id?null:s.seller.id)}>
                    <td style={{padding:'13px 16px'}}>
                      <p style={{fontWeight:600,color:'var(--white)',fontSize:14}}>{s.seller.name}</p>
                      <p style={{fontSize:11,color:'var(--muted)'}}>{s.seller.email}</p>
                    </td>
                    <td style={{padding:'13px 16px',fontFamily:'JetBrains Mono,monospace',fontSize:14,color:'var(--text)'}}>{s.total_orders}</td>
                    <td style={{padding:'13px 16px',fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:600,color:'var(--neon)'}}>{fmt(s.total_sales)}</td>
                    <td style={{padding:'13px 16px'}}><span style={{fontSize:13,fontWeight:700,padding:'3px 10px',borderRadius:20,background:'rgba(0,255,65,0.1)',color:'var(--neon)',fontFamily:'JetBrains Mono,monospace'}}>{s.seller.commission_pct}%</span></td>
                    <td style={{padding:'13px 16px',fontFamily:'JetBrains Mono,monospace',fontSize:17,fontWeight:700,color:'#7c3aed'}}>{fmt(s.commission_amount)}</td>
                    <td style={{padding:'13px 16px',color:'var(--muted)'}}>{selected===s.seller.id?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</td>
                  </tr>
                  {selected===s.seller.id && selDetail && (
                    <tr key={s.seller.id+'_detail'}><td colSpan={6} style={{padding:'0 16px 14px',borderBottom:'1px solid var(--border)'}}>
                      <p style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>Pedidos de {selDetail.seller.name} em {new Date(month+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}:</p>
                      {selDetail.orders.length===0 ? <p style={{color:'var(--muted)',fontSize:12,fontStyle:'italic'}}>Nenhum pedido neste periodo.</p> : (
                        <table style={{width:'100%',borderCollapse:'collapse'}}>
                          <thead><tr style={{borderBottom:'1px solid var(--border)'}}>{['#','Cliente','Valor','Data'].map(h=><th key={h} style={{padding:'5px 10px',textAlign:'left',fontSize:10,color:'var(--muted)',fontWeight:600}}>{h}</th>)}</tr></thead>
                          <tbody>{selDetail.orders.map(o=>(
                            <tr key={o.id} style={{borderBottom:'1px solid rgba(26,46,26,0.3)'}}>
                              <td style={{padding:'5px 10px',fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--neon)'}}>#{o.order_number}</td>
                              <td style={{padding:'5px 10px',fontSize:12,color:'var(--text)'}}>{o.customer_name||'—'}</td>
                              <td style={{padding:'5px 10px',fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:600,color:'var(--white)'}}>{fmt(o.total)}</td>
                              <td style={{padding:'5px 10px',fontSize:11,color:'var(--muted)'}}>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      )}
                    </td></tr>
                  )}
                  </>
                ))}
                {stats.length===0 && <tr><td colSpan={6} style={{textAlign:'center',padding:48,color:'var(--muted)'}}>Nenhum vendedor ativo encontrado</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}