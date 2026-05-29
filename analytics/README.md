# InkFi Analytics

Python monitor for the InkFi protocol on OPN Chain.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill contract addresses from contracts/deployments/opnTestnet.json
python monitor.py            # one-shot
python monitor.py --watch    # live refresh every 5s
```

What it reports:

- **TVL** — sum of all article vault stakes + in-flight stream balances
- **Article leaderboard** — by combined stake + tip volume
- **Active streams** — count + total deposited/withdrawn
- **Heuristic alerts** — concentration risk, vault milestones

Designed to run alongside the dApp during demos so juries can see the
protocol breathing in real time.
