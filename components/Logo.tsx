/**
 * Marca do TenhaVoz: várias vozes em um só balão. As barras têm alturas
 * diferentes porque cada pessoa fala de um jeito, mas o som sai junto.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M24 3C12.4 3 3 10.6 3 20.4c0 5.5 3 10.4 7.7 13.5-.4 3-1.6 5.6-3.8 7.7 4-.1 7.7-1.6 10.6-4.1 1.9.5 3.5.7 5.5.7C35.6 38.2 45 30.2 45 20.4 45 10.6 35.6 3 24 3z"
        fill="currentColor"
      />
      <rect x="12.5" y="17" width="4" height="7" rx="2" fill="#ffc61a" />
      <rect x="19" y="11" width="4" height="19" rx="2" fill="#ffc61a" />
      <rect x="25.5" y="14" width="4" height="13" rx="2" fill="#ffc61a" />
      <rect x="32" y="18.5" width="4" height="4" rx="2" fill="#ffc61a" />
    </svg>
  );
}
