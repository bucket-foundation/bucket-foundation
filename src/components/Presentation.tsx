import TrackedLink from "./TrackedLink";
import { START_LEARNING_HREF } from "@/lib/analytics/funnel";

export default function Presentation() {
  return (
    <section data-hero className="stone-bone min-h-[calc(100svh-62px-77px)] flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto py-20 text-center">
        <h1 className="font-display uppercase text-[clamp(2.4rem,9vw,4.5rem)] leading-[1.02] chisel tracking-[0.01em] text-[color:var(--basalt)]">
          reform <span className="inlay-gold">education.</span>
        </h1>
        <p className="mt-6 mx-auto max-w-md text-[17px] md:text-[19px] leading-[1.55] text-[color:var(--basalt-2)]">
          Learn the foundations of science, from first lesson to the research frontier.
        </p>
        <TrackedLink
          href={START_LEARNING_HREF}
          event="start_learning_click"
          from="home_hero"
          className="mt-10 inline-flex items-center justify-center min-h-[56px] px-10 rounded-md bg-[color:var(--gold)] text-[color:var(--basalt)] hover:bg-[color:var(--gold-deep)] hover:text-[color:var(--bone)] transition text-[17px] font-semibold"
        >
          Start learning
        </TrackedLink>
      </div>
    </section>
  );
}
