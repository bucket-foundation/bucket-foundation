import type { NextRequest, NextResponse } from "next/server";
import { configured, fail, json, preflight, readBody, requestUser, service } from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): NextResponse {
  return preflight();
}
import { box, distanceKm, matchesLangs, parseDraft, roundCoord, validLangs, visibleInList, MEETUP_TERMS_VERSION, type MeetupRow } from "@/lib/polingual/meetups";
import { adminIds, blockedFor, countingReports, MEETUP_COLS, present } from "@/lib/polingual/meetups-server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  const q = req.nextUrl.searchParams;
  const lat = roundCoord(q.get("lat"), 90);
  const lon = roundCoord(q.get("lon"), 180);
  const langs = validLangs((q.get("langs") ?? "").split(",").filter(Boolean)) ?? [];
  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + 60 * 86_400_000);
    const base = () => service().from("meetups").select(MEETUP_COLS).is("cancelled_at", null).is("taken_down_at", null)
      .gte("starts_at", new Date(now.getTime() - 8 * 3_600_000).toISOString()).lte("starts_at", horizon.toISOString()).order("starts_at").limit(200);
    const queries = [base().eq("mode", "online")];
    if (lat !== null && lon !== null) {
      const b = box(lat, lon);
      queries.push(base().eq("mode", "in_person").gte("lat", b.minLat).lte("lat", b.maxLat).gte("lon", b.minLon).lte("lon", b.maxLon));
    }
    if (uid) queries.push(base().eq("host_id", uid));
    const results = await Promise.all(queries);
    const seen = new Map<string, MeetupRow>();
    for (const r of results) {
      if (r.error) throw new Error(`meetups list: ${r.error.message}`);
      for (const row of (r.data ?? []) as MeetupRow[]) seen.set(row.id, row);
    }
    const blocked = await blockedFor(uid);
    const reports = await countingReports([...seen.keys()]);
    const rows = [...seen.values()].filter((row) => {
      if (!visibleInList(row, uid, blocked, reports.get(row.id) ?? 0, now.getTime())) return false;
      if (row.host_id === uid) return true;
      if (!matchesLangs(row, langs)) return false;
      if (row.mode === "online") return true;
      return lat !== null && lon !== null && row.lat !== null && row.lon !== null && distanceKm(lat, lon, Number(row.lat), Number(row.lon)) <= 60;
    });
    return json({ meetups: await present(rows, uid), admin: uid !== null && adminIds().has(uid) });
  } catch (err) {
    return fail(err, "meetups list");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!configured()) return json({ error: "sync_unavailable" }, 503);
  const uid = await requestUser(req);
  if (!uid) return json({ error: "unauthorized" }, 401);
  const draft = parseDraft(await readBody(req));
  if (typeof draft === "string") return json({ error: draft }, draft === "content_rejected" ? 422 : 400);
  try {
    const res = await service().rpc("create_meetup", {
      p_host: uid, p_terms: MEETUP_TERMS_VERSION, p_host_name: draft.hostName, p_title: draft.title, p_about: draft.about, p_langs: draft.langs,
      p_starts: draft.startsAt, p_duration: draft.durationMin, p_mode: draft.mode, p_city: draft.city, p_area: draft.area, p_place: draft.placeName,
      p_lat: draft.lat, p_lon: draft.lon, p_url: draft.onlineUrl, p_capacity: draft.capacity,
    });
    if (res.error) {
      const m = res.error.message || "";
      for (const code of ["terms_required", "host_limit", "host_rate", "bad_time"]) if (m.includes(code)) return json({ error: code }, code === "terms_required" ? 403 : 409);
      throw new Error(`create_meetup: ${m}`);
    }
    const row = (Array.isArray(res.data) ? res.data[0] : res.data) as MeetupRow | undefined;
    if (!row) throw new Error("create_meetup: no row");
    const [meetup] = await present([row], uid);
    return json({ meetup });
  } catch (err) {
    return fail(err, "meetups create");
  }
}
