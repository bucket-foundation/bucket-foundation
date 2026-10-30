import test from "node:test";
import assert from "node:assert/strict";
import { box, distanceKm, parseDraft, rejectedContent, roundCoord, toMeetup, validOnlineUrl, visibleInList, type MeetupRow } from "../src/lib/polingual/meetups";

const NOW = Date.parse("2026-11-01T12:00:00Z");

const draft = {
  hostName: "Ana",
  title: "Spanish and French coffee",
  about: "Bring a book.",
  langs: ["es", "fr"],
  startsAt: "2026-11-08T18:00:00Z",
  durationMin: 90,
  mode: "in_person",
  city: "New York",
  area: "West Village",
  placeName: "Café Reggio, 119 MacDougal St",
  lat: 40.73001,
  lon: -74.00049,
  capacity: 12,
};

const row: MeetupRow = {
  id: "m1",
  host_id: "host",
  host_name: "Ana",
  title: "t",
  about: "",
  langs: ["es"],
  starts_at: "2026-11-08T18:00:00Z",
  duration_min: 90,
  mode: "in_person",
  city: "New York",
  area: "West Village",
  place_name: "Café Reggio",
  lat: "40.73",
  lon: "-74.00",
  online_url: null,
  capacity: 2,
  created_at: "2026-11-01T00:00:00Z",
  cancelled_at: null,
  taken_down_at: null,
};

test("a valid in-person draft rounds its pin to about a kilometer", () => {
  const d = parseDraft(draft, NOW);
  assert.ok(typeof d === "object");
  assert.equal(d.lat, 40.73);
  assert.equal(d.lon, -74);
  assert.equal(d.onlineUrl, null);
});

test("drafts reject bad times, languages, links and content", () => {
  assert.equal(parseDraft({ ...draft, startsAt: "2026-11-01T12:10:00Z" }, NOW), "bad_time");
  assert.equal(parseDraft({ ...draft, startsAt: "2027-06-01T12:00:00Z" }, NOW), "bad_time");
  assert.equal(parseDraft({ ...draft, langs: ["es", "xx"] }, NOW), "bad_request");
  assert.equal(parseDraft({ ...draft, mode: "online", onlineUrl: "http://zoom.us/j/1" }, NOW), "bad_request");
  assert.equal(parseDraft({ ...draft, about: "dm me on www.scam.io" }, NOW), "content_rejected");
  assert.equal(parseDraft({ ...draft, title: "fr€€ ＢＩＴＣＯＩＮ giveaway" }, NOW), "content_rejected");
  const online = parseDraft({ ...draft, mode: "online", onlineUrl: "https://meet.jit.si/polyglots", lat: null, lon: null }, NOW);
  assert.ok(typeof online === "object" && online.onlineUrl === "https://meet.jit.si/polyglots");
});

test("the filter folds lookalikes and leaves ordinary words alone", () => {
  assert.ok(rejectedContent("P0RN night"));
  assert.ok(rejectedContent("é s c o r t"));
  assert.ok(!rejectedContent("Sussex conversation club", "Essex", "Polyglot brunch at 11"));
  assert.ok(!rejectedContent("Che casino!", "sin retardo", "le menu des enfants", "Sexta-feira em português", "escorted tour", "Hooke's law"));
  assert.equal(validOnlineUrl("https://meet.google.com/abc-defg-hij"), "https://meet.google.com/abc-defg-hij");
  assert.equal(roundCoord(91, 90), null);
});

test("exact place and link go only to the host and people going, and never once cancelled", () => {
  const stranger = toMeetup(row, "x", { count: 1, viewerGoing: false }, 0);
  assert.equal(stranger.placeName, null);
  assert.equal(stranger.lat, null);
  assert.equal(stranger.area, "West Village");
  const going = toMeetup(row, "x", { count: 1, viewerGoing: true }, 0);
  assert.equal(going.placeName, "Café Reggio");
  assert.equal(going.lat, 40.73);
  const cancelled = toMeetup({ ...row, cancelled_at: "2026-11-02T00:00:00Z" }, "x", { count: 1, viewerGoing: true }, 0);
  assert.equal(cancelled.placeName, null);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(toMeetup(row, "x", { count: 2, viewerGoing: false }, 0).status, "full");
  assert.equal(toMeetup(row, "host", { count: 0, viewerGoing: false }, 3).status, "under_review");
});

test("lists hide blocked hosts, past and reported meetups, except reported ones from their host", () => {
  assert.ok(visibleInList(row, "x", new Set(), 0, NOW));
  assert.ok(!visibleInList(row, "x", new Set(["host"]), 0, NOW));
  assert.ok(!visibleInList(row, "x", new Set(), 3, NOW));
  assert.ok(visibleInList(row, "host", new Set(), 3, NOW));
  assert.ok(!visibleInList(row, "x", new Set(), 0, Date.parse("2026-11-09T00:00:00Z")));
  assert.ok(!visibleInList({ ...row, host_id: null }, "x", new Set(), 0, NOW));
});

test("the search box covers the radius", () => {
  const b = box(40.73, -74, 60);
  assert.ok(distanceKm(40.73, -74, b.maxLat, -74) >= 59);
  assert.ok(distanceKm(40.73, -74, 40.73, b.maxLon) >= 59);
  assert.ok(Math.abs(distanceKm(40.73, -74, 51.5, -0.13) - 5570) < 30);
});
