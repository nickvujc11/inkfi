# InkFi — Open Finance for Writers

> Write Once. Earn Forever.

Decentralized publishing where every article is a yield-bearing asset. Built on **OPN Chain** for the [IOPn Builders Programme · Season 1: DeFi & Open Finance](https://builders.iopn.tech/).

## What is InkFi?

InkFi turns every article into a financial primitive. Three composable layers:

| Layer | What it does |
|---|---|
| **ArticleNFT** | Soulbound ERC-721. Each article is owned by its writer, immutably. |
| **ArticleVaultPool** | Per-article staking. Fans deposit OPN on articles they believe in. When the article gets tipped, stakers earn real yield (Synthetix-style accumulator). |
| **TippingRouter** | Single entrypoint for tips. Each tip splits **70/25/5** between writer / stakers / treasury. |
| **InkStream** | Per-second subscription streaming. OPN flows from reader to writer continuously, made viable by OPN's ~1s block time. |
| **Writer Credit** *(roadmap)* | Borrow against future stream income. Reputation-based credit scoring. |

## Why OPN Chain

- **Sub-second finality** makes per-second streaming actually viable
- **7 Gwei gas floor** keeps tipping and micro-deposits affordable
- **Full EVM + Pectra (EIP-7702)** lets us use ERC-4626 / OpenZeppelin / Cancun opcodes
- **EVM compatible (chainId 984)** — all standard tooling works (Hardhat, Foundry, MetaMask, wagmi)

## Repo structure

```
inkfi/
├── contracts/    # Solidity 0.8.30 + Hardhat. 5 contracts, 11 tests passing.
├── web/          # Next.js 14 + wagmi + viem + RainbowKit. Reader & writer dApp.
├── cli/          # Node.js + viem. Power-user terminal interface.
├── analytics/    # Python + web3.py. Live TVL & vault monitoring.
└── README.md
```

## End-to-end quick start

### 1. Smart contracts

```bash
cd contracts
npm install
cp .env.example .env             # set PRIVATE_KEY (testnet wallet from faucet.iopn.tech)
npx hardhat compile
npx hardhat test                 # 11 passing
npx hardhat run scripts/deploy.ts --network opnTestnet
# → deployments/opnTestnet.json now has all 5 contract addresses
```

### 2. Web dApp

```bash
cd ../web
npm install
cp .env.example .env.local
# paste addresses from contracts/deployments/opnTestnet.json into .env.local:
#   NEXT_PUBLIC_WOPN_ADDRESS=0x...
#   NEXT_PUBLIC_ARTICLE_NFT_ADDRESS=0x...
#   ...etc
npm run dev
```

Open <http://localhost:3000>.

### 3. CLI

```bash
cd ../cli
npm install
cp .env.example .env             # paste addresses + PRIVATE_KEY
chmod +x bin/inkfi.mjs

node bin/inkfi.mjs whoami
node bin/inkfi.mjs publish "ipfs://demo" 0x0000000000000000000000000000000000000000000000000000000000000001
node bin/inkfi.mjs stake 1 5
node bin/inkfi.mjs tip 1 1 -m "great post"
node bin/inkfi.mjs vault 1
node bin/inkfi.mjs claim 1
```

### 4. Analytics

```bash
cd ../analytics
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # paste addresses
python monitor.py --watch        # live TVL dashboard
```

## Network

| Field | Value |
|---|---|
| Chain | OPN Chain Testnet |
| Chain ID | 984 (`0x3d8`) |
| RPC | <https://testnet-rpc.iopn.tech> |
| Faucet | <https://faucet.iopn.tech> |
| Explorer | <https://testnet-explorer.iopn.tech> |

## Demo flow (for reviewers)

1. Open the dApp, connect MetaMask (auto-prompts to add OPN Testnet)
2. `/write` — publish an article. A soulbound NFT is minted to your wallet.
3. From a second wallet, open the article and click **Stake** — wrap → approve → stake
4. From a third wallet, tip the article 1 OPN
5. Watch the staker's pending reward update in real time (it's 0.25 OPN — 25% of the tip)
6. Claim → balance arrives
7. Open `/streams`, set yourself a 100 OPN stream at 1 OPN/day. Watch `withdrawable` tick up second by second.
8. In a separate terminal: `python analytics/monitor.py --watch` shows TVL/leaderboard live.

## Scoring against Season 1 rubric

| Criterion | Weight | InkFi |
|---|---|---|
| OPN Chain Integration | 30 | 5 contracts deployed; chain is settlement layer for **all** value flows. Per-second streaming load-bearing on fast finality. |
| Technical Quality | 25 | Solidity 0.8.30, accumulator-style rewards, packed storage, viaIR. 11/11 tests. Full TS + Python + Node tooling. |
| Product & UX | 20 | Distraction-free editor, live tip/stake panels, real-time stream gauge. RainbowKit polished wallet UX. |
| Innovation | 15 | "Creator DeFi" — articles as composable yield-bearing assets. Combination of ERC-4626-style vault + streaming + creator economy. |
| Builder Commitment | 10 | Continuation of [Inkfi](https://inkfi.vercel.app), proven product idea, full multi-component delivery. |

## License

MIT
