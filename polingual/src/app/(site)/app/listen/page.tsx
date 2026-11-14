import { NeedsSound } from "@/ui";
import Listen from "./Listen";

export const metadata = { title: "Listen" };

export default function Page() {
  return (
    <NeedsSound game="Listen">
      <Listen />
    </NeedsSound>
  );
}
