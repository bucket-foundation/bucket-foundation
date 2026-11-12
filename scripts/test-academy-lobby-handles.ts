import test from "node:test";
import assert from "node:assert/strict";
import * as server from "../src/lib/academy/groups-server";
import { namedPlayersOf } from "../src/lib/academy/lobbies-server";

type Reply = { data: unknown; error: { message: string } | null };
const mutable = server as unknown as Record<string, unknown>;

function stub(replies: Record<string, Reply>): { table: string; ids: unknown[] }[] {
  const calls: { table: string; ids: unknown[] }[] = [];
  mutable.service = () => ({
    from: (table: string) => ({
      select: () => ({
        in: async (_col: string, ids: unknown[]) => {
          calls.push({ table, ids });
          return replies[table];
        },
      }),
    }),
  });
  return calls;
}

const row = (user_id: string) => ({ lobby_id: "L1", user_id, display_name: user_id, ready: false, score: 0, last_seen: "t", joined_at: "t" });

test("lobby players carry the handle from their profile", async () => {
  const calls = stub({
    lobby_players: { data: [row("u1"), row("u2"), row("u1")], error: null },
    academy_profiles: { data: [{ user_id: "u1", handle: "hana_k" }], error: null },
  });
  const out = await namedPlayersOf(["L1"]);
  assert.deepEqual(out.map((p) => [p.user_id, p.handle]), [["u1", "hana_k"], ["u2", null], ["u1", "hana_k"]]);
  assert.deepEqual(calls[1], { table: "academy_profiles", ids: ["u1", "u2"] });
});

test("a failed handle lookup keeps the lobby working without handles", async () => {
  const errors: unknown[] = [];
  const prior = console.error;
  console.error = (...a: unknown[]) => errors.push(a);
  try {
    stub({ lobby_players: { data: [row("u1")], error: null }, academy_profiles: { data: null, error: { message: "boom" } } });
    const out = await namedPlayersOf(["L1"]);
    assert.deepEqual(out.map((p) => p.handle), [null]);
    assert.equal(errors.length, 1);
  } finally {
    console.error = prior;
  }
});
