// /canon/timeline → permanent redirect to /canon.
// The time-bar controls are now integrated into the main canon globe
// (click "⏵ scrub through time" below the globe). This route is kept
// as a redirect so any old links keep working.

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/canon");
}
