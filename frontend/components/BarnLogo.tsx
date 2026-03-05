import Image from "next/image";

type BarnLogoProps = {
  size?: number;
  className?: string;
};

export default function BarnLogo({ size = 24, className }: BarnLogoProps) {
  return (
    <Image
      src="/brand/barn-logo.png"
      alt="Project Barn logo"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
