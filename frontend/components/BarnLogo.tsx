type BarnLogoProps = { size?: number; className?: string };

export default function BarnLogo({ size = 24, className }: BarnLogoProps) {
  return (
    <svg
      viewBox="0 0 100 80"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Project Barn logo"
    >
      {/* Roof — wide gable overhanging walls */}
      <path d="M4 36 L50 6 L96 36 Z" fill="currentColor" />
      {/* Roof ridge cap */}
      <rect x="42" y="4" width="16" height="5" rx="2" fill="currentColor" />
      {/* Main barn walls */}
      <rect x="12" y="34" width="76" height="40" rx="2" fill="currentColor" />
      {/* Vertical board lines on siding */}
      <line x1="28" y1="34" x2="28" y2="74" stroke="white" strokeWidth="1.5" strokeOpacity="0.25" />
      <line x1="44" y1="34" x2="44" y2="74" stroke="white" strokeWidth="1.5" strokeOpacity="0.25" />
      <line x1="56" y1="34" x2="56" y2="74" stroke="white" strokeWidth="1.5" strokeOpacity="0.25" />
      <line x1="72" y1="34" x2="72" y2="74" stroke="white" strokeWidth="1.5" strokeOpacity="0.25" />
      {/* Loft vent window — centered at top of wall */}
      <rect x="43" y="38" width="14" height="10" rx="2" fill="white" fillOpacity="0.9" />
      <line x1="50" y1="38" x2="50" y2="48" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
      {/* Left barn door */}
      <rect x="18" y="50" width="25" height="24" rx="1.5" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
      {/* Right barn door */}
      <rect x="57" y="50" width="25" height="24" rx="1.5" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
      {/* Door handles */}
      <circle cx="41" cy="63" r="2" fill="white" fillOpacity="0.85" />
      <circle cx="59" cy="63" r="2" fill="white" fillOpacity="0.85" />
      {/* Ground line */}
      <line x1="8" y1="74" x2="92" y2="74" stroke="white" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round" />
    </svg>
  );
}
