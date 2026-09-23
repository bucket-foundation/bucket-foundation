import { graphService, pagedRead } from "./db";
import { assemble, HIDE_BELOW, type NsmExponentRow, type NsmPrime, type NsmPrimeRow } from "./nsm";

const PRIME_COLUMNS = "id,label,category,english,ord,en_word,en_pos,sense,sense_match";
const EXPONENT_COLUMNS = "prime_id,lang,word,rank,roman,sense,sense_match,confidence,root_confidence,root_lang,root_form,root_gloss";

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
  return assemble(primes, exponents, { includeHidden: opts.includeHidden });
}
