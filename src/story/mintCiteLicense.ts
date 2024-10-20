import { RegisterIpAndMakeDerivativeResponse, RegisterIpResponse, StoryClient, StoryConfig } from '@story-protocol/core-sdk'
import { Address, http, toHex } from 'viem'
import { privateKeyToAccount, Account, Address as AccountsAddress } from 'viem/accounts'
import { NFTContractAddress, NonCommercialSocialRemixingTermsId, RPCProviderUrl } from './utils/utils'
import { IPCreate } from '@/lib/types'

export const mintCiteLicense = async function (ip_id: Address) {
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
  console.log("IPID", ip_id)
  const response = await client.license.mintLicenseTokens({
    licenseTermsId: "1",
    licensorIpId: ip_id,
    amount: 1,
    txOptions: { waitForTransaction: true }
  });

  console.log(`License Token minted at transaction hash ${response.txHash}, License IDs: ${response.licenseTokenIds}`)
}

