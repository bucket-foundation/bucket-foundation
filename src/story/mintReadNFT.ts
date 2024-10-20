import { RegisterIpAndMakeDerivativeResponse, RegisterIpResponse, StoryClient, StoryConfig } from '@story-protocol/core-sdk'
import { Address, http, toHex } from 'viem'
import { privateKeyToAccount, Account, Address as AccountsAddress } from 'viem/accounts'
import { mintNFT } from './utils/mintNFT'
import { NFTContractAddress, NonCommercialSocialRemixingTermsId, RPCProviderUrl } from './utils/utils'
import { IPCreate } from '@/lib/types'

export const mintReadNFT = async function (ip_metadata: { ip_metadata: IPCreate }) {
  const privateKey: AccountsAddress = `0x${process.env.WALLET_PRIVATE_KEY}`
  const account: Account = privateKeyToAccount(privateKey)

  const config: StoryConfig = {
    account: account,
    transport: http(RPCProviderUrl),
    chainId: 'iliad',
  }
  const client = StoryClient.newClient(config)

  const tokenId = await mintNFT(account.address, 'test-uri')
  const registeredIpResponse: RegisterIpResponse = await client.ipAsset.register({
    nftContract: NFTContractAddress,
    tokenId: tokenId!,
    // NOTE: I need to pull the db for metadata 
    ipMetadata: {
      ipMetadataURI: `https://wal-aggregator-testnet.staketab.org/v1/${ip_metadata.ip_metadata.ip_blob_id!}`,
      ipMetadataHash: toHex(ip_metadata.ip_metadata.ip_txn_hash, { size: 32 }),
      nftMetadataURI: `https://wal-aggregator-testnet.staketab.org/v1/${ip_metadata.ip_metadata.ip_blob_id!}`,
      nftMetadataHash: toHex(ip_metadata.ip_metadata.nft_txn_hash, { size: 32 }),
    },
    txOptions: { waitForTransaction: true },
  })
  console.log(`Root IPA created at transaction hash ${registeredIpResponse.txHash}, IPA ID: ${registeredIpResponse.ipId}`)

  // 3. Register a Derivative IP Asset
  //
  // Docs: https://docs.story.foundation/docs/spg-functions#register--derivative
  const derivativeTokenId = await mintNFT(account.address, 'test-uri')
  const registeredIpDerivativeResponse: RegisterIpAndMakeDerivativeResponse = await client.ipAsset.registerDerivativeIp({
    nftContract: NFTContractAddress,
    tokenId: derivativeTokenId!,
    derivData: {
      parentIpIds: [registeredIpResponse.ipId as Address],
      licenseTermsIds: [NonCommercialSocialRemixingTermsId],
    },
    // NOTE: THis will be exactly the same as original because it is read only.
    ipMetadata: {
      ipMetadataURI: `https://wal-aggregator-testnet.staketab.org/v1/${ip_metadata.ip_metadata.ip_blob_id!}`,
      ipMetadataHash: toHex(ip_metadata.ip_metadata.ip_txn_hash, { size: 32 }),
      nftMetadataURI: `https://wal-aggregator-testnet.staketab.org/v1/${ip_metadata.ip_metadata.ip_blob_id!}`,
      nftMetadataHash: toHex(ip_metadata.ip_metadata.nft_txn_hash, { size: 32 }),
    },
    txOptions: { waitForTransaction: true },
  })
  console.log(
    `Derivative IPA created at transaction hash ${registeredIpDerivativeResponse.txHash}, IPA ID: ${registeredIpDerivativeResponse.ipId}`
  )
}

