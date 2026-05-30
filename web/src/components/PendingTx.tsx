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
      <div className="mt-3 px-3 py-2 rounded-sm text-[11px] font-mono break-words border bg-stamp/10 border-stamp/40 text-stamp-bright">
        ✗ {error.message.split("\n")[0]}
      </div>
    );
  }
  if (isPending)
    return (
      <div className="mt-3 px-3 py-2 rounded-sm text-[11px] font-mono uppercase tracking-[0.14em] border border-rule bg-walnut-mid text-paper-mute">
        <span className="dot dot-brass mr-2" />
        awaiting wallet…
      </div>
    );
  if (isConfirming)
    return (
      <div className="mt-3 px-3 py-2 rounded-sm text-[11px] font-mono uppercase tracking-[0.14em] border border-rule bg-walnut-mid text-paper-mute">
        <span className="dot dot-stream mr-2" />
        confirming on OPN
        {hash && (
          <span className="ml-2 normal-case text-paper-faint">
            {hash.slice(0, 10)}…
          </span>
        )}
      </div>
    );
  if (isConfirmed)
    return (
      <div className="mt-3 px-3 py-2 rounded-sm text-[11px] font-mono uppercase tracking-[0.14em] border border-verdigris/40 bg-verdigris/15 text-verdigris-bright">
        ✓ confirmed on-chain
      </div>
    );
  return null;
}
