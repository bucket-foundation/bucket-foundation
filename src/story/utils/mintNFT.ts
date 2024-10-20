import { http, createWalletClient, createPublicClient, Address } from 'viem'
import { NFTContractAddress, RPCProviderUrl } from './utils'
import { iliad } from '@story-protocol/core-sdk'
import { defaultNftContractAbi } from './defaultNftContractAbi'

import { privateKeyToAccount, Account, Address as AccountsAddress } from 'viem/accounts'
export async function mintNFT(to: Address, uri: string): Promise<number | undefined> {
  console.log("WALLET PRIVATE KEY", process.env.NEXT_PUBLIC_WALLET_PRIVATE_KEY)

  const privateKey: Address = `0x${process.env.NEXT_PUBLIC_WALLET_PRIVATE_KEY}`
  const account: Account = privateKeyToAccount(privateKey)

  console.log("PRIVATE KEY", privateKey)
  console.log("ACCOUNT KEY", account)

  const baseConfig = {
    chain: iliad,
    transport: http(RPCProviderUrl),
  } as const
  const publicClient = createPublicClient(baseConfig)
  const walletClient = createWalletClient({
    ...baseConfig,
    account,
  })

  console.log('Minting a new NFT...')

  const { request } = await publicClient.simulateContract({
    address: NFTContractAddress,
    functionName: 'mintNFT',
    args: [to, uri],
    abi: defaultNftContractAbi,
  })
  const hash = await walletClient.writeContract(request)
  const { logs } = await publicClient.waitForTransactionReceipt({
    hash,
  })
  if (logs[0].topics[3]) {
    return parseInt(logs[0].topics[3], 16)
  }
}
