import{useState,useEffect,useCallback}from 'react'
import{supabase}from '@/lib/supabase'
import toast from 'react-hot-toast'

export type CashRegister={id:string;opened_at:string;closed_at:string|null;opening_balance:number;closing_balance:number|null;status:'open'|'closed';notes:string|null}

export function useCashRegister(){
  const[current,setCurrent]=useState<CashRegister|null|undefined>(undefined) // undefined=loading
  const[openModal,setOpenModal]=useState(false)
  const[closeModal,setCloseModal]=useState(false)
  const[openBal,setOpenBal]=useState('')
  const[closeBal,setCloseBal]=useState('')
  const[closeNotes,setCloseNotes]=useState('')
  const[saving,setSaving]=useState(false)

  const loadCurrent=useCallback(async()=>{
    const{data}=await supabase.from('cash_registers').select('*').eq('status','open').order('opened_at',{ascending:false}).limit(1).maybeSingle()
    setCurrent(data||null)
  },[])

  useEffect(()=>{loadCurrent()},[loadCurrent])

  async function openCash(){
    setSaving(true)
    const{error}=await supabase.from('cash_registers').insert({opening_balance:parseFloat(openBal)||0,status:'open'})
    if(error){toast.error(error.message);setSaving(false);return}
    toast.success('Caixa aberto!')
    setOpenModal(false);setOpenBal('');await loadCurrent();setSaving(false)
  }

  async function closeCash(expectedTotal:number){
    if(!current)return
    setSaving(true)
    const closing=parseFloat(closeBal)||expectedTotal
    const{error}=await supabase.from('cash_registers').update({status:'closed',closed_at:new Date().toISOString(),closing_balance:closing,notes:closeNotes||null}).eq('id',current.id)
    if(error){toast.error(error.message);setSaving(false);return}
    toast.success('Caixa fechado!')
    setCloseModal(false);setCloseBal('');setCloseNotes('');await loadCurrent();setSaving(false)
  }

  const isLoading=current===undefined
  const isOpen=!!current

  return{current,isOpen,isLoading,openModal,closeModal,openBal,closeBal,closeNotes,saving,setOpenModal,setCloseModal,setOpenBal,setCloseBal,setCloseNotes,openCash,closeCash,reload:loadCurrent}
}