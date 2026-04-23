// Web3-gated route — skip static prerender (providers aren't mounted without envs).
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
