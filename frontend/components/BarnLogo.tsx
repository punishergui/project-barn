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
      <path
        d="M8 33.5L26.5 18.5L40.5 24.5L48 15L55.5 24.5L69.5 18.5L88 33.5V35.5H8V33.5Z"
        fill="currentColor"
      />
      <path
        d="M15 35H81V67C81 70.3137 78.3137 73 75 73H21C17.6863 73 15 70.3137 15 67V35Z"
        fill="currentColor"
      />
      <path
        d="M24 35L37.5 25.5L48 30.5L58.5 25.5L72 35"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <rect x="24" y="43" width="12" height="10" rx="1.5" fill="white" fillOpacity="0.92" />
      <rect x="60" y="43" width="12" height="10" rx="1.5" fill="white" fillOpacity="0.92" />
      <path
        d="M40 73V50.5C40 48.2909 41.7909 46.5 44 46.5H52C54.2091 46.5 56 48.2909 56 50.5V73"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path d="M48 16V30" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity="0.95" />
      <path d="M45 56L48 59L51 56" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 73H81" stroke="white" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
      <circle cx="30" cy="58.5" r="1.8" fill="white" fillOpacity="0.9" />
      <circle cx="66" cy="58.5" r="1.8" fill="white" fillOpacity="0.9" />
    </svg>
  );
}
