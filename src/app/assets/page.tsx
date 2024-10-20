"use client";

import { useAuthor } from "@/context/AuthorContext";
import { useCiteToken } from "@/context/CiteTokensContext";
import { useResearch } from "@/context/ResearchContext";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";


export default function Page() {
  const { primaryWallet } = useDynamicContext();
  const { citeTokens } = useCiteToken();
  const { research } = useResearch();
  const { author } = useAuthor();


  const getAddress = () => {
    return primaryWallet?.address || "Address not available";
  };

  const research_name = "Research Name";
  const value = "$XX";
  const address = getAddress();


  return (
    <div className=" flex justify-center items-center flex-col gap-2">
      <div className="w-[94%] flex items-end justify-start">
        <span className="text-2xl font-bold">Wallet Address:</span>
        <span className="text-2xl">{address}</span>
      </div>
      <div className="w-[89%] justify-end flex" >
        <text className="text-2xl font-bold">{value}</text>
      </div>
      <div className="w-[94%] flex items-end justify-start" >
        <text className="text-2xl font-bold">My Research</text>
      </div>


      {
        research && research.map((r, index: number) => {
          if (r.author_id != author!.id) { return }
          return (
            <div key={index} className="w-[96%] h-32 flex bg-teal-950 border-teal-800 border-2 rounded-xl justify-between items-center flex-row px-4 mb-2">
              <text className="text-4xl font-bold">{r.title}</text>
              <div className="flex gap-4">
                <button
                  disabled
                  className="bg-blue-950 border-blue-800 border-2 rounded-lg p-4">
                  <text className="text-2xl font-bold">
                    {value}
                  </text>
                </button>
              </div>

            </div>
          )
        })
      }


      <div className="w-[94%] flex items-end justify-start" >
        <text className="text-2xl font-bold">My Citations</text>
      </div>

      {
        citeTokens &&
        citeTokens!.map((c, index: number) => {
          return (
            <div key={index} className="w-[96%] h-32 flex bg-teal-950 border-teal-800 border-2 rounded-xl justify-between items-center flex-row px-4 mb-2">
              <text className="text-4xl font-bold">{research?.find((r) => r.id === c.research_id)?.title}</text>
              <div className="flex gap-4">
                <button
                  disabled
                  className="bg-amber-950 border-amber-800 border-2 rounded-lg p-4">
                  <text className="text-2xl font-bold">
                    {value}
                  </text>
                </button>
              </div>

            </div>
          )

        })}
    </div>
  );
}
