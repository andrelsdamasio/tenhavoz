import { buildWhatsAppSupportUrl } from "@/lib/support";

/**
 * Botão flutuante de suporte: abre direto a conversa no WhatsApp. É só um
 * link (sem JavaScript), então funciona em qualquer página, inclusive nas
 * renderizadas no servidor e em cache. O ícone é um balão de conversa
 * genérico, desenhado aqui.
 */
export default function WhatsAppSupportButton({
  userEmail,
  className = "",
}: {
  userEmail?: string | null;
  className?: string;
}) {
  return (
    <a
      href={buildWhatsAppSupportUrl(userEmail)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o suporte no WhatsApp"
      className={`fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.2A8.4 8.4 0 1 1 21 11.5z" />
        <path d="M8.5 10h7M8.5 13.5h4.5" />
      </svg>
      Suporte no WhatsApp
    </a>
  );
}
