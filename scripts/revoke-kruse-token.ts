function main(): void {
  const raw = process.env.BKT_KRUSE_TOKEN_VERSION ?? "1";
  const current = parseInt(raw, 10);
  const next = Number.isFinite(current) && current > 0 ? current + 1 : 2;
  console.error(`Current BKT_KRUSE_TOKEN_VERSION: ${current}`);
  console.error(`Set BKT_KRUSE_TOKEN_VERSION to: ${next}`);
  console.error(`Then redeploy. All prior tokens stop verifying immediately.`);
  process.stdout.write(next + "\n");
}

main();
