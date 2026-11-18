import Site from "@/app/site";
import { siteLocale } from "@/app/(site)/word/views";
import { giftCopy, type GiftLang } from "@/lib/gift";
import { Banner } from "@/ui";
import GiftForm from "./GiftForm";
import Redeem from "./Redeem";

function Shell({ lang, children }: { lang: GiftLang; children: React.ReactNode }) {
  return <Site loc={lang === "en" ? undefined : siteLocale(lang)}>{children}</Site>;
}

export function GiftView({ lang }: { lang: GiftLang }) {
  const c = giftCopy(lang);
  return (
    <Shell lang={lang}>
      <Banner testId="gift-banner">
        <h1>{c.title}</h1>
        <p className="lede">{c.lede}</p>
      </Banner>
      <GiftForm lang={lang} />
      <p>{c.terms}</p>
    </Shell>
  );
}

export function RedeemView({ lang }: { lang: GiftLang }) {
  const c = giftCopy(lang);
  return (
    <Shell lang={lang}>
      <h1>{c.redeemTitle}</h1>
      <p className="lede">{c.redeemLede}</p>
      <Redeem lang={lang} />
    </Shell>
  );
}
