import { formatEther } from "viem";

export function formatKas(value?: bigint, precision = 2): string {
  if (!value) return "0";
  const formatted = parseFloat(formatEther(value));
  return formatted.toLocaleString(undefined, {
    maximumFractionDigits: precision,
    minimumFractionDigits: 0
  });
}

export function roundStatusLabel(status?: bigint): string {
  switch (Number(status ?? 0)) {
    case 0:
      return "Open";
    case 1:
      return "Ready";
    case 2:
      return "Drawing";
    case 3:
      return "Refunding";
    case 4:
      return "Closed";
    default:
      return "Unknown";
  }
}
