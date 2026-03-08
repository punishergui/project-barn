type BarnLogoProps = {
  size?: number;
  className?: string;
};

export default function BarnLogo({ size = 24, className }: BarnLogoProps) {
  return (
    <svg
      viewBox="0 0 96 80"
      role="img"
      aria-label="Project Barn logo"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M48 6L12 24H84L48 6Z" fill="currentColor" />
      <path d="M20 24H76V70C76 72.2 74.2 74 72 74H24C21.8 74 20 72.2 20 70V24Z" fill="currentColor" />
      <path d="M28 34H40V46H28V34Z" fill="white" fillOpacity="0.92" />
      <path d="M56 34H68V46H56V34Z" fill="white" fillOpacity="0.92" />
      <circle cx="48" cy="31" r="6" fill="white" fillOpacity="0.92" />
      <path d="M42 74V48C42 46.3 43.3 45 45 45H51C52.7 45 54 46.3 54 48V74" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M31 74V52C31 50.3 32.3 49 34 49H39V74" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M57 74V49H62C63.7 49 65 50.3 65 52V74" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M45 57L48 60L51 57" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31.5 58.5L38.5 65.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M38.5 58.5L31.5 65.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M57.5 58.5L64.5 65.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M64.5 58.5L57.5 65.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 24L48 12L72 24" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
      <path d="M24 74H72" stroke="white" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
