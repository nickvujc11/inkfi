import type { Address } from "viem";

const env = (k: string): Address =>
  (process.env[k] as Address | undefined) ?? "0x0000000000000000000000000000000000000000";

export const ADDR = {
  WOPN: env("NEXT_PUBLIC_WOPN_ADDRESS"),
  ArticleNFT: env("NEXT_PUBLIC_ARTICLE_NFT_ADDRESS"),
  Vault: env("NEXT_PUBLIC_VAULT_ADDRESS"),
  Router: env("NEXT_PUBLIC_ROUTER_ADDRESS"),
  Stream: env("NEXT_PUBLIC_STREAM_ADDRESS"),
} as const;
