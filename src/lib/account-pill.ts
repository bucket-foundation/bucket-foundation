export type PillItem =
  | { kind: "link"; label: string; href: string }
  | { kind: "sign-in"; label: string }
  | { kind: "sign-out"; label: string };

export const PILL_FROZEN_PREFIXES = ["/research-os/learn", "/sign-in"];

export function pillHidden(pathname: string): boolean {
  return PILL_FROZEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function pillItems(signedIn: boolean): PillItem[] {
  if (!signedIn) return [{ kind: "sign-in", label: "Sign in" }];
  return [
    { kind: "link", label: "Settings", href: "/settings" },
    { kind: "link", label: "Profile", href: "/account" },
    { kind: "sign-out", label: "Sign out" },
  ];
}

export function avatarInitial(email: string | null | undefined): string {
  const c = email?.trim().charAt(0) ?? "";
  return /[a-z0-9]/i.test(c) ? c.toUpperCase() : "";
}

export function nextIndex(current: number, key: string, count: number): number {
  if (count === 0) return -1;
  if (key === "ArrowDown") return (current + 1 + count) % count;
  if (key === "ArrowUp") return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return current;
}
