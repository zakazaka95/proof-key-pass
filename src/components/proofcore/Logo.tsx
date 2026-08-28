interface LogoProps {
  className?: string;
  title?: string;
}

/** Original Proofcore mark: a checkmark passing through a geometric core. */
export function Logo({ className = "h-7 w-7", title = "Proofcore" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="11"
        y="11"
        width="10"
        height="10"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
      />
      <path
        d="M6 17.5L13.5 25L27 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
    </svg>
  );
}
