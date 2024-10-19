
import { CreateIpAssetWithPilTermsResponse, IpMetadata, PIL_TYPE, StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { http } from 'viem';
import { RPCProviderUrl, SPGNFTContractAddress, account } from './utils/utils';
import { uploadJSONToIPFS } from './utils/uploadToIpfs';
import { createHash } from 'crypto';

export const publishIPAsset = async (
    title: string,
    description: string,
    pdfFile: File // Expecting a PDF file
) => {
    const config: StoryConfig = {
        account: account,
        transport: http(RPCProviderUrl),
        chainId: 'iliad',
    };
    const client = StoryClient.newClient(config);

    // Upload the PDF file to IPFS and get the URI
    const pdfIpfsHash = await uploadPDFToIPFS(pdfFile); // Implement this function to upload and return the IPFS URI

    const ipMetadata: IpMetadata = client.ipAsset.generateIpMetadata({
        title: title,
        description: description,
        attributes: [
            {
                key: 'File',
                value: pdfIpfsHash, // Use the PDF IPFS URI as the file attribute
            },
        ],
    });

    const nftMetadata = {
        name: 'NFT representing ownership of IP Asset',
        description: 'This NFT represents ownership of an IP Asset',
        image: pdfIpfsHash, // Use the PDF URI as the image string
    };

    const ipIpfsHash = await uploadJSONToIPFS(ipMetadata);
    const ipHash = createHash('sha256').update(JSON.stringify(ipMetadata)).digest('hex');
    const nftIpfsHash = await uploadJSONToIPFS(nftMetadata);
    const nftHash = createHash('sha256').update(JSON.stringify(nftMetadata)).digest('hex');

    const response: CreateIpAssetWithPilTermsResponse = await client.ipAsset.mintAndRegisterIpAssetWithPilTerms({
        nftContract: SPGNFTContractAddress,
        pilType: PIL_TYPE.NON_COMMERCIAL_REMIX,
        ipMetadata: {
            ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
            ipMetadataHash: `0x${ipHash}`,
            nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
            nftMetadataHash: `0x${nftHash}`,
        },
        txOptions: { waitForTransaction: true },
    });

    console.log(`Root IPA created at transaction hash ${response.txHash}, IPA ID: ${response.ipId}`);
    console.log(`View on the explorer: https://explorer.story.foundation/ipa/${response.ipId}`);
};

// Example implementation of uploadPDFToIPFS (you will need to implement this)
const uploadPDFToIPFS = async (pdfFile: File): Promise<string> => {
    // Your implementation here to upload the PDF file to IPFS and return the hash
    // You may use similar logic as `uploadJSONToIPFS`, but for a PDF file
    return "pdfIpfsHash"; // Replace with actual IPFS hash after uploading
};

