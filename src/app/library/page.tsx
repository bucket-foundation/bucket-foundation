"use client";

import { useAuthor } from "@/contexts/AuthorContext";
import { useResearch } from "@/contexts/ResearchContext";

export default function Page() {

  const { author, citeTokens } = useAuthor();
  const { research } = useResearch();

  return (
    <div className=" flex justify-center items-center">
      {
        citeTokens!.map((c) => {
          return (
            <div className="w-[96%] h-32 flex bg-teal-950 border-teal-800 border-2 rounded-xl justify-between items-center flex-row px-4">
              <text className="text-4xl font-bold">{research.find((r) => { return r.id == c.research_id })?.title}</text>
              <div className="flex gap-4">
                <button
                  className="bg-green-950 border-green-800 border-2 rounded-lg p-4"
                >
                  <text className="text-2xl font-bold">
                    Open
                  </text>
                </button>
                <button
                  className="bg-amber-950 border-amber-800 border-2 rounded-lg p-4"
                >
                  <text className="text-2xl font-bold">
                    Cite
                  </text>
                </button>
              </div>

            </div>
          )
        })
      }
    </div>
  );
}
