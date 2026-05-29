import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\n🟣 InkFi deploy on ${network.name}`);
  console.log(`   deployer: ${deployer.address}`);
  console.log(
    `   balance:  ${ethers.formatEther(
      await ethers.provider.getBalance(deployer.address)
    )} OPN\n`
  );

  // 1. Wrapped OPN
  const WOPN = await ethers.getContractFactory("WOPN");
  const wopn = await WOPN.deploy();
  await wopn.waitForDeployment();
  console.log(`✅ WOPN              ${await wopn.getAddress()}`);

  // 2. ArticleNFT
  const ArticleNFT = await ethers.getContractFactory("ArticleNFT");
  const articles = await ArticleNFT.deploy();
  await articles.waitForDeployment();
  console.log(`✅ ArticleNFT        ${await articles.getAddress()}`);

  // 3. ArticleVaultPool
  const Vault = await ethers.getContractFactory("ArticleVaultPool");
  const vault = await Vault.deploy(
    await wopn.getAddress(),
    await articles.getAddress()
  );
  await vault.waitForDeployment();
  console.log(`✅ ArticleVaultPool  ${await vault.getAddress()}`);

  // 4. TippingRouter
  const Router = await ethers.getContractFactory("TippingRouter");
  const router = await Router.deploy(
    await wopn.getAddress(),
    await articles.getAddress(),
    await vault.getAddress(),
    deployer.address // treasury = deployer for now
  );
  await router.waitForDeployment();
  console.log(`✅ TippingRouter     ${await router.getAddress()}`);

  // 5. Authorise router as reward notifier
  await (await vault.setNotifier(await router.getAddress(), true)).wait();
  console.log(`🔗 Router authorised on vault`);

  // 6. InkStream
  const Stream = await ethers.getContractFactory("InkStream");
  const stream = await Stream.deploy(await wopn.getAddress());
  await stream.waitForDeployment();
  console.log(`✅ InkStream         ${await stream.getAddress()}`);

  const out = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    contracts: {
      WOPN: await wopn.getAddress(),
      ArticleNFT: await articles.getAddress(),
      ArticleVaultPool: await vault.getAddress(),
      TippingRouter: await router.getAddress(),
      InkStream: await stream.getAddress(),
    },
    deployedAt: new Date().toISOString(),
  };

  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\n📝 saved → ${file}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
