import type { Metadata } from "next";
import { FACTS } from "./facts";
import { pageMeta } from "./meta";
import { WORDS, capitalize, wordDescription, wordPath, wordTitle, type Word } from "./words";
import { wordOgImage } from "./word-og";
import { hreflangAlternates, localIndexCopy, localOgImage, localPath, localWordCopy, localeInfo } from "./word-i18n";

export function wordMeta(code: string, w: Word): Metadata {
  const path = wordPath(w);
  const languages = hreflangAlternates(path);
  const locale = localeInfo(code).locale;
  if (code === "en") {
    return pageMeta({ path, title: `${capitalize(w.en)} in ${w.forms.length} languages`, documentTitle: wordTitle(w), description: wordDescription(w), type: "article", image: wordOgImage(w), languages, locale });
  }
  const copy = localWordCopy(code, w);
  return pageMeta({ path: localPath(code, path), title: copy.title, documentTitle: `${copy.title} | Polingual`, description: copy.description, type: "article", image: localOgImage(code, w), languages, locale });
}

export function wordIndexMeta(code: string): Metadata {
  const languages = hreflangAlternates("/word");
  const locale = localeInfo(code).locale;
  if (code === "en") {
    const title = `${WORDS.length} words in ${FACTS.languageCount} languages`;
    const description = `Common words from numbers to verbs, each in up to ${FACTS.languageCount} languages with native script and pronunciation. Browse by theme.`;
    return pageMeta({ path: "/word", title, documentTitle: `${title} | Polingual`, description, languages, locale });
  }
  const copy = localIndexCopy(code);
  return pageMeta({ path: localPath(code, "/word"), title: copy.title, documentTitle: `${copy.title} | Polingual`, description: copy.description, languages, locale });
}
