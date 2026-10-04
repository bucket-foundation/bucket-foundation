import type { Metadata } from "next";
import DownloadPage from "../download/page";

export const metadata: Metadata = {
  title: "Try Bucket",
  description: "Explore a sample Bucket workspace in your browser. Follow a question from a coin toss to a source and a note.",
  alternates: { canonical: "/demo" },
};

export default DownloadPage;
