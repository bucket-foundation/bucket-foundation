import VideoList from "./VideoList";
import { videoIndex } from "./videos";

export const metadata = { title: "Watch" };

export default function Page() {
  return <VideoList videos={videoIndex()} />;
}
