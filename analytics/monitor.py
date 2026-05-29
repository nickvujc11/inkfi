"""InkFi protocol monitor.

Reads on-chain state from OPN Chain and prints a live dashboard:

  * Total Value Locked (across all article vaults + open streams)
  * Article leaderboard (most tipped, most staked)
  * Active streams summary
  * Anomaly alerts (e.g. tip volume spike, unusually large stream)

Usage:
    python monitor.py            # one-shot snapshot
    python monitor.py --watch    # refresh every 5s
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.live import Live
from web3 import Web3

from abis import (
    ARTICLE_NFT_ABI,
    ROUTER_ABI,
    STREAM_ABI,
    VAULT_ABI,
    WOPN_ABI,
)

load_dotenv()
console = Console()

RPC = os.environ.get("OPN_RPC", "https://testnet-rpc.iopn.tech")
START_BLOCK = int(os.environ.get("START_BLOCK", "0"))


def addr(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        console.print(f"[red]Missing env: {name}[/]")
        sys.exit(1)
    return Web3.to_checksum_address(v)


@dataclass
class Snapshot:
    total_articles: int = 0
    total_staked: int = 0  # wei (sum across all articles)
    total_tipped: int = 0  # wei (lifetime)
    tipped_by_article: dict[int, int] = field(default_factory=lambda: defaultdict(int))
    staked_by_article: dict[int, int] = field(default_factory=dict)
    writers: dict[int, str] = field(default_factory=dict)
    active_streams: int = 0
    streams_total_deposited: int = 0
    streams_total_withdrawn: int = 0


def collect(w3: Web3) -> Snapshot:
    article_nft = w3.eth.contract(address=addr("ARTICLE_NFT"), abi=ARTICLE_NFT_ABI)
    vault = w3.eth.contract(address=addr("VAULT"), abi=VAULT_ABI)
    router = w3.eth.contract(address=addr("ROUTER"), abi=ROUTER_ABI)
    stream = w3.eth.contract(address=addr("STREAM"), abi=STREAM_ABI)

    snap = Snapshot()
    snap.total_articles = article_nft.functions.nextId().call()

    # writers + staked per article
    for aid in range(1, snap.total_articles + 1):
        try:
            snap.writers[aid] = article_nft.functions.writerOf(aid).call()
            staked = vault.functions.totalStaked(aid).call()
            snap.staked_by_article[aid] = staked
            snap.total_staked += staked
        except Exception as e:
            console.log(f"[yellow]article #{aid} read failed: {e}[/]")

    # tip events (cheap: scan from START_BLOCK)
    head = w3.eth.block_number
    try:
        logs = router.events.Tipped.get_logs(from_block=START_BLOCK, to_block=head)
        for ev in logs:
            args = ev["args"]
            snap.tipped_by_article[int(args["articleId"])] += int(args["total"])
            snap.total_tipped += int(args["total"])
    except Exception as e:
        console.log(f"[yellow]Tipped log scan failed: {e}[/]")

    # streams
    try:
        next_id = stream.functions.nextStreamId().call()
        for sid in range(1, next_id + 1):
            s = stream.functions.streams(sid).call()
            (sender, recipient, deposited, withdrawn, rate, started, stopped) = s
            snap.streams_total_deposited += int(deposited)
            snap.streams_total_withdrawn += int(withdrawn)
            if stopped == 0:
                snap.active_streams += 1
    except Exception as e:
        console.log(f"[yellow]Stream scan failed: {e}[/]")

    return snap


def render(snap: Snapshot) -> Table:
    def opn(wei: int) -> str:
        return f"{wei / 1e18:,.4f}"

    summary = Table(title="◈ InkFi Protocol Monitor — OPN Chain Testnet",
                    title_style="bold magenta", border_style="dim")
    summary.add_column("Metric", style="cyan")
    summary.add_column("Value", justify="right", style="bold")

    tvl = snap.total_staked + (snap.streams_total_deposited - snap.streams_total_withdrawn)
    summary.add_row("Articles published", str(snap.total_articles))
    summary.add_row("Total staked (vaults)", f"{opn(snap.total_staked)} WOPN")
    summary.add_row("Total in flight (streams)", f"{opn(snap.streams_total_deposited - snap.streams_total_withdrawn)} WOPN")
    summary.add_row("[bold magenta]TVL[/]", f"[bold magenta]{opn(tvl)} WOPN[/]")
    summary.add_row("Lifetime tips routed", f"{opn(snap.total_tipped)} OPN")
    summary.add_row("Active streams", str(snap.active_streams))
    return summary


def render_articles(snap: Snapshot) -> Table:
    t = Table(title="Top articles", border_style="dim")
    t.add_column("#")
    t.add_column("Writer", style="cyan", no_wrap=True)
    t.add_column("Staked", justify="right")
    t.add_column("Tipped", justify="right")

    rows = []
    for aid in range(1, snap.total_articles + 1):
        rows.append(
            (
                aid,
                snap.writers.get(aid, "?"),
                snap.staked_by_article.get(aid, 0),
                snap.tipped_by_article.get(aid, 0),
            )
        )
    rows.sort(key=lambda r: (-(r[2] + r[3]), r[0]))
    for aid, w, s, tt in rows[:10]:
        t.add_row(
            str(aid),
            f"{w[:6]}…{w[-4:]}" if w else "?",
            f"{s/1e18:,.3f}",
            f"{tt/1e18:,.3f}",
        )
    return t


def maybe_alert(snap: Snapshot) -> list[str]:
    alerts: list[str] = []
    # Heuristic: if a single article has > 50% of total tips and > 1 OPN tipped,
    # call it out.
    if snap.total_tipped > 10**18:
        for aid, val in snap.tipped_by_article.items():
            if val * 2 > snap.total_tipped:
                alerts.append(
                    f"⚠  Article #{aid} captures {val / snap.total_tipped:.0%} of tip volume."
                )
    # Heuristic: very small TVL but very large stream
    for aid, st in snap.staked_by_article.items():
        if st > 100 * 10**18:
            alerts.append(f"📈 Vault #{aid} crossed 100 WOPN staked.")
    return alerts


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--watch", action="store_true")
    args = parser.parse_args()

    w3 = Web3(Web3.HTTPProvider(RPC))
    if not w3.is_connected():
        console.print(f"[red]Failed to reach RPC {RPC}[/]")
        sys.exit(1)

    chain_id = w3.eth.chain_id
    console.print(f"[dim]connected · chainId={chain_id} · block={w3.eth.block_number}[/]")

    def cycle() -> Any:
        snap = collect(w3)
        from rich.console import Group
        return Group(render(snap), render_articles(snap),
                     *(f"[yellow]{a}[/]" for a in maybe_alert(snap)))

    if args.watch:
        with Live(cycle(), console=console, refresh_per_second=0.5) as live:
            try:
                while True:
                    time.sleep(5)
                    live.update(cycle())
            except KeyboardInterrupt:
                pass
    else:
        console.print(cycle())


if __name__ == "__main__":
    main()
