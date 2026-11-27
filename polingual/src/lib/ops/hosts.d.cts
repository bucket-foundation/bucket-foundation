export function adminHosts(env?: Partial<Record<string, string | undefined>>): string[];
export function adminRewrites(env?: Partial<Record<string, string | undefined>>): { source: string; has: { type: string; value: string }[]; destination: string }[];
