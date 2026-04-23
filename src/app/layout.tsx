import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Web3Providers from "@/providers/Web3Providers";

export const metadata: Metadata = {
  title: "bucket.foundation — build the past. build history.",
  description:
    "A nonprofit canon of foundations. Primary research paid for once, citeable forever, over x402. bucket is the new renaissance.",
  openGraph: {
    title: "bucket.foundation",
    description: "build the past. build history. bucket is the new renaissance.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <Web3Providers>
        <body
          className={"bg-black"}
        ><Header />
          {children}
          <Footer />
        </body>
      </Web3Providers>
    </html>
  );
}

