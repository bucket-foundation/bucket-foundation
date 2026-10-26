import type { ReactNode } from "react";
import AssessmentSession from "@/app/research-os/(app)/learn/AssessmentSession";
import PlacementSession from "@/app/research-os/(app)/learn/PlacementSession";
import LangPlacement from "@/app/research-os/(app)/learn/languages/LangPlacement";
import LangStudy from "@/app/research-os/(app)/learn/languages/LangStudy";
import LanguagesHome from "@/app/research-os/(app)/learn/languages/LanguagesHome";
import SystemView from "@/app/research-os/(app)/learn/languages/SystemView";
import "../ros.css";

function Web({ children }: { children: ReactNode }) {
  return <section className="ros learn-web">{children}</section>;
}

export function PlaceView({ deck }: { deck: string }) {
  return (
    <Web>
      <PlacementSession branch={deck} />
    </Web>
  );
}

export function AssessView({ deck }: { deck: string }) {
  return (
    <Web>
      <AssessmentSession branch={deck} />
    </Web>
  );
}

export function LanguagesView() {
  return (
    <Web>
      <LanguagesHome />
    </Web>
  );
}

export function LangSystemView({ system }: { system: string }) {
  return (
    <Web>
      <SystemView systemId={system} showMilestones={false} />
    </Web>
  );
}

export function LangPlaceView({ system, lang }: { system: string; lang?: string }) {
  return (
    <Web>
      <LangPlacement systemId={system} lang={lang ?? null} />
    </Web>
  );
}

export function LangStudyView({ system }: { system: string }) {
  return (
    <Web>
      <LangStudy systemId={system} />
    </Web>
  );
}
