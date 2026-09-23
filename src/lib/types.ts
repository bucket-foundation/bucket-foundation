export type IP = {
  id: number;
  createdAt: string;
  ip_blob_id: string;
  ip_txn_hash: string;
  nft_blob_id: string;
  nft_txn_hash: string;
}

export type Author = {
  id: number;
  created_at: Date;
  wallet_address?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};


export type AuthorCreate = {
  wallet_address?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export type IpMetadataType = {
  id: number;
  created_at: Date;
  ip_blob_id?: string | null;
  ip_txn_hash?: string | null;
  nft_blob_id?: string | null;
  nft_txn_hash?: string | null;
  research_id: number;
};

export type IpMetadataCreate = {
  ip_blob_id?: string | null;
  ip_txn_hash?: string | null;
  nft_blob_id?: string | null;
  nft_txn_hash?: string | null;
  research_id: number;
};


export type IPCreate = {
  ip_blob_id: string;
  ip_txn_hash: string;
  nft_blob_id: string;
  nft_txn_hash: string;
}

export type Research = {
  id: number;
  createdAt: string;
  title: string;
  description: string;
  blob_id: string;
  txn_hash: string;
  ip_id: string;
  author_id: number;
};

export type ResearchCreate = {
  title: string;
  description: string;
  blob_id: string;
  txn_hash: string;
  ip_id: string;
  author_id: number;
};

export type CiteToken = {
  id: number;
  created_at: Date;
  research_id?: number | null;
  author_id?: number | null;
  txn_hash?: string | null
};

export type CiteTokenCreate = {
  research_id?: number | null;
  author_id?: number | null;
  txn_hash?: string | null
};

