
// Function to upload a file to Walrus
export const uploadFileToWalrus = async (file: File): Promise<any> => {
  const WALRUS_PUBLISHER_URL = "https://publisher.walrus-testnet.walrus.space/v1/store";

  if (!WALRUS_PUBLISHER_URL) {
    throw new Error('Environment variable WALRUS_PUBLISHER_URL is not defined.');
  }

  const response = await fetch(WALRUS_PUBLISHER_URL, {
    method: 'PUT',
    body: file, // Directly send the file as the body
  });

  if (!response.ok) {
    const errorMessage = await response.text(); // Get response body for more context
    throw new Error(`Failed to upload file: ${response.statusText} - ${errorMessage}`);
  }

  const data = await response.json();
  console.log(data);
  return data;
};

// function to upload json metadata to walrus
export const uploadJSONToWalrus = async (jsonmetadata: Record<string, any>): Promise<any> => {
  const walrus_publisher_url = process.env.walrus_publisher_url || "https://walrus-testnet-publisher.nodes.guru/v1/store";

  if (!walrus_publisher_url) {
    throw new error('environment variable walrus_publisher_url is not defined.');
  }

  const response = await fetch(walrus_publisher_url, {
    method: 'PUT',
    body: JSON.stringify(jsonmetadata),
  });

  if (!response.ok) {
    const errormessage = await response.text(); // get response body for more context
    throw new Error(`failed to upload json metadata: ${response.statusText} - ${errormessage}`);
  }

  const data = await response.json();
  console.log(data);
  return data;
};

