"use client";

interface TrackedMailtoLinkProps {
  campaignId: string;
  mailtoUrl: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Link mailto que registra um "click" antes de abrir o app de e-mail.
 * sendBeacon é assíncrono e não bloqueia a navegação — o mailto: abre
 * normalmente mesmo se o beacon falhar.
 */
export default function TrackedMailtoLink({
  campaignId,
  mailtoUrl,
  className,
  children,
}: TrackedMailtoLinkProps) {
  return (
    <a
      href={mailtoUrl}
      className={className}
      onClick={() => {
        const payload = JSON.stringify({ campaignId, type: "click" });
        navigator.sendBeacon?.("/api/track", new Blob([payload], { type: "application/json" }));
      }}
    >
      {children}
    </a>
  );
}
