import { windowHref } from "../site-fetch";

function go(href: string) {
  if (/^https:\/\//.test(href)) return void window.open(href, "_blank", "noopener,noreferrer");
  const hash = windowHref(href);
  if (hash) window.location.hash = hash;
}

export function useRouter() {
  return {
    push: go,
    replace: go,
    back: () => window.history.back(),
    prefetch: () => {},
  };
}

export function usePathname() {
  return "/";
}

export function useSearchParams() {
  return new URLSearchParams();
}
