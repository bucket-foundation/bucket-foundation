import { CreateIpAssetWithPilTermsResponse, IpMetadata, PIL_TYPE, RegisterIpAndMakeDerivativeResponse, RegisterIpResponse, StoryClient, StoryConfig } from '@story-protocol/core-sdk'
import { http, createWalletClient, createPublicClient, Address, Account, toHex } from 'viem'
import { iliad } from '@story-protocol/core-sdk'
import { defaultNftContractAbi } from './defaultContractAbi'
import { privateKeyToAccount } from 'viem/accounts'
import { uploadJSONToWalrus } from '../walrus/upload'
import { createHash } from 'crypto'
import { IpMetadataCreate, IpMetadataType, ResearchCreate } from '@/types'
import { supabase } from '../supabase/client'


export const RPCProviderUrl = process.env.RPC_PROVIDER_URL || 'https://testnet.storyrpc.io'
export const NFTContractAddress: Address = (process.env.NFT_CONTRACT_ADDRESS as Address) || '0xd2a4a4Cb40357773b658BECc66A6c165FD9Fc485'


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

  console.log("minted")
  if (logs[0].topics[3]) {
    return parseInt(logs[0].topics[3], 16)
  }
}

export async function mintReadNFT(ip_metadata: IpMetadataType) {
  const privateKey: Address = `0x${process.env.NEXT_PUBLIC_WALLET_PRIVATE_KEY}`
  const account: Account = privateKeyToAccount(privateKey)

  const config: StoryConfig = {
    account: account,
    transport: http(RPCProviderUrl),
    chainId: 'iliad',
  }
  const client = StoryClient.newClient(config)
  const tokenId = await mintNFT(account.address, 'test-uri')
  console.log(tokenId)
  const registeredIpResponse: RegisterIpResponse = await client.ipAsset.register({
    nftContract: NFTContractAddress,
    tokenId: tokenId!,
    ipMetadata: {
      ipMetadataURI: `https://wal-aggregator-testnet.staketab.org/v1/${ip_metadata.ip_blob_id!}`,
      ipMetadataHash: ip_metadata.ip_txn_hash! as `0x${string}`,
      nftMetadataURI: `https://wal-aggregator-testnet.staketab.org/v1/${ip_metadata.ip_blob_id!}`,
      nftMetadataHash: ip_metadata.nft_txn_hash! as `0x${string}`,
    },
    txOptions: { waitForTransaction: true },
  })

  console.log("Registered IP response: ", registeredIpResponse)

  const derivativeTokenId = await mintNFT(account.address, 'test-uri')
  const registeredIpDerivativeResponse: RegisterIpAndMakeDerivativeResponse = await client.ipAsset.registerDerivativeIp({
    nftContract: NFTContractAddress,
    tokenId: derivativeTokenId!,
    derivData: {
      parentIpIds: [registeredIpResponse.ipId as Address],
      licenseTermsIds: [1],
    },
    ipMetadata: {
      ipMetadataURI: `https://wal-aggregator-testnet.staketab.org/v1/${ip_metadata.ip_blob_id!}`,
      ipMetadataHash: ip_metadata.ip_txn_hash! as `0x${string}`,
      nftMetadataURI: `https://wal-aggregator-testnet.staketab.org/v1/${ip_metadata.ip_blob_id!}`,
      nftMetadataHash: ip_metadata.nft_txn_hash! as `0x${string}`,
    },
    txOptions: { waitForTransaction: true },
  })
}

export async function publishIpAsset({ title, description, blobId }: { title: string, description: string, blobId: string }) {

  const privateKey: Address = `0x${process.env.NEXT_PUBLIC_WALLET_PRIVATE_KEY}`
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
    image: `https://wal-aggregator-testnet.staketab.org/v1/${blobId}`,
  }

  let metaId: string;
  let metaId2: string;

  const meta = await uploadJSONToWalrus(ipMetadata);

  metaId = meta.newlyCreated?.blobObject?.blobId ?? meta.alreadyCertified?.blobId ?? null;

  const ipHash = createHash('sha256').update(JSON.stringify(ipMetadata)).digest();

  const meta2 = await uploadJSONToWalrus(nftMetadata);

  // Access the blobId correctly for NFT metadata
  metaId2 = meta2.newlyCreated?.blobObject?.blobId ?? meta2.alreadyCertified?.blobId ?? null;

  metaId2 = meta2.newlyCreated?.blobId ?? meta2.alreadyCertified?.blobId ?? null;

  const nftHash = createHash('sha256').update(JSON.stringify(nftMetadata)).digest();

  const newCollection = await client.nftClient.createNFTCollection({
    name: 'Test NFT',
    symbol: 'TEST',
    txOptions: { waitForTransaction: true }
  });

  console.log("New Collection: ", newCollection.nftContract);

  const response: CreateIpAssetWithPilTermsResponse = await client.ipAsset.mintAndRegisterIpAssetWithPilTerms({
    nftContract: newCollection.nftContract as Address,
    currency: (process.env.CURRENCY_ADDRESS as Address) || '0x91f6F05B08c16769d3c85867548615d270C42fC7',
    pilType: PIL_TYPE.COMMERCIAL_USE,
    mintingFee: 0,
    ipMetadata: {
      ipMetadataURI: `https://wal-aggregator-testnet.staketab.org/v1/${metaId!}`,
      ipMetadataHash: toHex(ipHash, { size: 32 }),
      nftMetadataURI: `https://wal-aggregator-testnet.staketab.org/v1/${metaId2!}`,
      nftMetadataHash: toHex(nftHash, { size: 32 }),
    },
    txOptions: { waitForTransaction: true },
  })

  const researchCreate: ResearchCreate = {
    title: title,
    description: description,
    blob_id: blobId,
    txn_hash: response.txHash!,
  };

  const { data: researchData, error: researchError } = await supabase
    .from('research')
    .insert(researchCreate)
    .select();

  console.log(researchData, researchError)


  const ipCreate: IpMetadataCreate = {
    research_id: researchData![0].id,
    ip_blob_id: metaId,
    ip_txn_hash: response.txHash,
    nft_blob_id: metaId2,
    nft_txn_hash: newCollection.txHash
  }

  const { data, error } = await supabase.from('ip_metadata').insert(ipCreate).select();

  console.log(data, error)
}

export function mintCiteNFT() { }

export function createNFTCollection() { }


