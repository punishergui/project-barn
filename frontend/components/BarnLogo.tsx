type BarnLogoProps = {
  size?: number;
  className?: string;
};

export default function BarnLogo({ size = 24, className }: BarnLogoProps) {
  return (
    <svg
      viewBox="0 0 64 48"
      role="img"
      aria-label="Project Barn logo"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 19.5L32 2L60 19.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="20" width="44" height="24" rx="4" fill="currentColor" />
      <rect x="27" y="28" width="10" height="16" rx="2" fill="white" fillOpacity="0.95" />
      <path d="M23 26H17V32H23V26Z" fill="white" fillOpacity="0.95" />
      <path d="M47 26H41V32H47V26Z" fill="white" fillOpacity="0.95" />
      <path d="M26 20L32 14L38 20" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
