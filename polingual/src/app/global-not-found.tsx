import type { Metadata, Viewport } from "next";
import "./globals.css";
import Site from "./site";
import { ROOT_VIEWPORT } from "./root-meta";

export const metadata: Metadata = { title: "Page not found · Polingual", metadataBase: new URL("https://www.polingual.com") };

export const viewport: Viewport = ROOT_VIEWPORT;

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <Site>
          <h1>Page not found</h1>
          <p className="lede">This page does not exist. <a href="/">Go to the Polingual home page</a>.</p>
        </Site>
      </body>
    </html>
  );
}
