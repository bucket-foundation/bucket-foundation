// Web3-gated route: Dynamic wallet + Story providers mount here only, and
// the route skips static prerender (the providers need runtime env).
import Web3Providers from "@/providers/Web3Providers";
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Web3Providers>{children}</Web3Providers>;
}
