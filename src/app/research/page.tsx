
"use client";

import { useState } from "react";
import { publishIPAsset, publishIPAssetProps } from "@/story/publishIPAsset";
import { uploadFileToWalrus } from "@/story/utils/uploadToWalrus";

export default function Page() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState("");
  const [data, setData] = useState<publishIPAssetProps>({ title: "", description: "", blobId: "" });

  const handlePublish = async () => {
    if (!pdfFile) {
      alert("Please upload a PDF file.");
      return;
    }
    try {
      const uploadedFile = await uploadFileToWalrus(pdfFile);
      let blobId: string;
      console.log("File: ", uploadedFile)
      if (uploadedFile) {
        const { newlyCreated, alreadyCertified } = uploadedFile;

        if (newlyCreated) {
          console.log('Newly created file:', newlyCreated);
          blobId = newlyCreated.blobId;

        } else if (alreadyCertified) {
          console.log('Already certified file:', alreadyCertified);
          blobId = alreadyCertified.blobId
        } else {
          console.log('No valid file state found.');
        }
      }

      console.log(title, description)

      setData({ title, description, blobId: blobId! });

      await publishIPAsset({ title, description, blobId: blobId! });
      alert("IP Asset published successfully!");
    } catch (error) {
      console.error("Error publishing IP Asset:", error);
      alert("Failed to publish IP Asset.");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-96 h-auto bg-teal-950 border-teal-800 border-2 rounded-xl p-6 flex flex-col gap-4 shadow-lg">
        <h2 className="text-xl font-bold text-white">Publish IP Asset</h2>
        <input
          type="text"
          placeholder="Title"
          className="border-2 border-teal-800 p-2 rounded-lg bg-teal-950 text-white"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Description"
          className="border-2 border-teal-800 p-2 rounded-lg bg-teal-950 text-white h-24"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="file"
          accept=".pdf"
          className="border-2 border-teal-800 p-2 rounded-lg bg-teal-950 text-white"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
        />
        <button
          onClick={handlePublish}
          className="bg-teal-600 text-white rounded-lg p-2 hover:bg-teal-700 transition"
        >
          Publish
        </button>
      </div>
    </div>
  );
}

