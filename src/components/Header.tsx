import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <div className="h-[120px] flex justify-center items-center">
      <div className="w-[98%] h-[80%] flex justify-between items-center rounded-xl px-4 bg-teal-950 border-2 border-teal-800 bg-opacity-50 ">
        <div className="h-[80%] w-full flex gap-20 justify-start items-end rounded-xl pb-1">
          <Link href={"/"}>
            <Image
              src="/first-image.png"
              alt="Footer Image"
              width={90}
              height={90}
            />
          </Link>
          <Link href={"/knowledge"} className="text-white text-2xl hover:text-gray-300 transition">
            Library
          </Link>
          <Link href={"/research"} className="text-white text-2xl hover:text-gray-300 transition">
            Research
          </Link>
          <Link href={"/assets"} className="text-white text-2xl hover:text-gray-300 transition">
            Assets
          </Link>
        </div>
        <div className="flex items-center">
          <DynamicWidget /></div>
      </div></div>
  );
}
