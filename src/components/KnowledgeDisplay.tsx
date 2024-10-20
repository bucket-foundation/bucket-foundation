"use client"

import { CiteResearch, useResearch } from "@/context/ResearchContext"

interface KnowledgeDisplayProps {
  id_value: number,
  research_name: string,
  citations_vals: CiteResearch[] | null,
  onRead: (id: number) => void,
  onCite: (id: number) => void
}

export default function KnowledgeDisplay({ id_value, research_name, onRead, onCite, citations_vals }: KnowledgeDisplayProps) {
  const { citations } = useResearch();
  return (
    <div className="w-[96%] h-32 flex flex-col bg-teal-950 border-teal-800 border-2 rounded-xl justify-between px-4 m-2">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold">{research_name}</h2>
        <div className="flex gap-4">
          <button
            className="bg-rose-950 border-rose-800 border-2 rounded-lg p-4"
            onClick={async () => { console.log("Reading ", id_value); await onRead(id_value) }}
          >
            <span className="text-2xl font-bold">Read</span>
          </button>
          <button
            className="bg-amber-950 border-amber-800 border-2 rounded-lg p-4"
            onClick={async () => { console.log("Citing ", id_value); await onCite(id_value) }}
          >
            <span className="text-2xl font-bold">Cite</span>
          </button>
        </div>

      </div>
      {citations && citations.length > 0 && (
        <div className="mt-2 text-sm text-gray-300">
          <h3>Citations:</h3>
          <ul className="list-disc pl-5">
            {citations_vals!.map((citation) => {
              return (
                <li key={citation.id}>{`Citations: ${citation.id}`}</li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

