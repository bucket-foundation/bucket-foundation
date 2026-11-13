import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DesignNav from "./DesignNav";
import s from "./design.module.css";

const FONTS = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;700;800;900&family=Space+Mono:wght@400;700&display=swap";

export const metadata: Metadata = { title: "Play design", robots: { index: false, follow: false } };


export default function DesignLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className={s.page}>
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <DesignNav />
      {children}
    </div>
  );
}
