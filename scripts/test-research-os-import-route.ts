import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { openLaunchScope } from "./lib/test-harness";

openLaunchScope();

/* eslint-disable @typescript-eslint/no-var-requires */
const db = require("@/lib/research-os/db") as Record<string, unknown>;
const consent = require("@/lib/research-os/consent") as Record<string, unknown>;
const upload = require("@/lib/research-os/import-upload") as Record<string, unknown>;
const route = require("../src/app/api/research-os/import/route") as { GET: (req: NextRequest) => Promise<Response> };
/* eslint-enable @typescript-eslint/no-var-requires */

const DRIVER_TEXT = 'relation "graph.import_files" does not exist at db.internal:5432';

db.verifyLearner = async () => "00000000-0000-0000-0000-0000000000c1";
db.graphService = () => ({});
upload.ownedImport = async () => ({ id: "imp-1", nodeId: "node-1", nodeSlug: "import-1" });

const request = () => new NextRequest("http://localhost/api/research-os/import?import=imp-1");

test("a listImportFiles that throws answers 503 with no driver text", async () => {
  consent.requireConsent = async () => ({ allowed: true });
  upload.listImportFiles = async () => {
    throw new Error(DRIVER_TEXT);
  };
  const logged: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void logged.push(args);
  let res: Response;
  try {
    res = await route.GET(request());
  } finally {
    console.error = original;
  }
  assert.equal(res.status, 503);
  const text = await res.text();
  assert.equal(JSON.parse(text).error, "graph_unavailable");
  assert.ok(!text.includes("graph.import_files") && !text.includes("db.internal"), `the body carries driver text: ${text}`);
  assert.ok(JSON.stringify(logged).includes("db.internal"), "the detail reaches the server log");
});

test("an unavailable consent read answers 503 through consentRefusal", async () => {
  consent.requireConsent = async () => ({ allowed: false, reason: "unavailable" });
  const res = await route.GET(request());
  assert.equal(res.status, 503);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, "consent_unavailable");
});
