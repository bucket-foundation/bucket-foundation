"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSession } from "@/providers/SessionProvider";
import { useAccountGate } from "@/components/auth/AccountGate";
import { avatarInitial, nextIndex, pillItems } from "@/lib/account-pill";

const ITEM =
  "w-full text-left flex items-center min-h-[44px] px-4 text-[14px] text-[color:var(--basalt)] hover:bg-[color:var(--hairline)] focus:bg-[color:var(--hairline)] focus:outline-none";

export interface PillStatus {
  badge?: ReactNode;
  row?: ReactNode;
}

export default function AccountPill({ status }: { status?: PillStatus }) {
  const { user, loading } = useSession();
  const { openSignIn } = useAccountGate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const menuId = useId();
  const items = pillItems(Boolean(user));
  const initial = avatarInitial(user?.email);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    }
    if (e.key === "Tab") {
      close(false);
      return;
    }
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const next = nextIndex(current, e.key, items.length);
    if (next !== current) {
      e.preventDefault();
      itemRefs.current[next]?.focus();
    }
  };

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div ref={rootRef} className="relative" data-account-pill>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={user ? `Account menu for ${user.email ?? "your account"}` : "Account menu"}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKey}
        className={
          "relative inline-flex items-center gap-2 h-11 pl-3 pr-1.5 rounded-full border border-[color:var(--hairline)] bg-[color:var(--bone)] text-[color:var(--basalt)] shadow-[0_1px_2px_rgba(31,28,22,0.12)] hover:shadow-[0_2px_6px_rgba(31,28,22,0.2)] transition" +
          (loading ? " opacity-70" : "")
        }
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M2 4h12M2 8h12M2 12h12" />
        </svg>
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[color:var(--basalt-3)] text-[color:var(--bone)] font-display text-[13px] font-bold"
        >
          {initial || (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="8.5" r="4" />
              <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
            </svg>
          )}
        </span>
        {status?.badge && (
          <span data-pill-badge className="absolute -top-1 -right-1">
            {status.badge}
          </span>
        )}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKey}
          className="absolute right-0 mt-2 min-w-[200px] py-2 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--bone)] shadow-[0_8px_24px_rgba(31,28,22,0.18)] z-50"
        >
          {user?.email && (
            <div className="px-4 pb-2 mb-1 border-b border-[color:var(--hairline)] text-[12px] text-[color:var(--basalt-3)] truncate">{user.email}</div>
          )}
          {status?.row && (
            <div data-pill-status className="px-4 pb-2 mb-1 border-b border-[color:var(--hairline)] text-[13px] text-[color:var(--basalt-2)]">
              {status.row}
            </div>
          )}
          {items.map((item, i) => {
            const ref = (el: HTMLElement | null) => {
              itemRefs.current[i] = el;
            };
            if (item.kind === "link") {
              return (
                <Link key={item.label} ref={ref} href={item.href} role="menuitem" tabIndex={-1} className={ITEM} onClick={() => close(false)}>
                  {item.label}
                </Link>
              );
            }
            if (item.kind === "sign-in") {
              return (
                <button
                  key={item.label}
                  ref={ref}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  data-header-sign-in
                  className={ITEM + " font-semibold"}
                  onClick={() => {
                    close(false);
                    openSignIn();
                  }}
                >
                  {item.label}
                </button>
              );
            }
            return (
              <form key={item.label} method="post" action="/auth/sign-out">
                <button ref={ref} type="submit" role="menuitem" tabIndex={-1} className={ITEM}>
                  {item.label}
                </button>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}
