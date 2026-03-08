type BarnLogoProps = {
  size?: number;
  className?: string;
};

export default function BarnLogo({ size = 24, className }: BarnLogoProps) {
  return (
    <svg
      viewBox="0 0 72 56"
      role="img"
      aria-label="Project Barn logo"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 23L20 12H30L36 6L42 12H52L64 23V48C64 51.314 61.314 54 58 54H14C10.686 54 8 51.314 8 48V23Z"
        fill="currentColor"
      />
      <path d="M28 23H18V33H28V23Z" fill="white" fillOpacity="0.95" />
      <path d="M54 23H44V33H54V23Z" fill="white" fillOpacity="0.95" />
      <path
        d="M29 54V33C29 31.343 30.343 30 32 30H40C41.657 30 43 31.343 43 33V54"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M36 30V54" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 40L36 44L42 40" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 18H50" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 48H56" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
