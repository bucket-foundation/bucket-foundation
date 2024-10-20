import { CreateIpAssetWithPilTermsResponse, IpMetadata, PIL_TYPE, StoryClient, StoryConfig } from '@story-protocol/core-sdk'
import { http } from 'viem'
import { CurrencyAddress, RPCProviderUrl, SPGNFTContractAddress } from './utils/utils'
import { privateKeyToAccount, Account, Address } from 'viem/accounts'
import { uploadJSONToWalrus } from './utils/uploadToWalrus'
import { createHash } from 'crypto'
import { toHex } from 'viem';
import { createClient } from '@supabase/supabase-js';
import { IPCreate, ResearchCreate } from '@/lib/types'

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
  metaId = meta.newlyCreated?.blobId ?? meta.alreadyCertified?.blobId ?? null;

  const ipHash = createHash('sha256').update(JSON.stringify(ipMetadata)).digest()

  const meta2 = await uploadJSONToWalrus(nftMetadata);
  metaId2 = meta2.newlyCreated?.blobId ?? meta2.alreadyCertified?.blobId ?? null;

  const nftHash = createHash('sha256').update(JSON.stringify(nftMetadata)).digest()

  console.log("IP METADATA ID: ", metaId!)
  console.log("NFT METADATA ID: ", metaId2!)

  const newCollection = await client.nftClient.createNFTCollection({
    name: 'Test NFT',
    symbol: 'TEST',
    txOptions: { waitForTransaction: true }
  });

  console.log("New Collection: ", newCollection.nftContract);

  const response: CreateIpAssetWithPilTermsResponse = await client.ipAsset.mintAndRegisterIpAssetWithPilTerms({
    nftContract: newCollection.nftContract as Address,
    currency: CurrencyAddress,
    pilType: PIL_TYPE.NON_COMMERCIAL_REMIX,
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
  const ipCreate: IPCreate = {
    ip_blob_id: metaId!,
    ip_txn_hash: toHex(ipHash, { size: 32 }),
    nft_blob_id: metaId2!,
    nft_txn_hash: toHex(nftHash, { size: 32 }),

  };


  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.from('research').insert(researchCreate)
  const { data2, error2 } = await supabase.from('ip_metadata').insert(ipCreate)

  if (error) {
    console.log(error)
  }
  if (error2) {
    console.log(error2)
  }
}


