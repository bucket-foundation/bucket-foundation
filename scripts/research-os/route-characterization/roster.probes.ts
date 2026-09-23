import { SIGNED_IN, type Probe } from "../route-characterization";

const BOUNDARY = "characterization";
function multipart(fields: Record<string, string>): string {
  return Object.entries(fields).map(([k, v]) => `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`).join("") + `--${BOUNDARY}--\r\n`;
}
const MULTIPART = { "content-type": `multipart/form-data; boundary=${BOUNDARY}` };
const FILES = { orgs: "o", users: "u", classes: "c", enrollments: "e" };
const reviewer = { "@/lib/research-os/reviewer": { verifyReviewer: async () => ({ id: "r1" }) } };
class Source {
  async fetchBundle() {
    return { orgs: [] };
  }
}
const parsed = (extra: Record<string, Record<string, unknown>> = {}) => () => ({
  ...reviewer,
  "@/lib/research-os/roster/sources": { OneRosterCsvSource: Source },
  "@/lib/research-os/roster/diff": { computeRosterDiff: () => ({ adds: 1 }) },
  "@/lib/research-os/roster/apply": { loadRosterExistingState: async () => ({}), applyRosterImport: async () => ({ written: 1 }) },
  ...extra,
});

export const probes: Probe[] = [
  { ...SIGNED_IN, name: "reviewer, json body", body: "{}", stubs: () => reviewer },
  { ...SIGNED_IN, name: "reviewer, missing field", body: multipart({ orgs: "o" }), headers: MULTIPART, stubs: () => reviewer },
  { ...SIGNED_IN, name: "reviewer, preview", body: multipart(FILES), headers: MULTIPART, stubs: parsed() },
  { ...SIGNED_IN, name: "reviewer, apply", body: multipart({ ...FILES, apply: "true" }), headers: MULTIPART, stubs: parsed() },
  {
    ...SIGNED_IN,
    name: "reviewer, state load fails",
    body: multipart(FILES),
    headers: MULTIPART,
    stubs: parsed({
      "@/lib/research-os/roster/apply": {
        loadRosterExistingState: async () => {
          throw new Error("roster store down");
        },
      },
    }),
  },
  {
    ...SIGNED_IN,
    name: "reviewer check throws",
    body: "{}",
    stubs: () => ({
      "@/lib/research-os/reviewer": {
        verifyReviewer: async () => {
          throw new Error("reviewer store down");
        },
      },
    }),
  },
  {
    ...SIGNED_IN,
    name: "reviewer, bundle parse fails",
    body: multipart(FILES),
    headers: MULTIPART,
    stubs: parsed({
      "@/lib/research-os/roster/sources": {
        OneRosterCsvSource: class {
          async fetchBundle(): Promise<never> {
            throw new Error("users.csv row 3: missing sourcedId");
          }
        },
      },
    }),
  },
  {
    ...SIGNED_IN,
    name: "reviewer, apply fails",
    body: multipart({ ...FILES, apply: "true" }),
    headers: MULTIPART,
    stubs: parsed({
      "@/lib/research-os/roster/apply": {
        loadRosterExistingState: async () => ({}),
        applyRosterImport: async () => {
          throw new Error("relation graph.classes violates constraint");
        },
      },
    }),
  },
];
