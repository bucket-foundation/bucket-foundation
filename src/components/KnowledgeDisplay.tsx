"use client"
interface KnowledgeDisplayProps {
  id: number,
  research_name: string,
  onRead: (id: number) => Promise<void>
  onCite: (id: number) => any
}

export default function KnowledgeDisplay({ id, research_name, onRead, onCite }: KnowledgeDisplayProps) {
  return (
    <div className="w-[96%] h-32 flex bg-teal-950 border-teal-800 border-2 rounded-xl justify-between items-center flex-row px-4">
      <text className="text-4xl font-bold">{research_name}</text>
      <div className="flex gap-4">
        <button
          className="bg-rose-950 border-rose-800 border-2 rounded-lg p-4"
          onClick={() => { onRead(id) }}
        >
          <text className="text-2xl font-bold">
            Read
          </text>
        </button>
        <button
          className="bg-amber-950 border-amber-800 border-2 rounded-lg p-4"
          onClick={() => { onCite(id) }}
        >
          <text className="text-2xl font-bold">
            Cite
          </text>
        </button>
      </div>

    </div>
  )
}
