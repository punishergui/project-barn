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
      <path d="M32 3L4 18H60L32 3Z" fill="currentColor" />
      <rect x="9" y="18" width="46" height="27" rx="4" fill="currentColor" />
      <path d="M23 24H16V31H23V24Z" fill="white" fillOpacity="0.96" />
      <path d="M48 24H41V31H48V24Z" fill="white" fillOpacity="0.96" />
      <path d="M24 45V27.5C24 26.12 25.12 25 26.5 25H37.5C38.88 25 40 26.12 40 27.5V45" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 25V45" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M24.5 31L32 36L39.5 31" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 19V10.5H37V19" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 13H37" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
