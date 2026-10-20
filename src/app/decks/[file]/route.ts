import { deckCatalogResponse } from "@/lib/decks/catalog-files";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { file: string } }): Promise<Response> {
  return deckCatalogResponse(params.file);
}
