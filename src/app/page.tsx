import { DynamicContextProvider, DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

export default function Home() {
  return (
    <main>
      <DynamicContextProvider
        settings={{
          environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!,
          walletConnectors: [EthereumWalletConnectors],
        }}>
        <DynamicWidget />
      </DynamicContextProvider>
    </main>
  );
}
