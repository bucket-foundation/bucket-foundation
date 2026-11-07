import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { TeamStandings, TeamTag } from "../../app/(site)/live/parts";
import { team, TEAMS } from "./client";
import { createRoom, parseMode, type LiveDeps } from "./live";

test("teams take the pigment names in order", () => {
  assert.deepEqual(TEAMS.map((t) => `${t.slot}-${t.name}-${t.pigment}`), ["0-Lapis-lapis", "1-Vermilion-vermilion", "2-Malachite-malachite", "3-Ochre-ochre"]);
  assert.equal(team(2)?.name, "Malachite");
  assert.equal(team(null), null);
  assert.equal(team(7), null);
});

test("a room is Open Floor unless the host picks Chorus with 2 to 4 teams", () => {
  assert.deepEqual(parseMode({}), { mode: "open_floor" });
  assert.deepEqual(parseMode({ mode: "chorus" }), { mode: "chorus", teams: 2 });
  assert.deepEqual(parseMode({ mode: "chorus", teams: 4 }), { mode: "chorus", teams: 4 });
  assert.equal(parseMode({ mode: "chorus", teams: 5 }), null);
  assert.equal(parseMode({ mode: "chorus", teams: 2.5 }), null);
  assert.equal(parseMode({ mode: "duel" }), null);
});

test("createRoom sends the mode and team count to the database", async () => {
  const env = { STOA_ROOM_SECRET: randomBytes(48).toString("base64"), POLINGUAL_DB_URL: "https://db.test", POLINGUAL_DB_SERVICE_KEY: "s", POLINGUAL_DB_ANON_KEY: "a" };
  const seen: Record<string, unknown>[] = [];
  const deps: LiveDeps = {
    env,
    rpc: async (_fn, args) => {
      seen.push(args.p_settings as Record<string, unknown>);
      return { data: { room_id: args.p_id, code: args.p_code, topic: randomUUID(), expires_at: Date.now() + 3_600_000, verify_key: "k" } };
    },
    send: async () => Response.json({ id: randomUUID() }),
    build: () => [{ idx: 0, round: 1, kind: "pick_word", prompt: {}, options: ["a", "b", "c", "d"], answer: 0 }],
  };
  assert.equal((await createRoom("Bearer s", { settings: { targets: ["es"] }, mode: "chorus", teams: 3 }, deps)).status, 200);
  assert.equal(seen[0].mode, "chorus");
  assert.equal(seen[0].teams, 3);
  assert.equal((await createRoom("Bearer s", { settings: { targets: ["es"] }, mode: "chorus", teams: 9 }, deps)).status, 400);
  assert.equal((await createRoom("Bearer s", { settings: { targets: ["es"] } }, deps)).status, 200);
  assert.equal(seen[1].mode, "open_floor");
  assert.equal("teams" in seen[1], false);
});

test("the team board names each team, its size and its unison count", () => {
  const html = renderToStaticMarkup(
    <TeamStandings rows={[{ team: 1, points: 1750, unisons: 2, members: 4 }, { team: 0, points: 1400, unisons: 0, members: 1 }]} mine={0} />,
  );
  assert.match(html, /Team Vermilion.*4 players, 2 in unison.*1750.*Team Lapis.*1 player<.*1400/);
  assert.match(html, /data-me="true" data-pigment="lapis"/);
  assert.equal(renderToStaticMarkup(<TeamTag slot={null} />), "");
  assert.match(renderToStaticMarkup(<TeamTag slot={3} />), /Team Ochre/);
});
