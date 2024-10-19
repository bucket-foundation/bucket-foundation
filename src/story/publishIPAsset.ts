
import { CreateIpAssetWithPilTermsResponse, IpMetadata, PIL_TYPE, StoryClient, StoryConfig } from '@story-protocol/core-sdk'
import { http } from 'viem'
import { RPCProviderUrl, SPGNFTContractAddress } from './utils/utils'
import { createHash } from 'crypto'
import { privateKeyToAccount, Account, Address } from 'viem/accounts'
import { uploadJSONToWalrus } from './utils/uploadToWalrus'

export interface publishIPAssetProps {
  title: string;
  description: string;
  image: string;
}

export const publishIPAsset = async function ({ title, description, image }: publishIPAssetProps) {
  const privateKey: Address = `0x${process.env.WALLET_PRIVATE_KEY}`
  const account: Account = privateKeyToAccount(privateKey)


  const config: StoryConfig = {
    account: account,
    transport: http(RPCProviderUrl),
    chainId: 'iliad',
  }
  const client = StoryClient.newClient(config)

  const ipMetadata: IpMetadata = client.ipAsset.generateIpMetadata({
    title: title,
    description: description,
    attributes: [
      {
        key: 'Rarity',
        value: 'Legendary',
      },
    ],
  })

  const nftMetadata = {
    name: title,
    description: description,
    image: image,
  }

  const ipIpfsHash = await uploadJSONToWalrus(ipMetadata)
  const ipHash = createHash('sha256').update(JSON.stringify(ipMetadata)).digest('hex')
  const nftIpfsHash = await uploadJSONToWalrus(nftMetadata)
  const nftHash = createHash('sha256').update(JSON.stringify(nftMetadata)).digest('hex')

  const response: CreateIpAssetWithPilTermsResponse = await client.ipAsset.mintAndRegisterIpAssetWithPilTerms({
    nftContract: SPGNFTContractAddress,
    pilType: PIL_TYPE.NON_COMMERCIAL_REMIX,
    ipMetadata: {
      ipMetadataURI: `http://walrus.publisher.agfarms.dev/v1/${ipIpfsHash}`,
      ipMetadataHash: `0x${ipHash}`,
      nftMetadataURI: `http://walrus.aggregator.agfarms.dev/v1/${nftIpfsHash}`,
      nftMetadataHash: `0x${nftHash}`,
    },
    txOptions: { waitForTransaction: true },
  })
  console.log(`Root IPA created at transaction hash ${response.txHash}, IPA ID: ${response.ipId}`)
  console.log(`View on the explorer: https://explorer.story.foundation/ipa/${response.ipId}`)
}


