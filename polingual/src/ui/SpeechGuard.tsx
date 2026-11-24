"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cancelSpeech } from "@/lib/speak";

export function SpeechGuard() {
  const path = usePathname();
  useEffect(() => () => cancelSpeech(), [path]);
  return null;
}
