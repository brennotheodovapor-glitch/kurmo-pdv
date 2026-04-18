const ALARM_KEY='kurmo_alarm'

export function playAlarmSound(){
  try{
    const ctx=new(window.AudioContext||(window as any).webkitAudioContext)()
    const master=ctx.createGain();master.gain.value=0.8;master.connect(ctx.destination)
    
    // Phone ring pattern: RING-RING ... pause ... RING-RING
    function beep(freq:number,start:number,dur:number,vol=0.8,type:'sine'|'square'='sine'){
      const o=ctx.createOscillator();const g=ctx.createGain()
      o.type=type;o.frequency.value=freq
      o.connect(g);g.connect(master)
      g.gain.setValueAtTime(0,start)
      g.gain.linearRampToValueAtTime(vol,start+0.01)
      g.gain.setValueAtTime(vol,start+dur-0.02)
      g.gain.linearRampToValueAtTime(0,start+dur)
      o.start(start);o.stop(start+dur+0.05)
    }
    
    // Classic phone ring: alternating tones 480Hz + 620Hz, 2 bursts
    // Burst 1: 0.0s - 0.5s
    beep(480, 0.0, 0.4, 0.7)
    beep(620, 0.0, 0.4, 0.7)
    // Pause 0.5s - 0.7s
    // Burst 2: 0.7s - 1.2s  
    beep(480, 0.7, 0.4, 0.7)
    beep(620, 0.7, 0.4, 0.7)
    // Pause 1.2s - 2.0s
    // Burst 3: 2.0s - 2.5s
    beep(480, 2.0, 0.4, 0.7)
    beep(620, 2.0, 0.4, 0.7)
    // Burst 4: 2.7s - 3.2s
    beep(480, 2.7, 0.4, 0.7)
    beep(620, 2.7, 0.4, 0.7)
  }catch(e){console.warn('alarm:',e)}
}

export function broadcastAlarm(){
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
