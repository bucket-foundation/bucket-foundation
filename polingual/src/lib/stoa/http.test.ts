import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { csvReply } from "./http";

test("csvReply sends a CSV attachment with a safe filename and CORS for our origins", async () => {
  const req = new NextRequest("https://polingual.com/api/live/rooms/x/summary", { headers: { origin: "https://bucket.foundation" } });
  const res = csvReply(req, 'stoa-QZ7K2M-results.csv"; evil="1', "rank,nickname,points,correct\r\n");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "text/csv; charset=utf-8");
  assert.equal(res.headers.get("content-disposition"), 'attachment; filename="stoa-QZ7K2M-results.csvevil1"');
  assert.equal(res.headers.get("access-control-allow-origin"), "https://bucket.foundation");
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(await res.text(), "rank,nickname,points,correct\r\n");
  const other = csvReply(new NextRequest("https://polingual.com/x", { headers: { origin: "https://evil.test" } }), "a.csv", "");
  assert.equal(other.headers.get("access-control-allow-origin"), null);
});
