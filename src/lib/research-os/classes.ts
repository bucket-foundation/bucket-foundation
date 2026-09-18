/**
 * Creating and joining classes (the Class step). A teacher creates a class
 * and becomes its first member with the teacher role; the class carries
 * a join code. Anyone with the code joins as a learner; staff change roles
 * afterwards through /api/research-os/members. reviewer_email is set to
 * the creator so the review queue and the class grid, which scope by that
 * column, work for a teacher who never appears on the env allowlist.
 */
import { graphService } from "./db";
import type { Role } from "./roles";

export interface ClassSummary {
  id: string;
  name: string;
  role: Role;
  joinCode: string | null;
  createdAt: string;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeJoinCode(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return out;
}

export function normalizeJoinCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function validClassName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return null;
  return name;
}

export type ClassesResult<T> = { ok: true; value: T } | { ok: false; error: "bad_name" | "bad_code" | "not_found" | "write_failed" };

/** Every class the person belongs to, with their role; the join code only for staff. */
export async function listMyClasses(userId: string): Promise<ClassSummary[]> {
  const svc = graphService();
  const { data: members, error } = await svc.from("class_members").select("class_id,role").eq("learner_id", userId);
  if (error || !members || members.length === 0) return [];
  const ids = (members as { class_id: string; role: string }[]).map((m) => m.class_id);
  const { data: classes } = await svc.from("classes").select("id,name,join_code,created_at").in("id", ids);
  const byId = new Map(((classes as { id: string; name: string; join_code: string | null; created_at: string }[]) || []).map((c) => [c.id, c]));
  return (members as { class_id: string; role: string }[])
    .map((m) => {
      const c = byId.get(m.class_id);
      if (!c) return null;
      const role = (m.role || "learner") as Role;
      const staff = role === "teacher" || role === "librarian";
      return { id: c.id, name: c.name, role, joinCode: staff ? c.join_code : null, createdAt: c.created_at };
    })
    .filter((x): x is ClassSummary => x !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createClass(userId: string, email: string | null, rawName: string): Promise<ClassesResult<ClassSummary>> {
  const name = validClassName(rawName);
  if (!name) return { ok: false, error: "bad_name" };
  const svc = graphService();
  for (let attempt = 0; attempt < 4; attempt++) {
    const joinCode = makeJoinCode();
    const { data, error } = await svc
      .from("classes")
      .insert({ name, reviewer_email: (email ?? "").toLowerCase(), join_code: joinCode, created_by: userId })
      .select("id,name,join_code,created_at")
      .single();
    if (error) {
      if (error.code === "23505") continue;
      return { ok: false, error: "write_failed" };
    }
    const row = data as { id: string; name: string; join_code: string; created_at: string };
    const { error: memErr } = await svc.from("class_members").upsert({ class_id: row.id, learner_id: userId, role: "teacher" }, { onConflict: "class_id,learner_id" });
    if (memErr) return { ok: false, error: "write_failed" };
    return { ok: true, value: { id: row.id, name: row.name, role: "teacher", joinCode: row.join_code, createdAt: row.created_at } };
  }
  return { ok: false, error: "write_failed" };
}

export async function joinClass(userId: string, rawCode: string): Promise<ClassesResult<ClassSummary>> {
  const code = normalizeJoinCode(rawCode);
  if (code.length < 6 || code.length > 12) return { ok: false, error: "bad_code" };
  const svc = graphService();
  const { data: cls, error } = await svc.from("classes").select("id,name,join_code,created_at").eq("join_code", code).maybeSingle();
  if (error) return { ok: false, error: "write_failed" };
  if (!cls) return { ok: false, error: "not_found" };
  const row = cls as { id: string; name: string; join_code: string; created_at: string };
  const { data: existing } = await svc.from("class_members").select("role").eq("class_id", row.id).eq("learner_id", userId).maybeSingle();
  if (!existing) {
    const { error: memErr } = await svc.from("class_members").insert({ class_id: row.id, learner_id: userId, role: "learner" });
    if (memErr) return { ok: false, error: "write_failed" };
  }
  const role = ((existing as { role?: string } | null)?.role || "learner") as Role;
  return { ok: true, value: { id: row.id, name: row.name, role, joinCode: role === "teacher" || role === "librarian" ? row.join_code : null, createdAt: row.created_at } };
}
