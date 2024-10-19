
// Function to upload a file to Walrus
export const uploadFileToWalrus = async (file: File): Promise<string> => {
  const WALRUS_PUBLISHER_URL = process.env.WALRUS_PUBLISHER_URL || "https://walrus.publisher.agfarms.dev/v1/store/"
    ;

  if (!WALRUS_PUBLISHER_URL) {
    throw new Error('Environment variable WALRUS_PUBLISHER_URL is not defined.');
  }

  const formData = new FormData();
  formData.append('file', file); // Append the file to the FormData

  const response = await fetch(WALRUS_PUBLISHER_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorMessage = await response.text(); // Get response body for more context
    throw new Error(`Failed to upload file: ${response.statusText} - ${errorMessage}`);
  }

  const data = await response.json();
  return data.blobId; // Ensure the response contains blobId
};

// Function to upload JSON metadata to Walrus
export const uploadJSONToWalrus = async (jsonMetadata: Record<string, any>): Promise<string> => {
  const WALRUS_PUBLISHER_URL = process.env.WALRUS_PUBLISHER_URL;

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
  return data.blobId; // Ensure the response contains blobId
};

