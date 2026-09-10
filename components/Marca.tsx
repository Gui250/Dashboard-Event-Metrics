export function Marca({ size = 44 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Fazendinha Resort Privé"
      className="shrink-0"
    >
      <circle cx="32" cy="32" r="28" fill="none" stroke="#c69630" strokeWidth="1.6" />
      <path
        d="M20 50c-6-6-8-14-4-21 3-6 11-8 16-4 4 3 5 8 4 13"
        fill="none"
        stroke="#c69630"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M36 12c6 4 9 11 8 18-1 8-7 14-14 17"
        fill="none"
        stroke="#e3c179"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <ellipse cx="34" cy="34" rx="4.2" ry="2.4" fill="#8c1024" />
    </svg>
  );
}
