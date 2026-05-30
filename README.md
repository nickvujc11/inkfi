# 📝 InkFi

> Articles as yield-bearing assets. Tip, stake, and stream OPN to writers — fully on-chain on OPN Chain.

Submission for the [IOPn Builders Programme · Season 1: DeFi & Open Finance](https://builders.iopn.tech/).

- **Live demo**: https://inkfi.vercel.app
- **Network**: OPN Chain Testnet (chainId 984)

## ⚙️ Core Idea

Every article is a programmable financial primitive. Readers stake on articles they believe in, tippers fuel real yield for stakers, subscribers stream OPN to writers per second.

- One article = one soulbound NFT
- One vault per article, fans stake to earn
- Tips split 70 / 25 / 5 (writer / stakers / treasury)
- Per-second streaming powered by sub-second finality
- **Writer Dashboard** at `/dashboard` surfaces pending rewards, your stakes, and your articles — entirely from on-chain reads

## 🌳 System Flow

```
Writer ──► publish() ──► ArticleNFT (soulbound, versioned)
                              │
Reader ──► stake() ────────► ArticleVaultPool
                              │
Tipper ──► tipNative() ──► TippingRouter
                              ├── 70% writer
                              ├── 25% stakers (notifyReward)
                              └──  5% treasury
                              │
Subscriber ──► open() ────► InkStream (per-second)
                              ├── recipient withdraw()
                              └── sender cancel()
```

## 📜 Deployed Contracts (OPN Testnet)

| Contract | Address |
|---|---|
| ArticleNFT (Primary) | `0xdCFB5705D76cbcf425A6884247a5e9AcA6D068dF` |
| ArticleVaultPool | `0x077eD7E64ea1Cb8F56aCEc24D5b2cEE960B17B3d` |
| TippingRouter | `0xa832c04f9AF129De318da9c81ffC79b20e9E2286` |
| InkStream | `0xEb40993f26Ba197E12511d4d7DF67F4A8aE2b3D4` |
| WOPN | `0x31cD4d43F164B9F734Cea137c3CcCD538fC184DC` |

## 🚀 Contract Suite

- ERC-721 (soulbound) for articles
- Per-article staking pool with accumulator-style rewards
- Native + WOPN tipping router
- Sender-funded streaming with cancel + withdraw
- OpenZeppelin 5.0.2 base, Solidity 0.8.30, paris EVM target

## 📊 Performance & Safety

- Packed storage (uint128 / uint64 stake state)
- Custom errors, no string reverts
- viaIR optimizer
- 11 / 11 Hardhat tests passing
- Reentrancy guards on every value flow
- Auto-redirect of staker share to writer when no stakers exist

## 🔐 Security Notes

- Soulbound NFTs prevent authorship laundering
- Accumulator pattern ensures no retroactive reward claims
- Stream amount capped at deposit
- Access-controlled reward notifier (only TippingRouter)

## 📦 Tech Stack

Solidity 0.8.30 · Hardhat · OpenZeppelin · Next.js 14 · wagmi + viem · RainbowKit · DM Serif Display + Newsreader + DM Mono · Node CLI · Python analytics

## 🌐 Network Info

| Field | Value |
|---|---|
| Chain | OPN Chain Testnet |
| Chain ID | 984 (`0x3d8`) |
| RPC | https://testnet-rpc.iopn.tech |
| Explorer | https://testnet.iopn.tech |
| Faucet | https://faucet.iopn.tech |
| Currency | OPN |

## 🌱 Roadmap

- **Q3 2026** — IPFS content storage, Writer Credit primitive (borrow against future stream income), stake-weighted discovery feed
- **Q4 2026** — Reputation NFT tiers feeding credit scoring, multi-asset streams, mobile PWA, external audit
- **2027 and beyond** — DAO governance, cross-chain settlement, public SDK, writer grants programme

## 🧪 Status

- Smart contracts: deployed ✔
- Article NFT minting: live on testnet ✔
- Tipping + 70/25/5 split: live, verified end-to-end ✔
- Vault staking + reward distribution: live, accumulator math confirmed (0.5 OPN stake → 0.2 OPN tip → 0.05 OPN reward = 25%) ✔
- Per-second streaming: functional ✔
- Web dApp live: https://inkfi.vercel.app ✔
- Verified source on builders.iopn.tech: ✔

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

# License

MIT
