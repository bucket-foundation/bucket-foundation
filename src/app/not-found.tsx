import Link from "next/link";
import Shield from "@/components/Shield";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center">
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="text-[color:var(--gold)] flex justify-center mb-8">
          <Shield size={96} />
        </div>
        <div className="small-caps text-[11px] text-[color:var(--gold)] mb-6">§ 404</div>
        <h1 className="font-serif-display text-5xl text-[color:var(--parchment)] mb-6">
          Not in the canon.
        </h1>
        <p className="text-lg text-[color:var(--parchment-dim)] mb-10">
          This path is not in the index yet. It may be an outcome, a draft,
          or simply untravelled ground.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 border border-[color:var(--gold)] text-[color:var(--gold)] hover:bg-[color:var(--gold)] hover:text-[color:var(--ink)] transition small-caps text-[12px]"
          >
            Home
          </Link>
          <Link
            href="/canon"
            className="px-6 py-3 border hairline text-[color:var(--parchment)] hover:border-[color:var(--parchment)] transition small-caps text-[12px]"
          >
            The canon
          </Link>
        </div>
      </div>
    </main>
  );
}
