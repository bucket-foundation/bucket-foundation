import type { ComponentType } from "react";
import type { WebLobbyState } from "@/lib/lobby/client";
import type { ScreenRole } from "@/lib/family/rounds";

export interface RoundProps {
  lobby: Pick<WebLobbyState, "id" | "players" | "isHost" | "root">;
  token: string | null;
  role: ScreenRole;
}

export interface RoundModule {
  id: "family-teach" | "our-trivia";
  title: string;
  blurb: string;
  Round: ComponentType<RoundProps>;
}
