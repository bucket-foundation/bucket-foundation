"use client";

import { useAuthor } from "@/context/AuthorContext";
import { useCiteToken } from "@/context/CiteTokensContext";
import { publishIpAsset } from "@/lib/story";
import { uploadFileToWalrus } from "@/lib/walrus/upload";
import { useState } from "react";

export default function Page() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedCiteTokens, setSelectedCiteTokens] = useState<number[]>([]);
  const { author } = useAuthor();
  const { citeTokens } = useCiteToken();

  const handlePublish = async () => {
    setLoading(true);
    try {
      if (!pdfFile) {
        alert("Please upload a PDF file.");
        return;
      }
      try {
        const uploadedFile = await uploadFileToWalrus(pdfFile);
        let blobId: string | undefined;
        console.log("File: ", uploadedFile);
        if (uploadedFile) {
          const { newlyCreated, alreadyCertified } = uploadedFile;

          if (newlyCreated) {
            console.log('Newly created file:', newlyCreated);
            blobId = newlyCreated.blobObject.blobId;

          } else if (alreadyCertified) {
            console.log('Already certified file:', alreadyCertified);
            blobId = alreadyCertified.blobId;
          } else {
            console.log('No valid file state found.');
          }
        }

        console.log(title, description, selectedCiteTokens);

        await publishIpAsset({
          title,
          description,
          blobId: blobId!,
          author_id: author!.id,
          selectedCiteTokens
        });
        alert("IP Asset published successfully!");
      } catch (error) {
        console.error("Error publishing IP Asset:", error);
        alert("Failed to publish IP Asset.");
      }
    } catch {
      console.log("error");
    } finally {
      setLoading(false);
    }
  };

  const handleCiteTokenChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Array.from(event.target.selectedOptions, option => Number(option.value));
    setSelectedCiteTokens(value);
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

        {/* Multi-select for selecting CiteTokens */}
        <select
          multiple
          className="border-2 border-teal-800 p-2 rounded-lg bg-teal-950 text-white"
          value={selectedCiteTokens.map((e) => { return e.toString() })}
          onChange={handleCiteTokenChange}
        >
          {citeTokens && citeTokens.map((token) => (
            <option key={token.id} value={token.id}>
              {`CiteToken ${token.id} - ${token.created_at.toString()}`}
            </option>
          ))}
        </select>

        {loading ? (
          <div className="flex justify-center items-center h-10">
            <div className="loader animate-spin border-4 border-t-4 border-t-white border-teal-800 rounded-full w-6 h-6"></div>
          </div>
        ) : (
          <button
            onClick={handlePublish}
            className="bg-teal-600 text-white rounded-lg p-2 hover:bg-teal-700 transition"
          >
            Publish
          </button>
        )}
      </div>
    </div>
  );
}

