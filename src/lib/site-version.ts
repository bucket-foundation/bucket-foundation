export function siteVersion(tag: string | null | undefined, packageVersion: string): string {
  const fromTag = tag?.replace(/^bkt-v/, "");
  return `v${fromTag || packageVersion}`;
}
