const ALARM_KEY='kurmo_alarm'

export function playAlarmSound(){
  try{
    const ctx=new(window.AudioContext||(window as any).webkitAudioContext)()
    const vol=ctx.createGain();vol.gain.value=0.7;vol.connect(ctx.destination)
    const freqs=[1200,900,1200,900,1200,900,1200,900,1400,1000,1400,1000,1400,1000,1600,1000,1600,1000,1600,1000]
    freqs.forEach((f,i)=>{
      const o=ctx.createOscillator();const g=ctx.createGain()
      o.type='square';o.frequency.value=f
      o.connect(g);g.connect(vol)
      const t=ctx.currentTime+i*0.09
      g.gain.setValueAtTime(0.7,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.08)
      o.start(t);o.stop(t+0.1)
    })
  }catch(e){console.warn('alarm sound error:',e)}
}

export function broadcastAlarm(){
  // Save timestamp to localStorage — triggers 'storage' event in ALL other tabs
  localStorage.setItem(ALARM_KEY,Date.now().toString())
  setTimeout(()=>localStorage.removeItem(ALARM_KEY),500)
  try{const bc=new BroadcastChannel(ALARM_KEY);bc.postMessage('ring');setTimeout(()=>bc.close(),300)}catch{}
}

export function setupAlarmListener(onAlarm:()=>void):()=>void{
  const handler=(e:StorageEvent)=>{if(e.key===ALARM_KEY&&e.newValue)onAlarm()}
  window.addEventListener('storage',handler)
  let bc:BroadcastChannel|null=null
  try{bc=new BroadcastChannel(ALARM_KEY);bc.onmessage=()=>onAlarm()}catch{}
  return()=>{window.removeEventListener('storage',handler);bc?.close()}
}
