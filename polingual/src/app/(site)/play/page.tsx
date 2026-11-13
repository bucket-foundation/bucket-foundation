import { existsSync } from "node:fs";
import path from "node:path";
import Lobbies from "./Lobbies";

export default function PlayPage() {
  const ispyReady = existsSync(path.join(process.cwd(), "src/app/(site)/play/ispy/page.tsx"));
  return <Lobbies ispyReady={ispyReady} />;
}
