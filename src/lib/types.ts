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


