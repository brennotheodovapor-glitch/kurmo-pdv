const ALARM_KEY='kurmo_alarm'

export function playAlarmSound(){
  try{
    const ctx=new(window.AudioContext||(window as any).webkitAudioContext)()
    const master=ctx.createGain();master.gain.value=0.8;master.connect(ctx.destination)

    // Phone ring pattern: RING-RING ... pause ... RING-RING
    const ringBurst=(startTime:number)=>{
      // Dual-tone like phone: 440Hz + 480Hz (classic DTMF ring)
      [440,480,540,600].forEach(freq=>{
        const o=ctx.createOscillator();const g=ctx.createGain()
        o.type='sine';o.frequency.value=freq
        o.connect(g);g.connect(master)
        // Ring envelope: quick attack, sustained, quick release
        g.gain.setValueAtTime(0,startTime)
        g.gain.linearRampToValueAtTime(0.25,startTime+0.05)
        g.gain.setValueAtTime(0.25,startTime+0.35)
        g.gain.linearRampToValueAtTime(0,startTime+0.4)
        o.start(startTime);o.stop(startTime+0.45)
      })
    }
    // Vibrating ring modulation
    const modRing=(startTime:number,duration:number)=>{
      const o=ctx.createOscillator();const g=ctx.createGain()
      const lfo=ctx.createOscillator()
      o.type='square';o.frequency.value=800
      lfo.frequency.value=25// vibrato
      lfo.connect(g.gain)
      o.connect(g);g.connect(master)
      g.gain.setValueAtTime(0.15,startTime)
      o.start(startTime);o.stop(startTime+duration)
      lfo.start(startTime);lfo.stop(startTime+duration)
    }
    // RING x2 pattern at t=0
    ringBurst(0);ringBurst(0.5)
    modRing(0,1.0)
    // pause 1s then RING x2 again
    ringBurst(2.0);ringBurst(2.5)
    modRing(2.0,1.0)
    // pause 1s then RING x2 again
    ringBurst(4.0);ringBurst(4.5)
    modRing(4.0,1.0)
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
