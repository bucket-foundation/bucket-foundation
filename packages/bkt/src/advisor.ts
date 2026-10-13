import { parseAdvisorReview, parsePrimeDirections, ReviewFileError } from "../../../src/lib/research-os/advisor-review";
import type { PeopleStore } from "./people";
import type { Route } from "./serve";

export const REVIEW_BODY_BYTES = 16 * 1024 * 1024;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function readFile(req: Request): Promise<{ ok: true; value: unknown } | { ok: false; res: Response }> {
  try {
    return { ok: true, value: await req.json() };
  } catch {
    return { ok: false, res: json({ error: "the file is not valid JSON" }, 400) };
  }
}

export function advisorRoutes(people: PeopleStore, now: () => number = Date.now): Record<string, Route> {
  return {
    "GET /local/advisor": () => json({ review: people.review(), forgotten: people.forgottenCount() }),
    "POST /local/advisor/import": async (req, url) => {
      const body = await readFile(req);
      if (!body.ok) return body.res;
      try {
        const review = parseAdvisorReview(body.value);
        return json(people.importReview(review, now(), url.searchParams.get("force") === "1"));
      } catch (e) {
        if (e instanceof ReviewFileError) return json({ error: e.message }, 400);
        throw e;
      }
    },
    "POST /local/advisor/forget": () => json({ forgotten: people.forget(now()) }),
    "GET /local/prime-directions": () => json({ sets: people.directions() }),
    "POST /local/prime-directions/import": async (req) => {
      const body = await readFile(req);
      if (!body.ok) return body.res;
      try {
        const d = parsePrimeDirections(body.value);
        people.importDirections(d, now());
        return json({ corpus: d.corpus, components: d.components.length });
      } catch (e) {
        if (e instanceof ReviewFileError) return json({ error: e.message }, 400);
        throw e;
      }
    },
  };
}
