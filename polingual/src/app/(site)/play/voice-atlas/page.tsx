import { NeedsSound } from "@/ui";
import VoiceAtlas from "./VoiceAtlas";

export const metadata = { title: "Voice Atlas" };

export default function Page() {
  return (
    <NeedsSound game="Voice Atlas">
      <VoiceAtlas />
    </NeedsSound>
  );
}
