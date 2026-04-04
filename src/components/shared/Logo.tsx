
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0a1a0a"/>
          <stop offset="100%" stopColor="#0d1f0d"/>
        </linearGradient>
        <linearGradient id="bolt" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="100%" stopColor="#00ff41"/>
        </linearGradient>
      </defs>
      <polygon points="20,1 37,10.5 37,29.5 20,39 3,29.5 3,10.5"
        fill="url(#bg)" stroke="#00ff41" strokeWidth="1.5"/>
      <path d="M22 5 L13 21 L20 21 L17 35 L29 18 L21.5 18 L26 5 Z"
        fill="url(#bolt)"/>
    </svg>
  )
}
