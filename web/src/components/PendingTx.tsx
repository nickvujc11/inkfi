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
      <div className="mt-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-xs break-words font-mono">
        ✗ {error.message.split("\n")[0]}
      </div>
    );
  }
  if (isPending)
    return (
      <div className="mt-3 px-3 py-2 rounded-md bg-ink-surface border border-ink-border text-ink-mute2 text-xs">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-ink-violet2 animate-pulse-soft mr-2" />
        Awaiting wallet…
      </div>
    );
  if (isConfirming)
    return (
      <div className="mt-3 px-3 py-2 rounded-md bg-ink-surface border border-ink-border text-ink-mute2 text-xs">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-ink-amber animate-pulse-soft mr-2" />
        Confirming on OPN Chain
        {hash && (
          <span className="font-mono ml-2 text-ink-mute">
            {hash.slice(0, 10)}…
          </span>
        )}
      </div>
    );
  if (isConfirmed)
    return (
      <div className="mt-3 px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs animate-fade-in">
        ✓ Confirmed on-chain
      </div>
    );
  return null;
}
