/** Dá um fade suave a cada troca de página (App Router recria este template na navegação). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
