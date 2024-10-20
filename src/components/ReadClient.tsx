// ReadClient.tsx
"use client";

import { useState } from 'react';
import Modal from '@/components/Modal';
import KnowledgeDisplay from '@/components/KnowledgeDisplay';
import { downloadFileFromWalrus } from '@/story/utils/downloadFromWalrus';

const ReadClient = ({ research }: { research: any }) => {
  const [pdfFile, setPdfFile] = useState<Blob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function handleRead(id: number): Promise<void> {
    const blobId = research.find((e: any) => e.id === id)?.blob_id;
    if (blobId) {
      const file = await downloadFileFromWalrus(blobId);
      setPdfFile(file);
      setIsModalOpen(true);
    }
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setPdfFile(null); // Reset file when closing modal
  }

  async function handleCite(id: number): Promise<any> {
    // Implement citation logic here if needed
  }

  return (
    <>
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
    </>
  );
};

export default ReadClient;

