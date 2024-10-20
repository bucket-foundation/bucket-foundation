
const WALRUS_AGGREGATOR_URLS = [
  "https://aggregator.walrus-testnet.walrus.space",
  "https://wal-aggregator-testnet.staketab.org",
  "https://walrus-testnet-aggregator.bartestnet.com",
  "https://walrus-testnet.blockscope.net",
  "https://walrus-testnet-aggregator.nodes.guru",
  "https://walrus-cache-testnet.overclock.run",
  "https://sui-walrus-testnet.bwarelabs.com/aggregator",
  "https://walrus-testnet-aggregator.stakin-nodes.com",
  "https://testnet-aggregator-walrus.kiliglab.io",
  "https://walrus-cache-testnet.latitude-sui.com",
  "https://walrus-testnet-aggregator.nodeinfra.com",
  "https://walrus-tn.juicystake.io:9443",
  "https://walrus-agg-testnet.chainode.tech:9002",
  "https://walrus-testnet-aggregator.starduststaking.com:11444",
  "http://walrus-testnet-aggregator.everstake.one:9000",
  "http://walrus.testnet.pops.one:9000",
  "http://scarlet-brussels-376c2.walrus.bdnodes.net:9000",
  "http://aggregator.testnet.sui.rpcpool.com:9000",
  "http://walrus.krates.ai:9000",
  "http://walrus-testnet.stakingdefenseleague.com:9000",
  "http://walrus.sui.thepassivetrust.com:9000"
];

export const downloadFileFromWalrus = async (path: string): Promise<File> => {
  for (const url of WALRUS_AGGREGATOR_URLS) {
    try {
      const response = await fetch(`${url}/v1/${path}`, {
        method: 'GET',
        mode: "cors"
      });

      if (!response.ok) {
        continue; // If the response is not OK, try the next URL
      }

      // Convert the response to a Blob
      const fileBlob = await response.blob();

      // Create a File from the Blob
      const file = new File([fileBlob], `${path}.pdf`, { type: fileBlob.type });

      return file; // Return the file if successful
    } catch (error) {
      console.log(error);
      // Continue to the next URL
    }
  }

  throw new Error('Failed to fetch file from all Walrus aggregators.');
};

export const downloadJSONFromWalrus = async (path: string): Promise<any> => {
  for (const url of WALRUS_AGGREGATOR_URLS) {
    try {
      const response = await fetch(`${url}/v1/${path}`, {
        method: 'GET',
        mode: "cors"
      });

      if (!response.ok) {
        continue; // If the response is not OK, try the next URL
      }

      // Parse the response as JSON
      const jsonData = await response.json();
      return jsonData; // Return the JSON data if successful
    } catch (error) {
      console.log(error);
      // Continue to the next URL
    }
  }

  throw new Error('Failed to fetch JSON from all Walrus aggregators.');
};

