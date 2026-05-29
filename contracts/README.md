# InkFi Contracts

Solidity 0.8.30 contracts deployed to OPN Chain (chainId 984).

## Contracts

| Contract | Purpose |
|---|---|
| **WOPN** | WETH-style wrapper so native OPN can be used as ERC-20 |
| **ArticleNFT** | ERC-721 (soulbound). Each article = an NFT owned by the writer. |
| **ArticleVaultPool** | Per-article staking pools using `accRewardPerShare` accumulator pattern (Synthetix StakingRewards / Sushi MasterChef style). Rewards crystallise per stake/unstake/claim. |
| **TippingRouter** | Single entrypoint for tips. Splits each tip 70/25/5 (writer/stakers/treasury). When no stakers exist, the staker share is redirected to the writer to prevent funds getting stuck. |
| **InkStream** | Per-second streaming, sender-funded, recipient-withdrawable, sender-cancellable. Inspired by Sablier v1, simplified for creator subscriptions. |

## Setup

```bash
npm install
cp .env.example .env   # set PRIVATE_KEY
npx hardhat compile
npx hardhat test
```

## Deploy to OPN Testnet

```bash
npx hardhat run scripts/deploy.ts --network opnTestnet
```

The deploy script writes `deployments/<network>.json` with all contract addresses and the deployer.

## Test coverage

- ArticleNFT: publish + version push + soulbound enforcement
- Tipping with no stakers (redirect to writer)
- Tipping with stakers (70/25/5 split)
- Pro-rata distribution across multiple stakers
- Late staker accounting (no retroactive rewards)
- Unstake preserves accrued reward
- InkStream per-second math, withdraw, cancel, deposit cap, access control

11/11 tests passing.

## Design notes

### Why `accRewardPerShare` instead of `rewardPerSecond`?

We don't know in advance how often or how much an article will be tipped — rewards are event-driven, not time-emitted. The accumulator pattern handles arbitrary push-style reward notifications cleanly.

### Why soulbound articles?

Authorship laundering. If articles were transferable, a bad actor could buy a respected writer's tokens and ride their reputation. Soulbound mints create permanent on-chain authorship history.

### Why a single VaultPool contract for all articles?

One deployment vs N deployments. The accumulator state per article is cheap (~3 storage slots), and a unified pool means TippingRouter can route reward to any article without needing to discover/deploy a per-article vault.

### Why redirect staker share to writer when there are no stakers?

If we just sent to the pool, the WOPN would sit there with no `accRewardPerShare` update to attribute it to anyone — funds stuck. Redirecting to writer keeps the protocol always-solvent.

### Gas optimisations

- `viaIR` + `optimizer` on
- Packed structs (`uint128`/`uint64` where wei range allows)
- `evmVersion: cancun` (OPN supports Pectra)
