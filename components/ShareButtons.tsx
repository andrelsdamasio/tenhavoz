"use client";

import { useState } from "react";

interface ShareButtonsProps {
  url: string;
  title: string;
  className?: string;
}

/**
 * Instagram não tem uma URL de compartilhamento web como WhatsApp/Facebook —
 * por isso não tem botão próprio aqui: a pessoa copia o link e cola nos
 * stories/bio pelo app do Instagram mesmo.
 */
export default function ShareButtons({ url, title, className = "" }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(title);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponível (ex.: contexto não seguro) — sem tratamento
      // especial, o link continua visível pra copiar manualmente.
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          WhatsApp
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Facebook
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? "Link copiado!" : "Copiar link"}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-gray-500">
        Para o Instagram, copie o link e cole nos stories ou na bio — o
        Instagram não permite compartilhar direto por um link como no
        WhatsApp.
      </p>
    </div>
  );
}
