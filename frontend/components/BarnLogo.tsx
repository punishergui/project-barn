type BarnLogoProps = { size?: number; className?: string };

export default function BarnLogo({ size = 24, className }: BarnLogoProps) {
  const h = Math.round(size * 0.9);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 100 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Project Barn logo"
      className={className}
    >
      <path d="M5 42 L22 20 L50 8 L78 20 L95 42 Z" fill="currentColor" opacity="0.9"/>
      <path d="M22 20 L50 8 L78 20 L68 42 L32 42 Z" fill="currentColor" opacity="0.7"/>
      <rect x="14" y="42" width="72" height="42" rx="2" fill="currentColor" opacity="0.9"/>
      <line x1="14" y1="52" x2="86" y2="52" stroke="white" strokeWidth="0.8" strokeOpacity="0.2"/>
      <line x1="14" y1="62" x2="86" y2="62" stroke="white" strokeWidth="0.8" strokeOpacity="0.2"/>
      <line x1="14" y1="72" x2="86" y2="72" stroke="white" strokeWidth="0.8" strokeOpacity="0.2"/>
      <path d="M42 12 L50 8 L58 12 L58 22 L42 22 Z" fill="black" fillOpacity="0.35"/>
      <rect x="44" y="14" width="12" height="7" rx="1" fill="black" fillOpacity="0.3"/>
      <rect x="22" y="52" width="24" height="32" rx="2" fill="black" fillOpacity="0.2"
        stroke="white" strokeWidth="1.5" strokeOpacity="0.5"/>
      <rect x="54" y="52" width="24" height="32" rx="2" fill="black" fillOpacity="0.2"
        stroke="white" strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="22" y1="52" x2="46" y2="84" stroke="white" strokeWidth="1.2" strokeOpacity="0.35"/>
      <line x1="46" y1="52" x2="22" y2="84" stroke="white" strokeWidth="1.2" strokeOpacity="0.35"/>
      <line x1="54" y1="52" x2="78" y2="84" stroke="white" strokeWidth="1.2" strokeOpacity="0.35"/>
      <line x1="78" y1="52" x2="54" y2="84" stroke="white" strokeWidth="1.2" strokeOpacity="0.35"/>
      <rect x="16" y="48" width="8" height="7" rx="1" fill="black" fillOpacity="0.3"
        stroke="white" strokeWidth="1" strokeOpacity="0.4"/>
      <rect x="76" y="48" width="8" height="7" rx="1" fill="black" fillOpacity="0.3"
        stroke="white" strokeWidth="1" strokeOpacity="0.4"/>
    </svg>
  );
}
