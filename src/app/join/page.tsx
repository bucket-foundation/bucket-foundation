import { redirect } from "next/navigation";

// The contribute page is retired in favor of one sign-in (docs/AUTH.md).
// Its text is kept in _intake/research-os-k12/DELETIONS.md.
export default function Page() {
  redirect("/sign-in");
}
