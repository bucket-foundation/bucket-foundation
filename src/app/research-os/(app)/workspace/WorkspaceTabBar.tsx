"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeWorkspaceType, WEB_WORKSPACE_TYPES, WORKSPACE_TABS, workspaceHref } from "@/lib/research-os/workspace-tabs";

export default function WorkspaceTabBar() {
  const active = activeWorkspaceType(usePathname() ?? "");
  return (
    <nav aria-label="Workspaces" className="mx-auto max-w-5xl px-4 pt-6">
      <ul className="flex flex-wrap gap-1 border-b border-[color:var(--hairline)]">
        {WEB_WORKSPACE_TYPES.map((type) => {
          const on = type === active;
          return (
            <li key={type}>
              <Link
                aria-current={on ? "page" : undefined}
                href={workspaceHref(type)}
                className={`inline-block px-3 py-2 text-[12px] small-caps tracking-[0.12em] ${on ? "border-b-2 border-[color:var(--gold)] text-[color:var(--basalt)]" : "text-[color:var(--basalt-2)] hover:text-[color:var(--basalt)]"}`}
              >
                {WORKSPACE_TABS[type].title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
