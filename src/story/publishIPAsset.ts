import { CreateIpAssetWithPilTermsResponse, IpMetadata, PIL_TYPE, StoryClient, StoryConfig } from '@story-protocol/core-sdk'
import { http } from 'viem'
import { RPCProviderUrl, SPGNFTContractAddress } from './utils/utils'
import { privateKeyToAccount, Account, Address } from 'viem/accounts'
import { uploadJSONToWalrus } from './utils/uploadToWalrus'
import { createHash } from 'crypto'

export interface publishIPAssetProps {
  title: string;
  description: string;
  blobId: string;
}

export const publishIPAsset = async function ({ title, description, blobId }: publishIPAssetProps) {
  console.log("WALLET PRIVATE KEY", process.env.NEXT_PUBLIC_WALLET_PRIVATE_KEY)

  const privateKey: Address = `0x${process.env.NEXT_PUBLIC_WALLET_PRIVATE_KEY}`
  const account: Account = privateKeyToAccount(privateKey)

  console.log("PRIVATE KEY", privateKey)
  console.log("ACCOUNT KEY", account)


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
    image: `https://wal-aggregator-testnet.staketab.org/v1/${blobId}`,
  }

  let metaId: string;
  let metaId2: string;

  const meta = await uploadJSONToWalrus(ipMetadata);
  metaId = meta.newlyCreated?.blobObject?.blobId ?? meta.alreadyCertified?.blobObject?.blobId ?? null;

  const ipHash = createHash('sha256').update(JSON.stringify(ipMetadata)).digest('hex')

  const meta2 = await uploadJSONToWalrus(nftMetadata);
  metaId2 = meta2.newlyCreated?.blobObject?.blobId ?? meta2.alreadyCertified?.blobObject?.blobId ?? null;

  const nftHash = createHash('sha256').update(JSON.stringify(nftMetadata)).digest('hex')

  console.log("IP METADATA ID: ", metaId!)
  console.log("NFT METADATA ID: ", metaId2!)

  const response: CreateIpAssetWithPilTermsResponse = await client.ipAsset.mintAndRegisterIpAssetWithPilTerms({
    nftContract: SPGNFTContractAddress,
    pilType: PIL_TYPE.NON_COMMERCIAL_REMIX,
    ipMetadata: {
      ipMetadataURI: `https://wal-aggregator-testnet.staketab.org/v1/${metaId!}`,
      ipMetadataHash: `0x${ipHash}`,
      nftMetadataURI: `https://wal-aggregator-testnet.staketab.org/v1/${metaId2!}`,
      nftMetadataHash: `0x${nftHash}`,
    },
    txOptions: { waitForTransaction: true },
  })
  console.log(`Root IPA created at transaction hash ${response.txHash}, IPA ID: ${response.ipId}`)
  console.log(`View on the explorer: https://explorer.story.foundation/ipa/${response.ipId}`)
}


