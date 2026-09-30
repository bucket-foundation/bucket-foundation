export function stageV2Enabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env.STAGE_V2 ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on";
}
