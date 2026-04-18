const ALARM_KEY='kurmo_new_order'

export function playAlarmSound(){
  try{
    const ctx=new AudioContext()
    const vol=ctx.createGain()
    vol.connect(ctx.destination)
    vol.gain.value=0.6
    // Irritating square wave pattern — 20 rapid beeps
    const freqs=[1200,900,1200,900,1200,900,1200,900,1200,900,1200,900,1200,900,1200,900,1200,900,1200,900]
    freqs.forEach((f,i)=>{
      const o=ctx.createOscillator()
      const g=ctx.createGain()
      o.type='square'
      o.frequency.value=f
      o.connect(g);g.connect(vol)
      const t=ctx.currentTime+i*0.08
      g.gain.setValueAtTime(0.5,t)
      g.gain.exponentialRampToValueAtTime(0.001,t+0.07)
      o.start(t);o.stop(t+0.08)
    })
  }catch(e){console.warn('alarm:',e)}
}

export function triggerGlobalAlarm(){
  playAlarmSound()
  // Signal other tabs via localStorage event
  localStorage.setItem(ALARM_KEY, Date.now().toString())
  // Cleanup after 1s to allow re-triggering
  setTimeout(()=>localStorage.removeItem(ALARM_KEY),1000)
  // Also BroadcastChannel for same-tab-group
  try{
    const bc=new BroadcastChannel('kurmo_alarm')
    bc.postMessage('ring')
    setTimeout(()=>bc.close(),500)
  }catch{}
}

// Call this inside a useEffect in App — NOT inside another callback
export function setupAlarmListener(onAlarm:()=>void):()=>void{
  const storageHandler=(e:StorageEvent)=>{
    if(e.key===ALARM_KEY&&e.newValue)onAlarm()
  }
  window.addEventListener('storage',storageHandler)
  let bc:BroadcastChannel|null=null
  try{
    bc=new BroadcastChannel('kurmo_alarm')
    bc.onmessage=()=>onAlarm()
  }catch{}
  return()=>{
    window.removeEventListener('storage',storageHandler)
    bc?.close()
  }
}
