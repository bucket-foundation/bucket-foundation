/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy, Suspense, type ComponentType, type JSX } from "react";

type Loader<P> = () => Promise<{ default: ComponentType<P> } | ComponentType<P>>;

export default function dynamic<P extends object>(loader: Loader<P>, _opts?: { ssr?: boolean; loading?: () => JSX.Element | null }) {
  const Lazy = lazy(async (): Promise<{ default: ComponentType<any> }> => {
    const m = await loader();
    return "default" in m ? (m as { default: ComponentType<P> }) : { default: m as ComponentType<P> };
  });
  return function Dynamic(props: P) {
    return (
      <Suspense fallback={_opts?.loading ? _opts.loading() : null}>
        <Lazy {...(props as P & JSX.IntrinsicAttributes)} />
      </Suspense>
    );
  };
}
