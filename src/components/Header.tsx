import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import Link from "next/link";

export default function Header() {
  return (
    <div className="h-24 flex justify-center items-center">
      <div className="w-[98%] h-[80%] flex justify-between items-center rounded-xl px-4 bg-teal-800 ">
        <div className="h-[80%] w-full flex gap-4 justify-start items-end rounded-xl pb-1">
          <Link href={"/"}>Home</Link>
          <Link href={"/knowledge"}>Knowledge</Link>
          <Link href={"/research"}>Research</Link>
          <Link href={"/library"}>Library</Link>
          <Link href={"/assets"}>Assets</Link>
        </div>
        <div className="flex items-center">
          <DynamicWidget /></div>
      </div></div>
  );
}
