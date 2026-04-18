// Global alarm sound - plays in ANY tab via BroadcastChannel + localStorage
const ALARM_KEY='kurmo_alarm_ts'
const ALARM_CH='kurmo_alarm'

export function triggerGlobalAlarm(){
  // Signal via localStorage (works across tabs in same origin)
  localStorage.setItem(ALARM_KEY,Date.now().toString())
  // Also via BroadcastChannel
  try{new BroadcastChannel(ALARM_CH).postMessage('alarm')}catch{}
}

export function playAlarmSound(){
  try{
    const ctx=new AudioContext()
    const play=(freq:number,start:number,dur:number,vol=0.4)=>{
      const o=ctx.createOscillator()
      const g=ctx.createGain()
      o.connect(g);g.connect(ctx.destination)
      o.type='square'
      o.frequency.setValueAtTime(freq,ctx.currentTime+start)
      g.gain.setValueAtTime(0,ctx.currentTime+start)
      g.gain.linearRampToValueAtTime(vol,ctx.currentTime+start+0.01)
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+start+dur)
      o.start(ctx.currentTime+start)
      o.stop(ctx.currentTime+start+dur+0.05)
    }
    // Irritating alarm pattern: rapid beeps at high freq
    const pattern=[880,1100,880,1100,880,1100,660,880,1100,880]
    pattern.forEach((f,i)=>play(f,i*0.12,0.1,0.5))
    // Second burst after short pause
    pattern.forEach((f,i)=>play(f,1.4+i*0.12,0.1,0.5))
  }catch(e){console.warn('Audio error:',e)}
}

export function useGlobalAlarm(enabled:boolean){
  if(typeof window==='undefined')return
  // Listen for alarms from other tabs
  const handler=(e:StorageEvent)=>{
    if(e.key===ALARM_KEY&&enabled)playAlarmSound()
  }
  let bc:BroadcastChannel|null=null
  try{
    bc=new BroadcastChannel(ALARM_CH)
    bc.onmessage=()=>{if(enabled)playAlarmSound()}
  }catch{}
  window.addEventListener('storage',handler)
  return()=>{
    window.removeEventListener('storage',handler)
    bc?.close()
  }
}
