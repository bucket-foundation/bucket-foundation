export const downloadFileFromWalrus = async (path: string): Promise<File> => {
  const WALRUS_AGGREGATOR_URL = "http://5.161.189.192:31415";

  if (!WALRUS_AGGREGATOR_URL) {
    throw new Error('Environment variable WALRUS_AGGREGATOR_URL is not defined.');
  }

  const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/${path}`, {
    method: 'GET',
    mode: "cors"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }

  // Convert the response to a Blob
  const fileBlob = await response.blob();

  // Create a File from the Blob
  const file = new File([fileBlob], `${path}.pdf`, { type: fileBlob.type });

  return file;
};

