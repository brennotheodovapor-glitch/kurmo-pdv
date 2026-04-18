const ALARM_KEY='kurmo_alarm'

export function playAlarmSound(){
  try{
    const ctx=new(window.AudioContext||(window as any).webkitAudioContext)()
    const master=ctx.createGain()
    master.gain.value=0.8
    master.connect(ctx.destination)
    // Classic phone ring: 480Hz + 620Hz dual tone, 4 bursts
    function burst(t:number){
      [480,620].forEach(freq=>{
        const o=ctx.createOscillator()
        const g=ctx.createGain()
        o.type='sine';o.frequency.value=freq
        o.connect(g);g.connect(master)
        g.gain.setValueAtTime(0,t)
        g.gain.linearRampToValueAtTime(0.7,t+0.02)
        g.gain.setValueAtTime(0.7,t+0.38)
        g.gain.linearRampToValueAtTime(0,t+0.4)
        o.start(t);o.stop(t+0.42)
      })
    }
    // 4 bursts: 0s, 0.6s, 2.0s, 2.6s (classic ring-ring pattern)
    burst(ctx.currentTime+0.0)
    burst(ctx.currentTime+0.6)
    burst(ctx.currentTime+2.0)
    burst(ctx.currentTime+2.6)
  }catch(e){console.warn('alarm:',e)}
}

export function broadcastAlarm(){
  localStorage.setItem(ALARM_KEY,Date.now().toString())
  setTimeout(()=>localStorage.removeItem(ALARM_KEY),500)
  try{
    const bc=new BroadcastChannel(ALARM_KEY)
    bc.postMessage('ring')
    setTimeout(()=>bc.close(),300)
  }catch{}
}

export function setupAlarmListener(onAlarm:()=>void):()=>void{
  const handler=(e:StorageEvent)=>{
    if(e.key===ALARM_KEY&&e.newValue)onAlarm()
  }
  window.addEventListener('storage',handler)
  let bc:BroadcastChannel|null=null
  try{
    bc=new BroadcastChannel(ALARM_KEY)
    bc.onmessage=()=>onAlarm()
  }catch{}
  return()=>{
    window.removeEventListener('storage',handler)
    bc?.close()
  }
}
