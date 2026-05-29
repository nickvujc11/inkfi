import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type {
  ArticleNFT,
  ArticleVaultPool,
  InkStream,
  TippingRouter,
  WOPN,
} from "../typechain-types";

const ETHER = (n: string | number) => ethers.parseEther(String(n));
const HASH = ethers.id;

describe("InkFi", () => {
  async function deployAll() {
    const [deployer, writer, alice, bob, treasury] = await ethers.getSigners();

    const wopn = (await (
      await ethers.getContractFactory("WOPN")
    ).deploy()) as unknown as WOPN;
    const articles = (await (
      await ethers.getContractFactory("ArticleNFT")
    ).deploy()) as unknown as ArticleNFT;
    const vault = (await (
      await ethers.getContractFactory("ArticleVaultPool")
    ).deploy(
      await wopn.getAddress(),
      await articles.getAddress()
    )) as unknown as ArticleVaultPool;
    const router = (await (
      await ethers.getContractFactory("TippingRouter")
    ).deploy(
      await wopn.getAddress(),
      await articles.getAddress(),
      await vault.getAddress(),
      treasury.address
    )) as unknown as TippingRouter;
    await vault.setNotifier(await router.getAddress(), true);
    const stream = (await (
      await ethers.getContractFactory("InkStream")
    ).deploy(await wopn.getAddress())) as unknown as InkStream;

    // writer publishes article #1
    await articles.connect(writer).publish("ipfs://content-1", HASH("c1"));

    // Pre-fund alice & bob with WOPN
    await wopn.connect(alice).deposit({ value: ETHER(100) });
    await wopn.connect(bob).deposit({ value: ETHER(100) });

    return { deployer, writer, alice, bob, treasury, wopn, articles, vault, router, stream };
  }

  describe("ArticleNFT", () => {
    it("publishes and is soulbound", async () => {
      const { articles, writer, alice } = await deployAll();
      expect(await articles.writerOf(1)).to.equal(writer.address);
      expect(await articles.ownerOf(1)).to.equal(writer.address);
      // Soulbound: cannot transfer
      await expect(
        articles
          .connect(writer)
          .transferFrom(writer.address, alice.address, 1)
      ).to.be.revertedWithCustomError(articles, "Soulbound");
    });

    it("only writer can push new versions", async () => {
      const { articles, writer, alice } = await deployAll();
      await expect(
        articles.connect(alice).pushVersion(1, "ipfs://x", HASH("x"))
      ).to.be.revertedWithCustomError(articles, "NotWriter");
      await articles
        .connect(writer)
        .pushVersion(1, "ipfs://content-1-v2", HASH("c1v2"));
      const a = await articles.articles(1);
      expect(a.version).to.equal(2);
      expect(a.contentURI).to.equal("ipfs://content-1-v2");
    });
  });

  describe("Tipping (no stakers)", () => {
    it("redirects staker share to writer when no stakers exist", async () => {
      const { router, writer, alice, treasury, wopn } = await deployAll();

      const writerBefore = await wopn.balanceOf(writer.address);
      const treasuryBefore = await wopn.balanceOf(treasury.address);

      await router.connect(alice).tipNative(1, "first tip", { value: ETHER(10) });

      const writerAfter = await wopn.balanceOf(writer.address);
      const treasuryAfter = await wopn.balanceOf(treasury.address);

      // 95% to writer, 5% to treasury (since no stakers)
      expect(writerAfter - writerBefore).to.equal(ETHER(9.5));
      expect(treasuryAfter - treasuryBefore).to.equal(ETHER(0.5));
    });
  });

  describe("Tipping (with stakers)", () => {
    it("splits 70/25/5 among writer / stakers / treasury", async () => {
      const { router, vault, writer, alice, bob, treasury, wopn } =
        await deployAll();

      // Alice stakes 50 WOPN on article 1
      await wopn.connect(alice).approve(await vault.getAddress(), ETHER(50));
      await vault.connect(alice).stake(1, ETHER(50));

      // Bob tips 10 OPN
      await router.connect(bob).tipNative(1, "great post", {
        value: ETHER(10),
      });

      // Writer gets 7
      expect(await wopn.balanceOf(writer.address)).to.equal(ETHER(7));
      // Treasury gets 0.5
      expect(await wopn.balanceOf(treasury.address)).to.equal(ETHER(0.5));
      // Alice's pending reward = 2.5 (she's the only staker)
      expect(await vault.pendingReward(1, alice.address)).to.equal(ETHER(2.5));

      // Alice claims
      await vault.connect(alice).claim(1);
      expect(await vault.pendingReward(1, alice.address)).to.equal(0);
    });

    it("distributes pro-rata to multiple stakers", async () => {
      const { router, vault, alice, bob, wopn } = await deployAll();

      await wopn.connect(alice).approve(await vault.getAddress(), ETHER(75));
      await wopn.connect(bob).approve(await vault.getAddress(), ETHER(25));
      await vault.connect(alice).stake(1, ETHER(75));
      await vault.connect(bob).stake(1, ETHER(25));

      // Tip 100 → 25 to stakers
      await router.connect(alice).tipNative(1, "x", { value: ETHER(100) });

      // alice 75% of 25 = 18.75 ; bob 25% of 25 = 6.25
      expect(await vault.pendingReward(1, alice.address)).to.equal(
        ETHER("18.75")
      );
      expect(await vault.pendingReward(1, bob.address)).to.equal(
        ETHER("6.25")
      );
    });

    it("late stakers do not get retroactive rewards", async () => {
      const { router, vault, alice, bob, wopn } = await deployAll();

      await wopn.connect(alice).approve(await vault.getAddress(), ETHER(50));
      await vault.connect(alice).stake(1, ETHER(50));

      // First tip — only alice staked
      await router.connect(bob).tipNative(1, "early", { value: ETHER(10) });
      expect(await vault.pendingReward(1, alice.address)).to.equal(ETHER(2.5));
      expect(await vault.pendingReward(1, bob.address)).to.equal(0);

      // Bob stakes after tip
      await wopn.connect(bob).approve(await vault.getAddress(), ETHER(50));
      await vault.connect(bob).stake(1, ETHER(50));

      // Second tip 10 — split 50/50
      await router.connect(alice).tipNative(1, "late", { value: ETHER(10) });
      expect(await vault.pendingReward(1, alice.address)).to.equal(
        ETHER("3.75")
      );
      expect(await vault.pendingReward(1, bob.address)).to.equal(
        ETHER("1.25")
      );
    });

    it("unstake returns principal and preserves accrued reward", async () => {
      const { router, vault, alice, bob, wopn } = await deployAll();

      await wopn.connect(alice).approve(await vault.getAddress(), ETHER(50));
      await vault.connect(alice).stake(1, ETHER(50));

      await router.connect(bob).tipNative(1, "x", { value: ETHER(10) });
      expect(await vault.pendingReward(1, alice.address)).to.equal(ETHER(2.5));

      const before = await wopn.balanceOf(alice.address);
      await vault.connect(alice).unstake(1, ETHER(50));
      const after = await wopn.balanceOf(alice.address);
      expect(after - before).to.equal(ETHER(50));
      // Reward still claimable
      expect(await vault.pendingReward(1, alice.address)).to.equal(ETHER(2.5));
    });
  });

  describe("InkStream", () => {
    it("streams per second and recipient can withdraw", async () => {
      const { stream, wopn, alice, writer } = await deployAll();

      const rate = ETHER("0.001"); // 0.001 WOPN/sec
      const deposit = ETHER(100);

      await wopn.connect(alice).approve(await stream.getAddress(), deposit);
      const tx = await stream.connect(alice).open(writer.address, deposit, rate);
      await tx.wait();

      // advance 1 hour = 3600s → 3.6 WOPN streamed
      await time.increase(3600);

      const owed = await stream.withdrawable(1);
      expect(owed).to.equal(ETHER("3.6"));

      const before = await wopn.balanceOf(writer.address);
      await stream.connect(writer).withdraw(1);
      const after = await wopn.balanceOf(writer.address);
      // small delta from extra block timestamp
      expect(after - before).to.be.gte(ETHER("3.6"));
    });

    it("sender can cancel and gets remainder back", async () => {
      const { stream, wopn, alice, writer } = await deployAll();

      const rate = ETHER("0.01");
      const deposit = ETHER(100);
      await wopn.connect(alice).approve(await stream.getAddress(), deposit);
      await stream.connect(alice).open(writer.address, deposit, rate);

      await time.increase(60); // 60s × 0.01 = 0.6 streamed

      const aliceBefore = await wopn.balanceOf(alice.address);
      const writerBefore = await wopn.balanceOf(writer.address);
      await stream.connect(alice).cancel(1);
      const aliceAfter = await wopn.balanceOf(alice.address);
      const writerAfter = await wopn.balanceOf(writer.address);

      // Writer received ~0.6, alice received ~99.4 back
      expect(writerAfter - writerBefore).to.be.closeTo(ETHER("0.6"), ETHER("0.05"));
      expect(aliceAfter - aliceBefore).to.be.closeTo(
        ETHER("99.4"),
        ETHER("0.05")
      );
    });

    it("only sender can cancel, only recipient can withdraw", async () => {
      const { stream, wopn, alice, bob, writer } = await deployAll();

      await wopn.connect(alice).approve(await stream.getAddress(), ETHER(10));
      await stream.connect(alice).open(writer.address, ETHER(10), ETHER("0.001"));

      await expect(
        stream.connect(bob).cancel(1)
      ).to.be.revertedWithCustomError(stream, "NotSender");
      await expect(
        stream.connect(bob).withdraw(1)
      ).to.be.revertedWithCustomError(stream, "NotRecipient");
    });

    it("caps streamed amount at deposit", async () => {
      const { stream, wopn, alice, writer } = await deployAll();
      const rate = ETHER(1); // 1 WOPN/sec
      const deposit = ETHER(10);
      await wopn.connect(alice).approve(await stream.getAddress(), deposit);
      await stream.connect(alice).open(writer.address, deposit, rate);

      await time.increase(60); // way more than deposit allows
      expect(await stream.streamedSoFar(1)).to.equal(deposit);
    });
  });
});
