import { formatUnits } from "viem";

export function fmt(value: bigint | undefined, digits = 4): string {
  if (value === undefined) return "—";
  const s = formatUnits(value, 18);
  const [w, f = ""] = s.split(".");
  return digits === 0 ? w : `${w}.${(f + "0".repeat(digits)).slice(0, digits)}`;
}

export function shortAddr(a?: `0x${string}`): string {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
