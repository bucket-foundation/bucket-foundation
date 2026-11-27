export const KID_PARAM = "seat";
export const KID_VALUE = "kid";

export function kidSeatFrom(search: string): boolean {
  return new URLSearchParams(search).get(KID_PARAM) === KID_VALUE;
}

export function kidSeat(): boolean {
  return typeof window !== "undefined" && kidSeatFrom(window.location.search);
}

export function kidSeatHref(code: string): string {
  return `/play/${encodeURIComponent(code)}?${KID_PARAM}=${KID_VALUE}`;
}

export function tabStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
