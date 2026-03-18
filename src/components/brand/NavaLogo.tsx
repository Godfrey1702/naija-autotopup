/**
 * Nava brand logo system.
 * - "full" variant: Icon + "Nava" wordmark
 * - "icon" variant: Just the rounded-square N icon
 */

interface NavaLogoProps {
  variant?: "full" | "icon";
  className?: string;
  iconSize?: number;
  textSize?: number;
}

export function NavaLogo({
  variant = "full",
  className = "",
  iconSize = 48,
  textSize = 36,
}: NavaLogoProps) {
  const iconElement = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="nava-icon-bg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C4CF1" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="28" fill="url(#nava-icon-bg)" />
      <text
        x="60"
        y="82"
        textAnchor="middle"
        fill="white"
        fontSize="72"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontWeight="800"
        letterSpacing="-2"
      >
        N
      </text>
    </svg>
  );

  if (variant === "icon") {
    return <div className={className}>{iconElement}</div>;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {iconElement}
      <svg
        height={textSize}
        viewBox="0 0 200 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="nava-n-gradient" x1="0" y1="0" x2="50" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6C4CF1" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
        <text
          x="0"
          y="48"
          fill="url(#nava-n-gradient)"
          fontSize="56"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="800"
          letterSpacing="-2"
        >
          N
        </text>
        <text
          x="38"
          y="48"
          fill="#E5E7EB"
          fontSize="56"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="700"
          letterSpacing="-2"
        >
          ava
        </text>
      </svg>
    </div>
  );
}
