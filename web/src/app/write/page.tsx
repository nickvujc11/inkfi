"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { keccak256, toHex } from "viem";
import { useRouter } from "next/navigation";
import { ADDR } from "@/lib/addresses";
import { articleNftAbi } from "@/lib/abis";
import { TxStatus } from "@/components/PendingTx";
import { saveArticle } from "@/lib/articles";

export default function WritePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const publicClient = usePublicClient();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.ceil(wordCount / 220));

  async function publish() {
    if (!isConnected || !address || !publicClient) return;
    const payload = JSON.stringify({ title, body });
    const contentHash = keccak256(toHex(payload));
    const tempURI = `inkfi-local://pending`;

    const txHash = await writeContractAsync({
      address: ADDR.ArticleNFT,
      abi: articleNftAbi,
      functionName: "publish",
      args: [tempURI, contentHash],
      gas: 800_000n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const log = receipt.logs.find(
      (l) => l.address.toLowerCase() === ADDR.ArticleNFT.toLowerCase()
    );
    if (log && log.topics[1]) {
      const id = Number(BigInt(log.topics[1]));
      saveArticle({
        id,
        title,
        body,
        writer: address,
        createdAt: Math.floor(Date.now() / 1000),
      });
      router.push(`/article/${id}`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="section-mast">
        <span className="num">i.</span>
        <span className="label">Composition</span>
        <span className="meta">
          {wordCount} words · ~{readMin} min
        </span>
      </div>

      <p className="font-display italic text-paper-mute mb-8 max-w-2xl">
        Inscribe a new volume. The hash is etched into OPN Chain. The body is
        cached locally for the MVP, then rendered on the article page.
      </p>

      <div className="surface-raised p-10 relative">
        {/* corner ornaments */}
        <span className="absolute top-3 left-3 text-brass/40 text-xs">❦</span>
        <span className="absolute top-3 right-3 text-brass/40 text-xs">❦</span>
        <span className="absolute bottom-3 left-3 text-brass/40 text-xs">❦</span>
        <span className="absolute bottom-3 right-3 text-brass/40 text-xs">❦</span>

        <input
          className="w-full bg-transparent border-0 text-[42px] md:text-[56px] font-display font-semibold leading-tight mb-2 focus:outline-none text-paper placeholder:text-paper-mute"
          placeholder="An untitled volume…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="rule mb-6"><span className="rule-dot" /></div>
        <textarea
          className="w-full bg-transparent border-0 font-display text-[19px] leading-[1.7] h-[60vh] resize-none focus:outline-none text-paper placeholder:text-paper-mute placeholder:italic"
          placeholder="Tell your story. The chain is listening."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="mt-6 flex items-center gap-4 sticky bottom-4">
        <button
          className="btn btn-primary"
          disabled={!isConnected || !title || !body || isPending || isConfirming}
          onClick={publish}
        >
          {isPending || isConfirming ? "Inscribing…" : "✎ Inscribe to OPN Chain"}
        </button>
        {!isConnected && (
          <span className="text-xs text-paper-mute font-mono uppercase tracking-[0.14em]">
            Connect wallet to inscribe.
          </span>
        )}
      </div>

      <TxStatus
        hash={hash}
        isPending={isPending}
        isConfirming={isConfirming}
        isConfirmed={isConfirmed}
        error={error}
      />
    </div>
  );
}
