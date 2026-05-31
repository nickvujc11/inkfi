"use client";
import type { Hash } from "viem";

export function TxStatus({
  hash,
  isPending,
  isConfirming,
  isConfirmed,
  error,
}: {
  hash?: Hash;
  isPending?: boolean;
  isConfirming?: boolean;
  isConfirmed?: boolean;
  error?: Error | null;
}) {
  if (error) {
    return (
      <div
        className="mt-3 px-3 py-2 rounded text-[11px] font-mono break-words"
        style={{
          background: "rgba(155, 44, 44, 0.08)",
          border: "1px solid rgba(155, 44, 44, 0.35)",
          color: "#e8a0a0",
        }}
      >
        ✗ {error.message.split("\n")[0]}
      </div>
    );
  }
  if (isPending)
    return (
      <div
        className="mt-3 px-3 py-2 rounded text-[11px] font-mono"
        style={{
          background: "rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--border)",
          color: "var(--parchment-3)",
        }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full mr-2 animate-blink"
          style={{ background: "var(--brass)" }}
        />
        Awaiting wallet…
      </div>
    );
  if (isConfirming)
    return (
      <div
        className="mt-3 px-3 py-2 rounded text-[11px] font-mono"
        style={{
          background: "rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--border)",
          color: "var(--parchment-3)",
        }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full mr-2 animate-blink"
          style={{ background: "var(--indigo-2)" }}
        />
        Confirming on OPN Chain
        {hash && <span className="ml-2 opacity-60">{hash.slice(0, 10)}…</span>}
      </div>
    );
  if (isConfirmed)
    return (
      <div
        className="mt-3 px-3 py-2 rounded text-[11px] font-mono"
        style={{
          background: "rgba(91, 139, 110, 0.08)",
          border: "1px solid rgba(91, 139, 110, 0.4)",
          color: "var(--verdigris-2)",
        }}
      >
        ✓ Sealed on-chain
      </div>
    );
  return null;
}
