export function useRouter() {
  return {
    push: (href: string) => {
      if (/^https:\/\//.test(href)) window.open(href, "_blank", "noopener,noreferrer");
    },
    replace: () => {},
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
