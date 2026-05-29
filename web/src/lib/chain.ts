import { defineChain } from "viem";

export const opnTestnet = defineChain({
  id: 984,
  name: "OPN Chain Testnet",
  nativeCurrency: { decimals: 18, name: "OPN", symbol: "OPN" },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.iopn.tech"] },
  },
  blockExplorers: {
    default: {
      name: "OPN Explorer",
      url: "https://testnet-explorer.iopn.tech",
    },
  },
  testnet: true,
});
