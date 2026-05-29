# InkFi CLI

Power-user terminal interface for InkFi on OPN Chain.

## Setup

```bash
npm install
cp .env.example .env   # set PRIVATE_KEY + contract addresses
chmod +x bin/inkfi.mjs
```

Optionally link globally:

```bash
npm link    # then `inkfi` is on $PATH
```

## Commands

| Command | What it does |
|---|---|
| `inkfi whoami` | Show wallet address, OPN/WOPN balance, configured contracts |
| `inkfi publish <uri> <hash>` | Mint a new Article NFT |
| `inkfi tip <id> <amount> [-m memo]` | Tip an article in native OPN |
| `inkfi stake <id> <amount>` | Stake on an article (auto-wraps + approves) |
| `inkfi unstake <id> <amount>` | Unstake principal |
| `inkfi claim <id>` | Claim accrued reward |
| `inkfi vault <id>` | Show TVL, your stake, pending reward |
| `inkfi stream:open <to> <deposit> <perDay>` | Open a per-second stream |
| `inkfi stream:status <id> [--watch]` | Live stream status (refreshes every 1s) |
| `inkfi stream:withdraw <id>` | Recipient pulls accrued amount |
| `inkfi stream:cancel <id>` | Sender cancels, gets remainder back |

## Demo flow

```bash
inkfi whoami
inkfi publish "ipfs://demo" 0x0000000000000000000000000000000000000000000000000000000000000001
inkfi vault 1
inkfi stake 1 5
inkfi tip 1 1 -m "great post"
inkfi vault 1            # see pending reward
inkfi claim 1
```
