
// Function to upload a file to Walrus
export const uploadFileToWalrus = async (file: File): Promise<string> => {
  const WALRUS_PUBLISHER_URL = "https://publisher.walrus-testnet.walrus.space/v1/store";

  if (!WALRUS_PUBLISHER_URL) {
    throw new Error('Environment variable WALRUS_PUBLISHER_URL is not defined.');
  }

  const response = await fetch(WALRUS_PUBLISHER_URL, {
    method: 'PUT',
    body: file, // Directly send the file as the body
    headers: {
      'Content-Type': file.type, // Set the Content-Type to the file's MIME type
    },
  });

  if (!response.ok) {
    const errorMessage = await response.text(); // Get response body for more context
    throw new Error(`Failed to upload file: ${response.statusText} - ${errorMessage}`);
  }

  const data = await response.json();
  console.log(data);
  return data.newlyCreated.blobObject.blobId; // Ensure the response contains blobId
};

// Function to upload JSON metadata to Walrus
export const uploadJSONToWalrus = async (jsonMetadata: Record<string, any>): Promise<string> => {
  const WALRUS_PUBLISHER_URL = process.env.WALRUS_PUBLISHER_URL || "https://publisher.walrus-testnet.walrus.space/v1/store";

  if (!WALRUS_PUBLISHER_URL) {
    throw new Error('Environment variable WALRUS_PUBLISHER_URL is not defined.');
  }

  const response = await fetch(WALRUS_PUBLISHER_URL, {
    method: 'PUT',
    body: JSON.stringify(jsonMetadata),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorMessage = await response.text(); // Get response body for more context
    throw new Error(`Failed to upload JSON metadata: ${response.statusText} - ${errorMessage}`);
  }

  const data = await response.json();
  console.log(data);
  return data.newlyCreated.blobObject.blobId; // Ensure the response contains blobId
};

