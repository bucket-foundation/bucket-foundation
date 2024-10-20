
const walrusPublisherUrls = [
  "https://walrus.publisher.agfarms.dev/v1/store",
  "http://walrus.publisher.agfarms.dev/v1/store",
  "http://walrus-publisher-testnet.overclock.run:9001/v1/store",
  "http://walrus-testnet-publisher.everstake.one:9001/v1/store",
  "http://walrus.testnet.pops.one:9001/v1/store",
  "http://ivory-dakar-e5812.walrus.bdnodes.net:9001/v1/store",
  "http://publisher.testnet.sui.rpcpool.com:9001/v1/store",
  "http://walrus.krates.ai:9001/v1/store",
  "http://walrus-publisher-testnet.latitude-sui.com:9001/v1/store",
  "http://walrus-tn.juicystake.io:9090/v1/store",
  "http://walrus-testnet.stakingdefenseleague.com:9001/v1/store",
  "http://walrus.sui.thepassivetrust.com:9001/v1/store",
  "https://publisher.walrus-testnet.walrus.space/v1/store",
  "https://wal-publisher-testnet.staketab.org/v1/store",
  "https://walrus-testnet-publisher.bartestnet.com/v1/store",
  "https://walrus-testnet-publisher.nodes.guru/v1/store",
  "https://sui-walrus-testnet.bwarelabs.com/publisher/v1/store",
  "https://walrus-testnet-publisher.stakin-nodes.com/v1/store",
  "https://testnet-publisher-walrus.kiliglab.io/v1/store",
  "https://walrus-testnet-publisher.nodeinfra.com/v1/store",
  "https://walrus-testnet.blockscope.net:11444/v1/store",
  "https://walrus-publish-testnet.chainode.tech:9003/v1/store",
  "https://walrus-testnet-publisher.starduststaking.com:11445/v1/store",

];

// Function to upload a file to Walrus
export const uploadFileToWalrus = async (file: File): Promise<any> => {
  for (const url of walrusPublisherUrls) {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        body: file,
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        console.error(`Failed to upload file to ${url}: ${response.statusText} - ${errorMessage}`);
        continue; // Try the next URL
      }

      const data = await response.json();
      console.log(`File uploaded successfully to ${url}:`, data);
      return data; // Return after successful upload
    } catch (error) {
      console.error(`Error uploading file to ${url}:`, error);
    }
  }
  throw new Error('All upload attempts failed.');
};

// Function to upload JSON metadata to Walrus
export const uploadJSONToWalrus = async (jsonmetadata: Record<string, any>): Promise<any> => {
  for (const url of walrusPublisherUrls) {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        body: JSON.stringify(jsonmetadata),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        console.error(`Failed to upload JSON metadata to ${url}: ${response.statusText} - ${errorMessage}`);
        continue; // Try the next URL
      }

      const data = await response.json();
      console.log(`JSON metadata uploaded successfully to ${url}:`, data);
      return data; // Return after successful upload
    } catch (error) {
      console.error(`Error uploading JSON metadata to ${url}:`, error);
    }
  }
  throw new Error('All upload attempts failed.');
};

