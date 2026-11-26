"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FOUNDER_EMAIL, sendFounderCode, verifyFounderCode } from "@/lib/ops/gate";
import { decidePost, editCaption } from "@/lib/ops/ops";
import { sendPost } from "@/lib/ops/send";
import { postgrestOps } from "@/lib/ops/store";
import { assertAdminHost, clearSession, currentAdmin, setSession } from "./session";

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "");
}

function back(params: Record<string, string>): never {
  redirect(`/?${new URLSearchParams(params).toString()}`);
}

async function source() {
  const admin = await currentAdmin();
  if (!admin) redirect("/sign-in");
  const src = postgrestOps(process.env, fetch);
  if (!src) back({ result: "store_unavailable" });
  return { admin, src };
}

async function decide(form: FormData, decision: "approve" | "skip"): Promise<void> {
  const { admin, src } = await source();
  const caption = decision === "approve" && form.has("caption") ? field(form, "caption") : null;
  const r = await decidePost(src.writer, admin, field(form, "postId"), decision, caption);
  revalidatePath("/ops");
  back({ result: r.ok ? `${decision}_ok` : r.error });
}

export async function approvePost(form: FormData): Promise<void> {
  await decide(form, "approve");
}

export async function skipPost(form: FormData): Promise<void> {
  await decide(form, "skip");
}

export async function saveCaption(form: FormData): Promise<void> {
  const { admin, src } = await source();
  const r = await editCaption(src.writer, admin, field(form, "postId"), field(form, "caption"));
  revalidatePath("/ops");
  back({ result: r.ok ? "caption_ok" : r.error });
}

export async function sendToPlatform(form: FormData): Promise<void> {
  const { admin, src } = await source();
  const platform = field(form, "platform");
  const r = await sendPost(src.writer, admin, field(form, "postId"), platform, process.env, fetch);
  revalidatePath("/ops");
  if (r.ok) back({ result: `${platform}_sent`, detail: r.id ?? "" });
  back({ result: r.error, detail: r.missing?.length ? `Set ${r.missing.join(", ")}` : (r.detail ?? "") });
}

export async function requestCode(form: FormData): Promise<void> {
  await assertAdminHost();
  const email = field(form, "email").trim().toLowerCase();
  const r = await sendFounderCode(email, process.env, fetch);
  redirect(`/sign-in?${new URLSearchParams(r.ok ? { sent: "1", email } : { error: r.error }).toString()}`);
}

export async function verifyCode(form: FormData): Promise<void> {
  await assertAdminHost();
  const r = await verifyFounderCode(field(form, "email").trim().toLowerCase() || FOUNDER_EMAIL, field(form, "code"), process.env, fetch);
  if (!r.ok || !r.tokens) redirect(`/sign-in?${new URLSearchParams({ sent: "1", error: r.ok ? "no_session" : r.error }).toString()}`);
  await setSession(r.tokens);
  redirect("/");
}

export async function signOut(): Promise<void> {
  await assertAdminHost();
  await clearSession();
  redirect("/sign-in");
}
