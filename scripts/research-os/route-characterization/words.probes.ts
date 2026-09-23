import { SIGNED_IN, type Probe } from "../route-characterization";

const ID = "?id=00000000-0000-0000-0000-00000000a001";
const readable = { "@/lib/research-os/read-access": { authorizeNode: async () => ({ ok: true, node: { id: "n", visibility: "public", ownerId: null } }) } };

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "id given, store down", query: ID },
  { ...SIGNED_IN, name: "bad id", query: "?id=nope" },
  { ...SIGNED_IN, name: "id given, hidden", query: ID, stubs: () => ({ "@/lib/research-os/read-access": { authorizeNode: async () => ({ ok: false, reason: "denied" }) } }) },
  {
    ...SIGNED_IN,
    name: "id given, words listed",
    query: ID,
    stubs: () => ({ ...readable, "@/lib/research-os/node-words-db": { loadNodeWords: async () => [{ lang: "en", word: "force" }] } }),
  },
  {
    ...SIGNED_IN,
    name: "id given, words read throws",
    query: ID,
    stubs: () => ({
      ...readable,
      "@/lib/research-os/node-words-db": {
        loadNodeWords: async () => {
          throw new Error("words store down");
        },
      },
    }),
  },
  {
    ...SIGNED_IN,
    name: "id given, authorize throws",
    query: ID,
    stubs: () => ({
      "@/lib/research-os/read-access": {
        authorizeNode: async () => {
          throw new Error("access store down");
        },
      },
    }),
  },
];
