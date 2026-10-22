import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { parseWorkspaceType, WEB_WORKSPACE_TYPES, WORKSPACE_ROOT, WORKSPACE_TABS } from "@/lib/research-os/workspace-tabs";
import { workspaceItems } from "@/lib/research-os/workspace-items";

export function generateStaticParams() {
  return WEB_WORKSPACE_TYPES.filter((t) => t !== "study").map((type) => ({ type }));
}

export default function WorkspaceTypePage({ params }: { params: { type: string } }) {
  const type = parseWorkspaceType(params.type);
  if (!type) notFound();
  if (type === "study") redirect(WORKSPACE_ROOT);
  const tab = WORKSPACE_TABS[type];
  const items = workspaceItems(type);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-[22px] uppercase text-[color:var(--basalt)]">{tab.title}</h1>
      <p className="mt-2 text-[15px] leading-[1.6] text-[color:var(--basalt-2)]">{tab.about}</p>
      {items.length === 0 ? (
        <p className="mt-6 text-[14px] text-[color:var(--basalt-2)]">{tab.empty}</p>
      ) : (
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} data-workspace-item={item.id} className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-4">
              <Link href={item.href} className="font-display text-[15px] uppercase text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4">
                {item.title}
              </Link>
              <p className="mt-2 text-[13px] leading-[1.5] text-[color:var(--basalt-2)]">{item.line}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
