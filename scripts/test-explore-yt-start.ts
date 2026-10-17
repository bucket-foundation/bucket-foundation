import assert from "node:assert/strict";
import { clock, cueSeconds, matchStart, startFromUrl, words, type Cue } from "../src/lib/explore/yt-start";
import { sourceToHit } from "../src/lib/explore/source-index";
import { unify } from "../src/lib/explore/search";

const cues: Cue[] = [
  { start: "00:00:00.320", text: "welcome back to the show today" },
  { start: "00:01:05.000", text: "we talk about light and water" },
  { start: "01:35:31.840", text: "operator to get the Einstein tensor capital&nbsp; G mu nu from the Riemann tensor. That thing,&nbsp;&nbsp;" },
  { start: "01:35:39.280", text: "there's two branches, right? There's a branch that&nbsp; uses the star operator" },
  { start: "01:40:00.000", text: "and the mitochondria use light to make water" },
];

assert.equal(cueSeconds("01:35:31.840"), 5731.84);
assert.equal(cueSeconds("02:03"), 123);
assert.ok(Number.isNaN(cueSeconds("x:y")));
assert.deepEqual(words("It's G&nbsp;mu, NU!"), ["its", "g", "mu", "nu"]);

assert.equal(matchStart("operator to get the Einstein tensor capital G mu nu from the Riemann tensor. That thing, there's two branches", cues), 5731);
assert.equal(matchStart("There's a branch that uses the star operator", cues), 5739);
assert.equal(matchStart("the mitochondria use light to make water", cues), 6000);
assert.equal(matchStart("quantum chromodynamics lattice gauge theory confinement", cues), null);
assert.equal(matchStart("too short", cues), null);
assert.equal(matchStart("operator to get the Einstein tensor", []), null);

const rolling: Cue[] = [
  { start: "00:00:10.000", text: "the sun drives" },
  { start: "00:00:12.000", text: "the sun drives the water cycle in cells" },
  { start: "00:00:15.000", text: "in cells every day" },
];
assert.equal(matchStart("the sun drives the water cycle in cells every day", rolling), 12);

assert.equal(startFromUrl("https://www.youtube.com/watch?v=zrdRVDk66JE&t=3944"), 3944);
assert.equal(startFromUrl("https://www.youtube.com/watch?v=zrdRVDk66JE"), null);

const yHit = sourceToHit({ kind: "y", id: "abcdefghijk", title: "Talk", year: 2020, snippet: "", by: "", score: 1 });
assert.deepEqual(yHit.yt, { id: "abcdefghijk", start: 0 });
assert.equal(sourceToHit({ kind: "p", id: "1", title: "Paper", year: 2020, snippet: "", by: "", score: 1 }).yt, undefined);

const hits = unify({
  query: "light",
  excerpts: [
    { branch: "05-biophysics", concept: "light", slug: "a", title: "A", text: "light water", score: 3, talk: { id: "zrdRVDk66JE", title: "Pod", start: 42 } },
    { branch: "05-biophysics", concept: "light", slug: "b", title: "B", text: "light cells", score: 2, talk: { id: "zrdRVDk66JE", title: "Pod", start: 90 } },
    { branch: "05-biophysics", concept: "light", slug: "c", title: "C", text: "light text", score: 1, talk: null },
  ],
  advisors: [],
});
const talkHit = hits.find((h) => h.title === "Pod")!;
assert.deepEqual(talkHit.yt, { id: "zrdRVDk66JE", start: 42 });
assert.deepEqual(talkHit.fragments?.map((f) => f.start), [42, 90]);
assert.equal(hits.find((h) => h.title === "C")!.yt, undefined);

assert.equal(clock(0), "0:00");
assert.equal(clock(65), "1:05");
assert.equal(clock(5731), "1:35:31");

console.log("explore yt start: ok");
