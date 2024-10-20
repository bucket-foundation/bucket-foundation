// ReadClient.tsx
"use client";

import { useState } from 'react';
import Modal from '@/components/Modal';
import KnowledgeDisplay from '@/components/KnowledgeDisplay';
import { downloadFileFromWalrus } from '@/story/utils/downloadFromWalrus';
import { useAuthor } from '@/contexts/AuthorContext';
import { supabase } from '@/utils/supabaseClient';
import { mintReadNFT } from '@/story/mintReadNFT';
import { mintCiteLicense } from '@/story/mintCiteLicense';

const ReadClient = ({ research, ip_metadata }: { research: any, ip_metadata: any }) => {
  const [pdfFile, setPdfFile] = useState<Blob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingRead, setIsLoadingRead] = useState(false);
  const [isLoadingCite, setIsLoadingCite] = useState(false);
  const { author } = useAuthor();

  async function handleRead(id: number): Promise<void> {
    const metadataEntry = ip_metadata.find((e: any) => e.id === id);
    await mintReadNFT(metadataEntry);
    setIsLoadingRead(true)

    const blobId = research.find((e: any) => e.id === id)?.blob_id;
    if (blobId) {
      const file = await downloadFileFromWalrus(blobId);

      setPdfFile(file);
      setIsModalOpen(true);
    }
    setIsLoadingRead(false)
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setPdfFile(null); // Reset file when closing modal
  }

  async function handleCite(id: number): Promise<any> {
    const ipId = research.find((e: any) => e.id === id)?.ip_id;
    console.log("ipId", ipId)
    if (ipId) {
      await mintCiteLicense(ipId);


      setIsLoadingCite(true)
      console.log("id", id)
      let { data, error } = await supabase.from('cite_tokens').insert({ "research_id": id, "author_id": author?.id! })
      console.log(error)
      setIsLoadingCite(false)
    }

    if (isLoadingCite || isLoadingRead) {
      return (<div>Loading ...</div>)
    }
  }
  return (
    <div className="mt-8 flex justify-center items-center flex-col">
      {research.map((e: any) => (
        <KnowledgeDisplay
          key={e.id}
          id={e.id}
          research_name={e.title}
          onRead={handleRead}
          onCite={handleCite}
        />
      ))}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        file={pdfFile}
      />
    </div>
  );
};

export default ReadClient;

