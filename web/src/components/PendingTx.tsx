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
        className="mt-3 px-3 py-2 rounded-md text-[11px] font-mono break-words"
        style={{
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          color: "#fca5a5",
        }}
      >
        ✗ {error.message.split("\n")[0]}
      </div>
    );
  }
  if (isPending)
    return (
      <div
        className="mt-3 px-3 py-2 rounded-md text-[11px] font-mono"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--muted)",
        }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full mr-2 animate-blink"
          style={{ background: "var(--gold)" }}
        />
        Awaiting wallet…
      </div>
    );
  if (isConfirming)
    return (
      <div
        className="mt-3 px-3 py-2 rounded-md text-[11px] font-mono"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--muted)",
        }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full mr-2 animate-blink"
          style={{ background: "var(--stream)" }}
        />
        Confirming on OPN Chain
        {hash && (
          <span className="ml-2" style={{ color: "var(--muted)" }}>
            {hash.slice(0, 10)}…
          </span>
        )}
      </div>
    );
  if (isConfirmed)
    return (
      <div
        className="mt-3 px-3 py-2 rounded-md text-[11px] font-mono"
        style={{
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          color: "var(--yield)",
        }}
      >
        ✓ Confirmed on-chain
      </div>
    );
  return null;
}
