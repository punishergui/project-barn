type BarnLogoProps = {
  size?: number;
  className?: string;
};

export default function BarnLogo({ size = 24, className }: BarnLogoProps) {
  return (
    <svg
      viewBox="0 0 80 64"
      role="img"
      aria-label="Project Barn logo"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M40 4L6 26H74L40 4Z" fill="currentColor" />
      <path d="M12 26H68V58C68 59.105 67.105 60 66 60H14C12.895 60 12 59.105 12 58V26Z" fill="currentColor" />
      <path d="M24 30H16V58H24V30Z" fill="white" fillOpacity="0.16" />
      <path d="M64 30H56V58H64V30Z" fill="white" fillOpacity="0.16" />
      <path d="M28 32H20V42H28V32Z" fill="white" fillOpacity="0.94" />
      <path d="M60 32H52V42H60V32Z" fill="white" fillOpacity="0.94" />
      <path
        d="M32 58V36C32 34.895 32.895 34 34 34H46C47.105 34 48 34.895 48 36V58"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M40 34V58" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M34 44L40 48L46 44" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 26L40 11L64 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
      <path d="M14 58H66" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
