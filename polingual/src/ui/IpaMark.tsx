import { Tag } from "./primitives";

export function isGeneratedIpa(source: string | null | undefined): boolean {
  return !!source && source !== "wiktionary";
}

export function IpaMark({ source }: { source: string | null | undefined }) {
  if (!isGeneratedIpa(source)) return null;
  return (
    <Tag size="sm" data-testid="ipa-generated" title={source === "llm" ? "Pronunciation written by a language model" : "Pronunciation from spelling rules"}>
      generated
    </Tag>
  );
}
