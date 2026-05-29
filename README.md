# InkFi — Open Finance for Writers

> Write Once. Earn Forever.

Submission for the [IOPn Builders Programme · Season 1: DeFi & Open Finance](https://builders.iopn.tech/).

- **Live demo**: https://inkfi.vercel.app
- **Source**: https://github.com/nickvujc11/inkfi
- **Network**: OPN Chain Testnet (chainId 984)

---

# What we built

InkFi turns every article into a financial primitive. Three composable layers, all settled on OPN Chain.

- **ArticleNFT** — soulbound ERC-721. Every published article is an NFT owned permanently by its writer. Authorship can never be transferred, only versioned.
- **ArticleVaultPool** — per-article staking. Fans deposit OPN on articles they believe in. When that article is tipped, stakers earn a pro-rata share through a Synthetix-style accumulator (`accRewardPerShare`). One contract serves N pools, gas-efficient packed storage.
- **TippingRouter** — single entrypoint splitting every tip 70/25/5 between writer, stakers, and protocol treasury. Tips stop being one-shot, they generate continuous yield for fans who curated early. If a vault has no stakers, the staker share is auto-redirected to the writer so funds are never stuck.
- **InkStream** — per-second subscription streaming. OPN flows from reader to writer continuously. This is only economically viable because OPN Chain has roughly one second block time. On Ethereum mainnet a per-second stream would be useless.

# Why

Web2 publishing pays writers via ads, paywalls, and middlemen taking 30 to 70 percent. Decentralized publishing (Mirror, Paragraph, my own [Inkrun](https://inkrun.vercel.app) on Solana) solved censorship but kept the same broken monetization: one-shot tips and nothing else. InkFi treats each article as a programmable yield-bearing asset and gives readers an economic stake in articles they discover before they go viral. That is the open finance angle: replace platform rent with on-chain primitives.

# How it works end to end

1. Writer publishes an article. A soulbound `ArticleNFT` is minted.
2. A reader stakes OPN into that article's `ArticleVaultPool`.
3. Other readers tip the article in native OPN through `TippingRouter`.
4. Router wraps to WOPN, splits 70/25/5, pushes the staker share to the pool, calls `notifyReward(articleId, amount)`.
5. Stakers' pending rewards crystallise. Anyone can `claim()` independently.
6. Writers can also receive per-second subscriptions through `InkStream`, withdrawable continuously.

# Why this scores against the rubric

- **OPN Chain Integration (30)** — five contracts deployed, all load-bearing. Per-second streaming and micro-tipping are unaffordable on slower or more expensive chains.
- **Technical Quality (25)** — Solidity 0.8.30, paris EVM target, viaIR optimizer, packed structs, custom errors. 11/11 Hardhat tests covering soulbound, splits, late-staker accounting, stream caps, access control. Flattened sources committed.
- **Product & UX (20)** — Next.js 14 dApp with three flows (write, tip + stake on article, open + manage stream). Live deployment at https://inkfi.vercel.app.
- **Innovation (15)** — "creator DeFi": articles as composable yield-bearing assets, staker discovery rewards, reputation-aware streaming as the path to credit.
- **Builder Commitment (10)** — continuation of Inkrun (https://inkrun.vercel.app), full multi-component delivery (contracts + web + Node CLI + Python analytics), public roadmap.

# Stack

| Layer | Tech |
|---|---|
| Contracts | Solidity 0.8.30 + Hardhat + OZ 5.0.2 |
| Web | Next.js 14 + wagmi v2 + viem + RainbowKit |
| CLI | Node + viem (11 commands, auto-wrap and approve) |
| Analytics | Python + web3.py + rich (live TVL leaderboard) |

# Roadmap

- **Q3 2026** — IPFS for content URIs, Writer Credit (borrow against future stream income), subgraph and stake-weighted discovery feed.
- **Q4 2026** — reputation NFT tiers feeding credit scoring, multi-asset streams, mobile PWA, external audit.
- **2027 and beyond** — DAO governance, cross-chain settlement, public SDK, writer grants programme.

---

# Repo layout

```
inkfi/
├── contracts/    # Solidity 0.8.30 + Hardhat. 5 contracts, 11 tests passing.
│   └── flattened/  # Single-file sources for explorer / submission verification.
├── web/          # Next.js 14 + wagmi + viem + RainbowKit. Reader & writer dApp.
├── cli/          # Node.js + viem. Power-user terminal interface.
├── analytics/    # Python + web3.py. Live TVL & vault monitoring.
└── README.md
```

# Quick start

```bash
# 1. Smart contracts
cd contracts
npm install
cp .env.example .env             # set PRIVATE_KEY (testnet wallet from faucet.iopn.tech)
npx hardhat compile
npx hardhat test                 # 11 passing
npx hardhat run scripts/deploy.ts --network opnTestnet
# → deployments/opnTestnet.json now has all 5 contract addresses

# 2. Web dApp
cd ../web
npm install
cp .env.example .env.local       # paste addresses from deployments/opnTestnet.json
npm run dev                      # http://localhost:3000

# 3. CLI
cd ../cli
npm install
cp .env.example .env             # paste addresses + PRIVATE_KEY
node bin/inkfi.mjs whoami
node bin/inkfi.mjs publish "ipfs://demo" 0x0000000000000000000000000000000000000000000000000000000000000001
node bin/inkfi.mjs stake 1 5
node bin/inkfi.mjs tip 1 1 -m "great post"
node bin/inkfi.mjs claim 1

# 4. Analytics
cd ../analytics
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # paste addresses
python monitor.py --watch        # live TVL dashboard
```

# Network

| Field | Value |
|---|---|
| Chain | OPN Chain Testnet |
| Chain ID | 984 (`0x3d8`) |
| RPC | <https://testnet-rpc.iopn.tech> |
| Faucet | <https://faucet.iopn.tech> |
| Explorer | <https://testnet.iopn.tech> |

# License

MIT
