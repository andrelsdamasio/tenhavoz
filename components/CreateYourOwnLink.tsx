import Link from "next/link";

/**
 * Rodapé discreto no fim das páginas públicas: quem viu a campanha pode criar
 * a sua. Fica fora do tema (faixa neutra) para ler bem em qualquer cor.
 */
export default function CreateYourOwnLink() {
  return (
    <footer className="border-t border-gray-200 bg-white px-4 py-4 text-center">
      <Link
        href="/signup?origem=campanha"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-gray-500 transition duration-200 hover:bg-gray-100 hover:text-gray-800"
      >
        Quer fazer uma campanha como esta?
        <span className="font-medium text-gray-700">Crie a sua no TenhaVoz</span>
        <span aria-hidden="true">→</span>
      </Link>
    </footer>
  );
}
