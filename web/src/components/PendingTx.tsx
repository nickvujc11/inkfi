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
      <div className="text-sm text-red-400 mt-2 break-words">
        {error.message.split("\n")[0]}
      </div>
    );
  }
  if (isPending) return <div className="text-sm text-ink-mute mt-2">⏳ Awaiting wallet…</div>;
  if (isConfirming)
    return (
      <div className="text-sm text-ink-mute mt-2">
        ⏳ Confirming on OPN Chain…{" "}
        {hash && <span className="font-mono text-xs">{hash.slice(0, 10)}…</span>}
      </div>
    );
  if (isConfirmed)
    return <div className="text-sm text-emerald-400 mt-2">✓ Confirmed</div>;
  return null;
}
