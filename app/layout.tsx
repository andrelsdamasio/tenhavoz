import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenhavoz.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "TenhaVoz",
  description: "Crie campanhas de manifesto e mobilize pessoas por e-mail.",
  openGraph: {
    title: "TenhaVoz",
    description: "Crie campanhas de manifesto e mobilize pessoas por e-mail.",
    siteName: "TenhaVoz",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TenhaVoz",
    description: "Crie campanhas de manifesto e mobilize pessoas por e-mail.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
