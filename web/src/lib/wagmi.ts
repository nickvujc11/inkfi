import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { opnTestnet } from "./chain";

export const wagmiConfig = getDefaultConfig({
  appName: "InkFi",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "inkfi-dev-fallback",
  chains: [opnTestnet],
  ssr: true,
});
