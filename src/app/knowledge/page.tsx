"use client";

import { useEffect, useState } from "react";
import KnowledgeDisplay from "@/components/KnowledgeDisplay";
import { useAuthor } from "@/context/AuthorContext";
import { useCiteToken } from "@/context/CiteTokensContext";
import { useResearch } from "@/context/ResearchContext";
import { mintCiteNFT, mintReadNFT } from "@/lib/story"; // Assuming you use this elsewhere
import { downloadFileFromWalrus } from "@/lib/walrus/download";
import { Research } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

export default function Page() {
  const { research } = useResearch();
  const { createCiteToken } = useCiteToken();
  const { author } = useAuthor();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (research) {
      setLoading(false);
    }
  }, [research]);

  const handleRead = async (id: number): Promise<void> => {
    if (!research) return;

    const blobId = research.find((e: Research) => e.id === id)?.blob_id;
    if (blobId) {
      const file = await downloadFileFromWalrus(blobId);

      // Create a Blob URL
      const blobUrl = URL.createObjectURL(file);

      // Open the file in a new window
      window.open(blobUrl, '_blank');

      const { data } = await supabase
        .from('ip_metadata')
        .select()
        .eq('research_id', id);

      if (data && data.length > 0) {
        await mintReadNFT(data[0]);
      }
    }
  };


  const handleCite = async (id: number): Promise<void> => {

    const r = research?.find((e) => { return e.id == id })
    if (!r || !author) {
      return
    }

    await mintCiteNFT(r.ip_id, author.id, id)
  };

  if (loading || !research) {
    return <div>Loading ...</div>;
  }

  return (
    <div className="gap-4 mt-8 flex justify-center items-center flex-col">
      {research && research.map((e: Research, index: number) => (
        <KnowledgeDisplay
          key={index}
          id_value={e.id}
          research_name={e.title}
          onRead={handleRead}
          onCite={handleCite}
        />
      ))}
    </div>
  );
}

