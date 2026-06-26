/**
 * bucket.foundation — POST /api/academy/credential/issue  (bkt-52p)
 * ----------------------------------------------------------------------------
 * The authenticated learner issues a verifiable credential for THEIR OWN proven
 * canon concepts. Same auth + service-role discipline as the progress/profile
 * routes: identity comes ONLY from the verified Supabase access token; a caller
 * can never issue for someone else.
 *
 * Flow:
 *   1. verify token -> uid,
 *   2. load the user's claimed profile (must have a handle),
 *   3. assemble the honest PublicProfile from their progress rows,
 *   4. select concepts that clear the issuance bar (depth>=Derive, mastered,
 *      >=MIN_REPS spaced re-demonstrations),  [HARD GATE bkt-4at: no score]
 *   5. build an OB3 OpenBadgeCredential, sign it as VC-JWT (EdDSA),
 *   6. persist it (bucket.academy_credentials) as a stable point-in-time artifact,
 *   7. return { id, url, jwt, credential }.
 *
 * Degrades to 503 when sync or the issuer key is unconfigured (UI hides).
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  assemblePublicProfile,
  type ProgressRow,
} from "@/lib/academy/profile";
import { buildCredential, selectEligible } from "@/lib/academy/credential/build";
import { signCredential } from "@/lib/academy/credential/sign";
import { canIssue } from "@/lib/academy/credential/issuer";
import {
  dbConfigured,
  service,
  verifyUserToken,
  insertCredential,
} from "@/lib/academy/credential/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "cache-control": "no-store",
};

function json(body: unknown, status = 200): NextResponse {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function bearer(req: NextRequest): string | null {
  const m = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Profiles client (same private bucket schema). */
function profilesSvc(): SupabaseClient {
  return createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    db: { schema: "bucket" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!dbConfigured()) return json({ error: "sync_unavailable" }, 503);
  if (!canIssue()) return json({ error: "issuer_unavailable" }, 503);

  const uid = await verifyUserToken(bearer(req));
  if (!uid) return json({ error: "unauthorized" }, 401);

  // The learner must have a claimed handle (their public profile URL/subject).
  const { data: prof, error: profErr } = await profilesSvc()
    .from("academy_profiles")
    .select("user_id,handle,display_name,is_public")
    .eq("user_id", uid)
    .maybeSingle();
  if (profErr) return json({ error: "read_failed" }, 500);
  if (!prof) {
    return json(
      {
        error: "no_handle",
        message:
          "Claim a public handle for your Mastery Profile before issuing a credential.",
      },
      400
    );
  }
  const rec = prof as unknown as {
    handle: string;
    display_name: string | null;
    is_public: boolean;
  };

  // Assemble the honest profile from the user's own progress rows.
  const { data: rows, error: rowsErr } = await service()
    .from("academy_progress")
    .select("branch,data,updated_at")
    .eq("user_id", uid);
  if (rowsErr) return json({ error: "read_failed" }, 500);

  const profile = assemblePublicProfile(
    rec.handle,
    rec.display_name,
    (rows as unknown as ProgressRow[]) || []
  );

  const eligible = selectEligible(profile);
  if (eligible.length === 0) {
    return json(
      {
        error: "nothing_to_credential",
        message:
          "No concepts yet clear the credential bar (demonstrated to Derive or " +
          "Teach-back, mastered, with a spaced re-demonstration trail). Keep " +
          "building — the bar is high on purpose so the credential means something.",
      },
      422
    );
  }

  const credentialId = randomUUID();
  const issuedAt = new Date();
  const credential = buildCredential({
    credentialId,
    handle: rec.handle,
    displayName: rec.display_name,
    profile,
    eligible,
    issuedAt,
  });

  let jwt: string;
  try {
    jwt = await signCredential(credential);
  } catch {
    return json({ error: "signing_failed" }, 500);
  }

  const ok = await insertCredential({
    id: credentialId,
    user_id: uid,
    handle: rec.handle,
    jwt,
    credential,
    issued_at: issuedAt.toISOString(),
  });
  if (!ok) return json({ error: "persist_failed" }, 500);

  return json({
    ok: true,
    id: credentialId,
    url: credential.id,
    jwt,
    credential,
    achievements: eligible.length,
  });
}
