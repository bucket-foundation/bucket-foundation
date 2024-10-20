"use client"
interface KnowledgeDisplayProps {
  id_value: number,
  research_name: string,
  onRead: (id: number) => void
  onCite: (id: number) => void
}

export default function KnowledgeDisplay({ id_value, research_name, onRead, onCite }: KnowledgeDisplayProps) {
  return (
    <div className="w-[96%] h-[100px] flex bg-teal-950 border-teal-800 border-2 rounded-xl justify-between items-center flex-row px-4 m-2">
      <text className="text-4xl font-bold">{research_name}</text>
      <div className="flex gap-4">
        <button
          className="bg-rose-950 border-rose-800 border-2 rounded-lg p-4"
          onClick={async () => { console.log("Reading ", id_value); await onRead(id_value) }}
        >
          <text className="text-2xl font-bold">
            Read
          </text>
        </button>
        <button
          className="bg-amber-950 border-amber-800 border-2 rounded-lg p-4"
          onClick={async () => { console.log("Citing ", id_value); await onCite(id_value) }}
        >
          <text className="text-2xl font-bold">
            Cite
          </text>
        </button>
      </div>

    </div>
  )
}
