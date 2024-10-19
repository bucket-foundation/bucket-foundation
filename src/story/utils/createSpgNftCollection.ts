import { StoryClient, StoryConfig } from '@story-protocol/core-sdk'
import { http } from 'viem'
import { RPCProviderUrl } from './utils'

import { privateKeyToAccount, Account, Address as AccountsAddress } from 'viem/accounts'

const main = async function () {
  const privateKey: AccountsAddress = `0x${process.env.WALLET_PRIVATE_KEY}`
  const account: Account = privateKeyToAccount(privateKey)


  const config: StoryConfig = {
    account: account,
    transport: http(RPCProviderUrl),
    chainId: 'iliad',
  }
  const client = StoryClient.newClient(config)

  // 2. Create a new SPG NFT collection
  //
  // NOTE: Use this code to create a new SPG NFT collection. You can then use the
  // `newCollection.nftContract` address as the `nftContract` argument in
  // functions like `mintAndRegisterIpAssetWithPilTerms` in the `metadataExample.ts` file.
  //
  // You will mostly only have to do this once. Once you get your nft contract address,
  // you can use it in SPG functions.
  //
  const newCollection = await client.nftClient.createNFTCollection({
    name: 'Test NFT',
    symbol: 'TEST',
    txOptions: { waitForTransaction: true },
  })

  console.log(
    `New SPG NFT collection created at transaction hash ${newCollection.txHash}`,
    `NFT contract address: ${newCollection.nftContract}`
  )
}

main()
