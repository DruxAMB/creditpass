import { http, createConfig, createStorage } from "wagmi";
import { creditCoin3Testnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [creditCoin3Testnet, sepolia],
  connectors: [
    injected(),
  ],
  multiInjectedProviderDiscovery: true,
  storage: createStorage({ storage: typeof window !== "undefined" ? window.localStorage : undefined }),
  transports: {
    [creditCoin3Testnet.id]: http("https://rpc.cc3-testnet.creditcoin.network"),
    [sepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
