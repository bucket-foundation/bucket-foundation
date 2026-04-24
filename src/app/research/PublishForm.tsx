"use client";

import { useAuthor } from "@/context/AuthorContext";
import { useCiteToken } from "@/context/CiteTokensContext";
import { publishIpAsset } from "@/lib/story";
import { uploadFileToWalrus } from "@/lib/walrus/upload";
import { useState } from "react";

/**
 * Interactive mint form. Only rendered when Web3 providers are actually
 * mounted (see ResearchPublishClient).
 *
 * Every dereference of `author` / `citeTokens` is guarded — connecting a
 * wallet is async, and the old code crashed on cold load before the wallet
 * finished resolving.
 */
export default function PublishForm() {
  const { author, loading: authorLoading } = useAuthor();
  const { citeTokens } = useCiteToken();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedCiteTokens, setSelectedCiteTokens] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!author) {
      setStatus("Connect a wallet to publish.");
      return;
    }
    if (!pdfFile) {
      setStatus("Please upload a PDF file.");
      return;
    }
    setSubmitting(true);
    setStatus("Pinning to Walrus…");
    try {
      const uploadedFile = await uploadFileToWalrus(pdfFile);
      let blobId: string | undefined;
      if (uploadedFile) {
        const { newlyCreated, alreadyCertified } = uploadedFile as {
          newlyCreated?: { blobObject: { blobId: string } };
          alreadyCertified?: { blobId: string };
        };
        blobId = newlyCreated?.blobObject.blobId ?? alreadyCertified?.blobId;
      }
      if (!blobId) throw new Error("Walrus returned no blob id.");

      setStatus("Minting IP NFT…");
      await publishIpAsset({
        title,
        description,
        blobId,
        author_id: author.id,
        selectedCiteTokens,
      });
      setStatus("Published. Your IP NFT is on Story.");
    } catch (err) {
      console.error(err);
      setStatus(
        err instanceof Error ? `Publish failed: ${err.message}` : "Publish failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCiteTokenChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Array.from(event.target.selectedOptions, (o) => Number(o.value));
    setSelectedCiteTokens(value);
  };

  return (
    <div className="carved-inset carved-pad max-w-2xl">
      <div className="p-6 md:p-8 flex flex-col gap-5">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
          § Publish form
        </div>
        <div className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">
          mint an ip nft
        </div>

        {!author && !authorLoading && (
          <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
            Connect your wallet via the header to begin. The form stays visible
            so you can see what&rsquo;s required.
          </p>
        )}

        <label className="flex flex-col gap-2">
          <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
            title
          </span>
          <input
            type="text"
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 rounded-sm text-[15px] text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold)]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
            description
          </span>
          <textarea
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 rounded-sm text-[15px] text-[color:var(--basalt)] h-28 focus:outline-none focus:border-[color:var(--gold)]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
            pdf
          </span>
          <input
            type="file"
            accept=".pdf"
            className="text-[14px] text-[color:var(--basalt-2)]"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          />
        </label>

        {citeTokens && citeTokens.length > 0 && (
          <label className="flex flex-col gap-2">
            <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
              cite tokens
            </span>
            <select
              multiple
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 rounded-sm text-[14px] text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold)]"
              value={selectedCiteTokens.map((e) => e.toString())}
              onChange={handleCiteTokenChange}
            >
              {citeTokens.map((t) => (
                <option key={t.id} value={t.id}>
                  {`CiteToken ${t.id} — ${t.created_at.toString()}`}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          onClick={handlePublish}
          disabled={submitting || authorLoading}
          className="mt-2 inline-flex items-center justify-center gap-2 small-caps text-[11px] tracking-[0.14em] text-[color:var(--bone)] bg-[color:var(--basalt)] px-6 py-3 rounded-sm min-h-[44px] hover:bg-[color:var(--aegean-deep)] disabled:opacity-50 transition"
        >
          {submitting ? "publishing…" : "publish"}
        </button>

        {status && (
          <p className="text-[13px] leading-[1.7] text-[color:var(--basalt-2)]">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
