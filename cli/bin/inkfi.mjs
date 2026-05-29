#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import kleur from "kleur";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  wopnAbi,
  articleNftAbi,
  vaultAbi,
  routerAbi,
  streamAbi,
} from "../src/abis.mjs";

const opnTestnet = defineChain({
  id: 984,
  name: "OPN Chain Testnet",
  nativeCurrency: { decimals: 18, name: "OPN", symbol: "OPN" },
  rpcUrls: { default: { http: [process.env.OPN_RPC ?? "https://testnet-rpc.iopn.tech"] } },
});

function require_env(k) {
  const v = process.env[k];
  if (!v) {
    console.error(kleur.red(`Missing ${k} in .env`));
    process.exit(1);
  }
  return v;
}

function clients() {
  const account = privateKeyToAccount(require_env("PRIVATE_KEY"));
  const publicClient = createPublicClient({ chain: opnTestnet, transport: http() });
  const baseWallet = createWalletClient({ chain: opnTestnet, transport: http(), account });
  // OPN testnet's eth_estimateGas sometimes returns 21000-ish for contract
  // calls, which causes silent reverts. Inject a safe upper bound on every write.
  const walletClient = {
    ...baseWallet,
    writeContract: (args) =>
      baseWallet.writeContract({ gas: SAFE_GAS, ...args }),
  };
  return { account, publicClient, walletClient };
}

// Throw if the tx ended in revert. waitForTransactionReceipt by itself returns
// even for reverts, which would otherwise let CLI commands look successful.
async function awaitOk(publicClient, hash) {
  const r = await publicClient.waitForTransactionReceipt({ hash });
  if (r.status !== "success") {
    throw new Error(
      `Transaction reverted on-chain (block ${r.blockNumber}, gas used ${r.gasUsed}). Hash: ${hash}`
    );
  }
  return r;
}

// Some OPN testnet RPCs return a too-low gas estimate. Fall back to a sane
// upper bound so writes don't revert silently.
const SAFE_GAS = 800_000n;

const ADDR = {
  WOPN: () => require_env("WOPN"),
  ArticleNFT: () => require_env("ARTICLE_NFT"),
  Vault: () => require_env("VAULT"),
  Router: () => require_env("ROUTER"),
  Stream: () => require_env("STREAM"),
};

async function ensureWrappedAndApproved(spender, amount) {
  const { account, publicClient, walletClient } = clients();

  const wopnBal = await publicClient.readContract({
    address: ADDR.WOPN(),
    abi: wopnAbi,
    functionName: "balanceOf",
    args: [account.address],
  });

  if (wopnBal < amount) {
    const need = amount - wopnBal;
    console.log(kleur.gray(`  wrapping ${formatEther(need)} OPN → WOPN…`));
    const h = await walletClient.writeContract({
      address: ADDR.WOPN(),
      abi: wopnAbi,
      functionName: "deposit",
      args: [],
      value: need,
    });
    await awaitOk(publicClient, h);
  }

  const allowance = await publicClient.readContract({
    address: ADDR.WOPN(),
    abi: wopnAbi,
    functionName: "allowance",
    args: [account.address, spender],
  });
  if (allowance < amount) {
    console.log(kleur.gray(`  approving ${spender}…`));
    const h = await walletClient.writeContract({
      address: ADDR.WOPN(),
      abi: wopnAbi,
      functionName: "approve",
      args: [spender, amount],
    });
    await awaitOk(publicClient, h);
  }
}

const program = new Command();
program
  .name("inkfi")
  .description("InkFi CLI — write, tip, stake, stream from your terminal")
  .version("0.1.0");

// ----- whoami -----
program
  .command("whoami")
  .description("Show wallet, balance, and configured contracts")
  .action(async () => {
    const { account, publicClient } = clients();
    const native = await publicClient.getBalance({ address: account.address });
    const wopnBal = await publicClient.readContract({
      address: ADDR.WOPN(),
      abi: wopnAbi,
      functionName: "balanceOf",
      args: [account.address],
    });
    console.log(kleur.bold("Wallet"));
    console.log(`  ${account.address}`);
    console.log(`  OPN  ${kleur.green(formatEther(native))}`);
    console.log(`  WOPN ${kleur.green(formatEther(wopnBal))}`);
    console.log(kleur.bold("\nContracts"));
    for (const [k, fn] of Object.entries(ADDR)) {
      console.log(`  ${k.padEnd(12)} ${kleur.gray(fn())}`);
    }
  });

// ----- publish -----
program
  .command("publish <contentURI> <hash>")
  .description("Mint an article NFT (writer = you). hash is 0x-prefixed bytes32.")
  .action(async (uri, hash) => {
    const { walletClient, publicClient } = clients();
    const txHash = await walletClient.writeContract({
      address: ADDR.ArticleNFT(),
      abi: articleNftAbi,
      functionName: "publish",
      args: [uri, hash],
    });
    const r = await awaitOk(publicClient, txHash);
    console.log(kleur.green("✓ published"), kleur.gray(`block ${r.blockNumber}`));
  });

// ----- tip -----
program
  .command("tip <articleId> <amountOPN>")
  .description("Tip an article in native OPN")
  .option("-m, --memo <text>", "memo", "")
  .action(async (id, amt, opts) => {
    const { walletClient, publicClient } = clients();
    const value = parseEther(amt);
    const h = await walletClient.writeContract({
      address: ADDR.Router(),
      abi: routerAbi,
      functionName: "tipNative",
      args: [BigInt(id), opts.memo],
      value,
    });
    await awaitOk(publicClient, h);
    console.log(kleur.green(`✓ tipped ${amt} OPN to article #${id}`));
  });

// ----- stake / unstake / claim -----
program
  .command("stake <articleId> <amountOPN>")
  .description("Stake WOPN on an article. Auto-wraps and approves if needed.")
  .action(async (id, amt) => {
    const amount = parseEther(amt);
    await ensureWrappedAndApproved(ADDR.Vault(), amount);
    const { walletClient, publicClient } = clients();
    const h = await walletClient.writeContract({
      address: ADDR.Vault(),
      abi: vaultAbi,
      functionName: "stake",
      args: [BigInt(id), amount],
    });
    await awaitOk(publicClient, h);
    console.log(kleur.green(`✓ staked ${amt} on article #${id}`));
  });

program
  .command("unstake <articleId> <amountOPN>")
  .description("Unstake WOPN from an article")
  .action(async (id, amt) => {
    const { walletClient, publicClient } = clients();
    const h = await walletClient.writeContract({
      address: ADDR.Vault(),
      abi: vaultAbi,
      functionName: "unstake",
      args: [BigInt(id), parseEther(amt)],
    });
    await awaitOk(publicClient, h);
    console.log(kleur.green(`✓ unstaked ${amt} from article #${id}`));
  });

program
  .command("claim <articleId>")
  .description("Claim accrued reward from an article vault")
  .action(async (id) => {
    const { walletClient, publicClient } = clients();
    const h = await walletClient.writeContract({
      address: ADDR.Vault(),
      abi: vaultAbi,
      functionName: "claim",
      args: [BigInt(id)],
    });
    const r = await awaitOk(publicClient, h);
    console.log(kleur.green(`✓ claimed`), kleur.gray(`block ${r.blockNumber}`));
  });

program
  .command("vault <articleId>")
  .description("Show vault state for an article")
  .action(async (id) => {
    const { account, publicClient } = clients();
    const total = await publicClient.readContract({
      address: ADDR.Vault(),
      abi: vaultAbi,
      functionName: "totalStaked",
      args: [BigInt(id)],
    });
    const pending = await publicClient.readContract({
      address: ADDR.Vault(),
      abi: vaultAbi,
      functionName: "pendingReward",
      args: [BigInt(id), account.address],
    });
    const ui = await publicClient.readContract({
      address: ADDR.Vault(),
      abi: vaultAbi,
      functionName: "userInfo",
      args: [BigInt(id), account.address],
    });
    console.log(kleur.bold(`Article #${id}`));
    console.log(`  TVL              ${formatEther(total)} WOPN`);
    console.log(`  Your stake       ${formatEther(ui[0])} WOPN`);
    console.log(`  Pending reward   ${kleur.green(formatEther(pending))} WOPN`);
  });

// ----- stream -----
program
  .command("stream:open <recipient> <depositOPN> <perDayOPN>")
  .description("Open a per-second stream to <recipient>")
  .action(async (recipient, depositStr, perDayStr) => {
    const deposit = parseEther(depositStr);
    const perDay = parseEther(perDayStr);
    const ratePerSecond = perDay / 86400n;
    await ensureWrappedAndApproved(ADDR.Stream(), deposit);
    const { walletClient, publicClient } = clients();
    const h = await walletClient.writeContract({
      address: ADDR.Stream(),
      abi: streamAbi,
      functionName: "open",
      args: [recipient, deposit, ratePerSecond],
    });
    const r = await awaitOk(publicClient, h);
    // decode StreamOpened topic[1] (id)
    const log = r.logs.find(
      (l) => l.address.toLowerCase() === ADDR.Stream().toLowerCase()
    );
    const id = log?.topics?.[1] ? Number(BigInt(log.topics[1])) : "?";
    console.log(kleur.green(`✓ stream #${id} opened`),
      `${depositStr} OPN @ ${perDayStr} OPN/day`);
  });

program
  .command("stream:status <id>")
  .description("Show stream status (refreshes every second)")
  .option("-w, --watch", "live updates")
  .action(async (id, opts) => {
    const { publicClient } = clients();
    const idBn = BigInt(id);
    async function once() {
      const s = await publicClient.readContract({
        address: ADDR.Stream(),
        abi: streamAbi,
        functionName: "streams",
        args: [idBn],
      });
      const w = await publicClient.readContract({
        address: ADDR.Stream(),
        abi: streamAbi,
        functionName: "withdrawable",
        args: [idBn],
      });
      const r = await publicClient.readContract({
        address: ADDR.Stream(),
        abi: streamAbi,
        functionName: "remaining",
        args: [idBn],
      });
      const status = s[6] === 0n ? kleur.green("● active") : kleur.gray("○ stopped");
      const line = [
        `#${id}`,
        status,
        `flow ${formatEther(s[4] * 86400n)} /day`,
        `withdrawable ${kleur.cyan(formatEther(w))}`,
        `remaining ${formatEther(r)}`,
      ].join("  ");
      process.stdout.write(`\r${line}`.padEnd(120));
    }
    await once();
    if (opts.watch) {
      setInterval(once, 1000);
    } else {
      process.stdout.write("\n");
    }
  });

program
  .command("stream:withdraw <id>")
  .description("Withdraw streamed-but-unwithdrawn balance (recipient only)")
  .action(async (id) => {
    const { walletClient, publicClient } = clients();
    const h = await walletClient.writeContract({
      address: ADDR.Stream(),
      abi: streamAbi,
      functionName: "withdraw",
      args: [BigInt(id)],
    });
    await awaitOk(publicClient, h);
    console.log(kleur.green(`✓ withdrawn from stream #${id}`));
  });

program
  .command("stream:cancel <id>")
  .description("Cancel a stream (sender only)")
  .action(async (id) => {
    const { walletClient, publicClient } = clients();
    const h = await walletClient.writeContract({
      address: ADDR.Stream(),
      abi: streamAbi,
      functionName: "cancel",
      args: [BigInt(id)],
    });
    await awaitOk(publicClient, h);
    console.log(kleur.green(`✓ cancelled stream #${id}`));
  });

program.parseAsync(process.argv).catch((e) => {
  console.error(kleur.red(e.shortMessage ?? e.message ?? String(e)));
  process.exit(1);
});
