import type { Metadata } from "next";
import Link from "next/link";
import Legal from "./legal";

export const metadata: Metadata = { title: { absolute: "Page not found · Polingual" } };

export default function NotFound() {
  return (
    <Legal>
      <h1>Page not found</h1>
      <p className="lede">This page does not exist. <Link href="/">Go to the Polingual home page</Link>.</p>
    </Legal>
  );
}
