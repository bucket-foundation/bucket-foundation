import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fetchFollowingChecked, fetchTextFromUrl, isPublicHttpUrl, MAX_REDIRECTS } from "../src/lib/research-os/import-fetch";

function serve(routes: Record<string, (res: http.ServerResponse) => void>): Promise<{ port: number; close: () => Promise<void>; hits: string[] }> {
  const hits: string[] = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url || "");
    const route = routes[req.url || ""];
    if (!route) {
      res.writeHead(404).end();
      return;
    }
    route(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      resolve({ port, hits, close: () => new Promise((done) => server.close(() => done())) });
    });
  });
}

test("the guard refuses the addresses a redirect would aim at", () => {
  for (const url of [
    "http://169.254.169.254/latest/meta-data/",
    "http://127.0.0.1:54322/",
    "http://10.0.0.1/",
    "http://192.168.1.1/",
    "http://172.16.0.1/",
    "http://localhost:3000/",
    "http://db.internal/",
    "file:///etc/passwd",
  ]) {
    assert.equal(isPublicHttpUrl(url), false, `${url} is refused`);
  }
  assert.equal(isPublicHttpUrl("https://example.com/paper"), true);
});

test("a redirect to a refused address is not followed", async () => {
  const target = await serve({
    "/secret": (res) => {
      res.writeHead(200, { "content-type": "text/plain" }).end("metadata the learner must not see");
    },
  });
  const hop = await serve({
    "/paper": (res) => {
      res.writeHead(302, { location: `http://127.0.0.1:${target.port}/secret` }).end();
    },
  });
  const allow = (url: string) => url.includes(`:${hop.port}/`);
  try {
    const got = await fetchFollowingChecked(`http://127.0.0.1:${hop.port}/paper`, {}, allow);
    assert.equal(got, null, "nothing comes back");
    assert.deepEqual(hop.hits, ["/paper"], "the allowed hop was fetched");
    assert.deepEqual(target.hits, [], "and the refused address was never asked for");
  } finally {
    await hop.close();
    await target.close();
  }
});

test("a redirect to an allowed address is followed", async () => {
  const target = await serve({
    "/paper.txt": (res) => {
      res.writeHead(200, { "content-type": "text/plain" }).end("the paper itself");
    },
  });
  const hop = await serve({
    "/go": (res) => {
      res.writeHead(302, { location: `http://127.0.0.1:${target.port}/paper.txt` }).end();
    },
  });
  try {
    const res = await fetchFollowingChecked(`http://127.0.0.1:${hop.port}/go`, {}, () => true);
    assert.ok(res, "a response comes back");
    assert.equal(res!.status, 200, "and it is the target's");
    assert.equal(await res!.text(), "the paper itself");
  } finally {
    await hop.close();
    await target.close();
  }
});

test("a relative redirect resolves against the hop that sent it", async () => {
  const hop = await serve({
    "/a/b": (res) => {
      res.writeHead(302, { location: "../c" }).end();
    },
    "/c": (res) => {
      res.writeHead(200, { "content-type": "text/plain" }).end("landed");
    },
  });
  const seen: string[] = [];
  try {
    const res = await fetchFollowingChecked(`http://127.0.0.1:${hop.port}/a/b`, {}, (u) => (seen.push(u), true));
    assert.equal(await res!.text(), "landed");
    assert.equal(seen[1], `http://127.0.0.1:${hop.port}/c`, `the relative hop was resolved and checked: ${seen.join(" -> ")}`);
  } finally {
    await hop.close();
  }
});

test("the chain is bounded", () => {
  assert.ok(MAX_REDIRECTS >= 1 && MAX_REDIRECTS <= 10, `a sane bound, found ${MAX_REDIRECTS}`);
});

test("a loop of redirects ends rather than spinning", async () => {
  const s = await serve({
    "/a": (res) => {
      res.writeHead(302, { location: "/a" }).end();
    },
  });
  try {
    const got = await fetchTextFromUrl(`http://127.0.0.1:${s.port}/a`);
    assert.equal(got, null);
    assert.ok(s.hits.length <= MAX_REDIRECTS + 1, `at most ${MAX_REDIRECTS + 1} requests, made ${s.hits.length}`);
  } finally {
    await s.close();
  }
});
