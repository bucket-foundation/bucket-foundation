import { graphService, pagedRead } from "./db";
import { partsFor } from "./han-components";
import { loadHanParts } from "./han-components-db";
import { assemble, HIDE_BELOW, type NsmColexRow, type NsmExponentRow, type NsmPrime, type NsmPrimeRow } from "./nsm";

const PRIME_COLUMNS = "id,label,category,english,ord,en_word,en_pos,sense,sense_match";
const EXPONENT_COLUMNS = "prime_id,lang,word,rank,roman,sense,sense_match,confidence,root_confidence,root_lang,root_form,root_gloss,root_source,colex_with,root_texts";
const COLEX_COLUMNS = "prime_a,prime_b,lang,form,family_count,matched";

type Page<T> = Promise<{ data: T[] | null; error: { message: string } | null }>;

export async function loadNsm(opts: { lang?: string | null; includeHidden?: boolean } = {}): Promise<NsmPrime[]> {
  const primes = await pagedRead<NsmPrimeRow>((page) =>
    graphService().from("nsm_primes").select(PRIME_COLUMNS).order("id").range(page.from, page.to) as unknown as Page<NsmPrimeRow>,
  );
  const exponents = await pagedRead<NsmExponentRow>((page) => {
    let q = graphService().from("nsm_exponents").select(EXPONENT_COLUMNS);
    if (opts.lang) q = q.eq("lang", opts.lang);
    if (!opts.includeHidden) q = q.gte("confidence", HIDE_BELOW);
    return q.order("prime_id").order("lang").order("word").range(page.from, page.to) as unknown as Page<NsmExponentRow>;
  });
  const colex = await pagedRead<NsmColexRow>((page) => {
    let q = graphService().from("nsm_colex").select(COLEX_COLUMNS).eq("counted", true);
    if (opts.lang) q = q.eq("lang", opts.lang);
    return q.order("prime_a").order("prime_b").order("lang").range(page.from, page.to) as unknown as Page<NsmColexRow>;
  });
  const primesOut = assemble(primes, exponents, { includeHidden: opts.includeHidden, colex });
  const han = await loadHanParts(primesOut.flatMap((p) => p.exponents));
  if (han.size === 0) return primesOut;
  return primesOut.map((p) => ({
    ...p,
    exponents: p.exponents.map((e) => {
      const parts = partsFor(e, han);
      return parts.length ? { ...e, hanParts: parts } : e;
    }),
  }));
}
