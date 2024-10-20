export type IP = {
  id: number;
  createdAt: string;
  ip_blob_id: string;
  ip_txn_hash: string;
  nft_blob_id: string;
  nft_txn_hash: string;
}

// Type representing a record in the author table
export type Author = {
  id: number; // or bigint
  created_at: Date; // or string if you prefer
  wallet_address?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};


// Type representing the data needed to create a new Author
export type AuthorCreate = {
  wallet_address?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

// Type representing a record in the ip_metadata table
export type IpMetadataType = {
  id: number; // or bigint
  created_at: Date; // or string if you prefer
  ip_blob_id?: string | null;
  ip_txn_hash?: string | null;
  nft_blob_id?: string | null;
  nft_txn_hash?: string | null;
  research_id: number; // or bigint
};

// Type representing the data needed to create a new IpMetadata
export type IpMetadataCreate = {
  ip_blob_id?: string | null;
  ip_txn_hash?: string | null;
  nft_blob_id?: string | null;
  nft_txn_hash?: string | null;
  research_id: number; // or bigint
};


export type IPCreate = {
  ip_blob_id: string;
  ip_txn_hash: string;
  nft_blob_id: string;
  nft_txn_hash: string;
}

export type Research = {
  id: number;            // bigint in PostgreSQL corresponds to number in TypeScript
  createdAt: string;    // timestamp with time zone corresponds to string
  title: string;        // text corresponds to string
  description: string;  // text corresponds to string
  blob_id: string;       // text corresponds to string
  txn_hash: string;      // text corresponds to string
};

export type ResearchCreate = {
  title: string;        // text corresponds to string
  description: string;  // text corresponds to string
  blob_id: string;       // text corresponds to string
  txn_hash: string;      // text corresponds to string
};

export type CiteToken = {
  id: number; // or bigint
  created_at: Date; // or string if you prefer
  research_id?: number | null;
  author_id?: number | null;
};

export type CiteTokenCreate = {
  research_id?: number | null;
  author_id?: number | null;
};

