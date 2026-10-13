import { useEffect, useRef, type DragEvent, type KeyboardEvent } from "react";
import { activateTab, closeTab, moveTab, type Tab, type Tabs } from "../tabs";

export const TAB_KEYS_HINT = "Arrow keys switch tabs. Shift with an arrow key moves a tab. Delete closes it.";

export function TabBar<T extends Tab>({ label, home, state, onChange }: { label: string; home: string; state: Tabs<T>; onChange: (next: Tabs<T>) => void }) {
  const bar = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  const dragged = useRef<string | null>(null);

  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    bar.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
  });

  const go = (next: Tabs<T>) => {
    refocus.current = true;
    onChange(next);
  };

  const onKey = (e: KeyboardEvent) => {
    const ids: (string | null)[] = [null, ...state.tabs.map((t) => t.id)];
    const at = ids.indexOf(state.active);
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (step && e.shiftKey) {
      if (state.active === null) return;
      e.preventDefault();
      go(moveTab(state, state.active, at - 1 + step));
    } else if (step) {
      e.preventDefault();
      go(activateTab(state, ids[(at + step + ids.length) % ids.length]));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      go(activateTab(state, e.key === "Home" ? null : ids[ids.length - 1]));
    } else if ((e.key === "Delete" || e.key === "Backspace") && state.active !== null) {
      e.preventDefault();
      go(closeTab(state, state.active));
    }
  };

  const drop = (e: DragEvent, to: number) => {
    e.preventDefault();
    if (dragged.current) onChange(moveTab(state, dragged.current, to));
    dragged.current = null;
  };

  return (
    <div className="tabs" ref={bar}>
      <div role="tablist" aria-label={label} title={TAB_KEYS_HINT} onKeyDown={onKey}>
        <span className={state.active === null ? "tab on" : "tab"}>
          <button role="tab" aria-selected={state.active === null} tabIndex={state.active === null ? 0 : -1} onClick={() => onChange(activateTab(state, null))}>
            {home}
          </button>
        </span>
        {state.tabs.map((t, i) => (
          <span
            key={t.id}
            className={state.active === t.id ? "tab on" : "tab"}
            draggable
            onDragStart={() => (dragged.current = t.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => drop(e, i)}
          >
            <button role="tab" aria-selected={state.active === t.id} tabIndex={state.active === t.id ? 0 : -1} onClick={() => onChange(activateTab(state, t.id))}>
              {t.title}
            </button>
            <button className="tab-close" tabIndex={-1} aria-label={`Close ${t.title}`} onClick={() => onChange(closeTab(state, t.id))}>
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
