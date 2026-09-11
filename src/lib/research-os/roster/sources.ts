/**
 * Research OS for K-12, roster sync (bkt-ros, ros-06 follow-on). Vendor
 * adapters behind the RosterSource interface (types.ts). OneRosterCsvSource
 * is the only one this bead implements; Clever and ClassLink are stubs
 * that throw until a district partner exists, per PLAN-REVISION-1.md
 * section 3 item 8's own gating note ("Building against a live roster
 * provider is Phase 1+ work, gated on a district partner this repo does
 * not have yet", supabase/migrations/20260910030000_research_os_classes.sql).
 * Both are OneRoster-shaped once connected (_intake/research-os-k12/03-
 * data-services.md section E: "Build to OneRoster once"), so the real
 * implementation, when it lands, is expected to normalize into the same
 * RosterBundle this file's OneRosterCsvSource already produces and feed
 * the same computeRosterDiff -- no new diff logic per vendor.
 */
import { parseOneRosterBundle, type OneRosterCsvFiles } from "./oneroster";
import type { RosterBundle, RosterSource } from "./types";

export class OneRosterCsvSource implements RosterSource {
  readonly sourceSystem = "oneroster-csv";
  private readonly files: OneRosterCsvFiles;

  constructor(files: OneRosterCsvFiles) {
    this.files = files;
  }

  async fetchBundle(): Promise<RosterBundle> {
    return parseOneRosterBundle(this.files);
  }
}

/**
 * TODO(Phase 1+, district partner): implement against Clever's Secure
 * Sync / Data Sharing API (dev.clever.com), OAuth per
 * _intake/research-os-k12/03-data-services.md section E's own row for
 * Clever. Env contract this stub documents so the shape is decided ahead
 * of the integration itself:
 *   CLEVER_CLIENT_ID, CLEVER_CLIENT_SECRET, CLEVER_DISTRICT_TOKEN
 * fetchBundle() would call Clever's REST API and normalize its
 * sections/students/teachers response shape into the same RosterBundle
 * OneRosterCsvSource already returns, so computeRosterDiff (diff.ts)
 * needs no vendor-specific branch.
 */
export class CleverSource implements RosterSource {
  readonly sourceSystem = "clever";

  async fetchBundle(): Promise<RosterBundle> {
    throw new Error("CleverSource: not configured. See this file's own header for the CLEVER_* env contract; no district partner is connected yet.");
  }
}

/**
 * TODO(Phase 1+, district partner): implement against ClassLink's
 * OneRoster-based Roster Server (_intake/research-os-k12/03-data-
 * services.md section E), which speaks the OneRoster REST API directly --
 * closer to a network-fetched version of OneRosterCsvSource's own input
 * than a one-off shape. Env contract:
 *   CLASSLINK_APP_ID, CLASSLINK_APP_SECRET, CLASSLINK_TENANT_ID
 * fetchBundle() would page through ClassLink's OneRoster REST endpoints
 * and build the same RosterBundle shape this file's other two sources
 * produce.
 */
export class ClassLinkSource implements RosterSource {
  readonly sourceSystem = "classlink";

  async fetchBundle(): Promise<RosterBundle> {
    throw new Error("ClassLinkSource: not configured. See this file's own header for the CLASSLINK_* env contract; no district partner is connected yet.");
  }
}
