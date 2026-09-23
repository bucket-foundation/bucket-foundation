import { graphService, pagedRead } from "./db";
import { orderWords, shownWords, toNodeWord, type NodeWord, type NodeWordRow } from "./node-words";

const COLUMNS = "id,lang,word,roman,gloss,root_lang,root_form,root_gloss,chain,root_texts,en_term,sense,confidence,root_confidence,root_source,source";

export async function loadNodeWords(nodeId: string): Promise<NodeWord[]> {
  const rows = await pagedRead<NodeWordRow>((page) =>
    graphService()
      .from("node_words")
      .select(COLUMNS)
      .eq("node_id", nodeId)
      .order("id")
      .range(page.from, page.to) as unknown as Promise<{ data: NodeWordRow[] | null; error: { message: string } | null }>,
  );
  return orderWords(shownWords(rows.map(toNodeWord)));
}
