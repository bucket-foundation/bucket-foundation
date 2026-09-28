import { rootTextLine, rootTextUncertain, type RootText } from "@/lib/research-os/node-words";

export default function RootTexts({ texts, lang, uncertain, rootUncertain }: { texts: RootText[]; lang: string; uncertain: boolean; rootUncertain: boolean }) {
  return (
    <>
      {texts.map((t, i) => (
        <div key={i} className="mt-1 flex flex-col gap-1">
          <p className="text-[12px] text-[color:var(--basalt-3)]">
            {rootTextLine(t)}
            {rootTextUncertain(t, { uncertain, rootUncertain }) && (
              <span className="ml-1 small-caps text-[10px] tracking-[0.14em] text-[color:var(--gold-deep)]">verses for an uncertain root</span>
            )}
          </p>
          {t.samples.map((s) => (
            <blockquote key={s.ref} className="border-l-2 border-[color:var(--gold)] pl-3 text-[15px] leading-[1.9] text-[color:var(--basalt-2)]">
              <span lang={lang} dir="rtl" className="block">
                {s.text}
              </span>
              <footer className="text-[11px] text-[color:var(--basalt-3)]">
                {t.corpus} {s.ref}
              </footer>
            </blockquote>
          ))}
          <p className="text-[11px] text-[color:var(--basalt-3)]">{t.source}</p>
        </div>
      ))}
    </>
  );
}
