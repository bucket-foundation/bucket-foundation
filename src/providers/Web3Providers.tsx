
"use client";
import { http, createConfig, WagmiProvider, useWalletClient } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { PropsWithChildren } from "react";
import { createWalletClient, type Chain } from "viem";
import { StoryProvider } from "@story-protocol/react-sdk";
import { AuthorProvider } from "@/context/AuthorContext";
import { ResearchProvider } from "@/context/ResearchContext";
import { CiteTokenProvider } from "@/context/CiteTokensContext";


export const iliad = {
  id: 1513, // Your custom chain ID
  name: "Story Network Testnet",
  nativeCurrency: {
    name: "Testnet IP",
    symbol: "IP",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://testnet.storyrpc.io"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://testnet.storyscan.xyz" },
  },
  testnet: true,
} as const satisfies Chain;

export const evmNetworks = [
  {
    blockExplorerUrls: ["https://testnet.storyscan.xyz"],
    chainId: 1513,
    chainName: 'Story Network Testnet',
    iconUrls: ['https://app.dynamic.xyz/assets/networks/story.svg'],
    name: 'Story',
    nativeCurrency: {
      decimals: 18,
      name: 'Testnet IP',
      symbol: 'IP',
      iconUrl: 'https://app.dynamic.xyz/assets/networks/story.svg',
    },
    networkId: 1513,
    rpcUrls: ['https://testnet.storyrpc.io'],
    vanityName: 'Iliad',
  },


]

const config = createConfig({
  chains: [iliad],
  multiInjectedProviderDiscovery: false,
  transports: {
    [iliad.id]: http(),
  },
});
const queryClient = new QueryClient();

export default function Web3Providers({ children }: PropsWithChildren) {
  return (
    // setup dynamic
    <DynamicContextProvider
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!,
        walletConnectors: [EthereumWalletConnectors],
        overrides: { evmNetworks },
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            <StoryProviderWrapper>
              <AuthorProvider>
                <ResearchProvider>
                  <CiteTokenProvider>
                    {children}
                  </CiteTokenProvider>
                </ResearchProvider>
              </AuthorProvider>
            </StoryProviderWrapper>
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}

function StoryProviderWrapper({ children }: PropsWithChildren) {
  const { data: wallet } = useWalletClient();

  const dummyWallet = createWalletClient({
    chain: iliad,
    transport: http("https://testnet.storyrpc.io"),
  });

  return (
    <StoryProvider
      config={{
        chainId: "iliad",
        transport: http(process.env.NEXT_PUBLIC_RPC_PROVIDER_URL),
        wallet: wallet || dummyWallet,
      }}
    >
      {children}
    </StoryProvider>
  )
}

