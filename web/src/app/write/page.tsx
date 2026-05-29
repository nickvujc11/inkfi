"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
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
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  async function publish() {
    if (!isConnected || !address || !publicClient) return;
    const payload = JSON.stringify({ title, body });
    const contentHash = keccak256(toHex(payload));
    // We don't have IPFS upload in the MVP; record a local URI placeholder.
    // The hash is the on-chain integrity anchor; the body lives in localStorage.
    const tempURI = `inkfi-local://pending`;

    const txHash = await writeContractAsync({
      address: ADDR.ArticleNFT,
      abi: articleNftAbi,
      functionName: "publish",
      args: [tempURI, contentHash],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    // Decode ArticlePublished event to get the new tokenId.
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
      <h1 className="text-3xl font-serif mb-2">New Article</h1>
      <p className="text-ink-mute text-sm mb-8">
        Publishing mints a soulbound NFT to your wallet. The content hash is
        recorded on OPN Chain. The article body is stored locally for the MVP.
      </p>

      <input
        className="ink-input text-2xl font-serif mb-4"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="ink-input h-96 font-serif"
        placeholder="Tell your story…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <div className="mt-6 flex items-center gap-4">
        <button
          className="ink-btn"
          disabled={!isConnected || !title || !body || isPending || isConfirming}
          onClick={publish}
        >
          {isPending || isConfirming ? "Publishing…" : "✍ Publish to OPN Chain"}
        </button>
        {!isConnected && (
          <span className="text-ink-mute text-sm">Connect wallet first.</span>
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
