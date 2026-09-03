interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className ? `logo-mark ${className}` : "logo-mark"}
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="14" className="logo-mark__base" />
      <rect x="13" y="15" width="22" height="5" rx="2.5" className="logo-mark__bar" />
      <rect x="13" y="24" width="16" height="5" rx="2.5" className="logo-mark__bar" />
      <rect x="13" y="33" width="10" height="5" rx="2.5" className="logo-mark__bar" />
    </svg>
  );
}

interface LogotypeProps {
  size?: number;
  className?: string;
}

export function Logotype({ size = 28, className }: LogotypeProps) {
  return (
    <span className={className ? `logotype ${className}` : "logotype"}>
      <LogoMark size={size} />
      <span className="logotype__word">Clearing</span>
    </span>
  );
}
