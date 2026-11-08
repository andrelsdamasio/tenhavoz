/** Tempo "à Instagram": 1 s, 13 min, 1 h, 2 d, 3 sem. Abaixo de 5 s: "agora". */
export function relativeTime(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "agora";
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks} sem`;
  return `${Math.floor(days / 365)} a`;
}
