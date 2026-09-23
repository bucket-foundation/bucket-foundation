import { NextRequest } from "next/server";

process.env.BUCKET_GATEWAY_URL = "http://127.0.0.1:1";
process.env.BUCKET_DAILY_USD_CAP = "1.00";

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
const { GET } = require("../src/app/api/research/route");
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

function mkReq(qs: string): NextRequest {
  return new NextRequest(`http://localhost/api/research${qs}`);
}

async function expectStatus(res: Response, want: number, label: string) {
  if (res.status !== want) {
    const body = await res.text();
    throw new Error(
      `[FAIL] ${label}: expected status ${want}, got ${res.status}. Body: ${body}`,
    );
  }
  console.log(`[ok]   ${label} -> ${res.status}`);
}

function expectHeader(res: Response, name: string, label: string) {
  const v = res.headers.get(name);
  if (!v) throw new Error(`[FAIL] ${label}: missing header ${name}`);
  console.log(`[ok]   ${label} -> ${name}: ${v}`);
}

async function main() {
  {
    const res = await GET(mkReq(""));
    await expectStatus(res, 400, "missing q returns 400");
    expectHeader(res, "access-control-allow-origin", "CORS on 400");
    expectHeader(res, "x-bucket-proxy", "x-bucket-proxy on 400");
    const body = await res.json();
    if (body?.error?.code !== "bad_request") {
      throw new Error(`[FAIL] expected error.code=bad_request, got ${JSON.stringify(body)}`);
    }
  }

  {
    const res = await GET(mkReq("?q=test&tier=invalid"));
    await expectStatus(res, 400, "unknown tier returns 400");
    const body = await res.json();
    if (body?.error?.code !== "bad_request") {
      throw new Error(`[FAIL] expected error.code=bad_request, got ${JSON.stringify(body)}`);
    }
  }

  {
    const res = await GET(mkReq("?q=mitochondria"));
    await expectStatus(res, 502, "upstream unavailable returns 502 stub");
    expectHeader(res, "access-control-allow-origin", "CORS on 502");
    const body = await res.json();
    if (body?.receipt?.status !== "upstream_unavailable") {
      throw new Error(
        `[FAIL] expected receipt.status=upstream_unavailable, got ${JSON.stringify(body)}`,
      );
    }
    if (body?.data !== null) {
      throw new Error(`[FAIL] expected data=null on stub, got ${JSON.stringify(body?.data)}`);
    }
  }

  console.log("\nAll route.test.ts smoke checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
