export type IP = {
  id: number;
  createdAt: string;
  ip_blob_id: string;
  ip_txn_hash: string;
  nft_blob_id: string;
  nft_txn_hash: string;
}

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
  ip_id: string;
};

export type ResearchCreate = {
  title: string;        // text corresponds to string
  description: string;  // text corresponds to string
  blob_id: string;       // text corresponds to string
  txn_hash: string;      // text corresponds to string
  ip_id: string;
};


