export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "--";
  const s = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(s / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}
