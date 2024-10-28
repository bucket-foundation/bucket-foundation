import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Web3Providers from "@/providers/Web3Providers";

export const metadata: Metadata = {
  title: "Bucket",
  description: "Desci & Research",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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

