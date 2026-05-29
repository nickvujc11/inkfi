# InkFi Web

Next.js 14 + wagmi v2 + viem + RainbowKit. The user-facing dApp for InkFi on OPN Chain.

## Setup

```bash
npm install
cp .env.example .env.local   # paste contract addresses from contracts/deployments/opnTestnet.json
npm run dev
```

Open <http://localhost:3000>.

## Pages

| Route | What it does |
|---|---|
| `/` | Landing + article feed (live from chain) |
| `/write` | Distraction-free editor → `publish()` mints an Article NFT |
| `/article/[id]` | Reader view + Tip panel + Vault panel (stake/unstake/claim) |
| `/streams` | Open new stream + manage existing stream (per-second balance updates live) |

## Notes

- Article bodies live in `localStorage` for the MVP. The on-chain `contentHash` anchors integrity. Production: swap for IPFS/Arweave + a small upload helper.
- Wallet support: any RainbowKit-supported wallet (MetaMask, WalletConnect, etc).
- Chain config: `src/lib/chain.ts` — defines OPN Testnet (id 984, RPC `testnet-rpc.iopn.tech`).

## Build

```bash
npm run build
npm run start
```
