/** Blocos cinza pulsantes mostrados enquanto a página carrega. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} aria-hidden="true" />;
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="flex flex-col gap-3">
      <SkeletonBlock className="h-8 w-48" />
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonBlock key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
