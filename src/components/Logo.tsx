import { LOGO } from "@/lib/brand";

export default function Logo({ size = 40, className = "", title = "Bucket Foundation" }: { size?: number; className?: string; title?: string }) {
  return <img src={LOGO.svg} alt={title} width={size} height={size} className={`rounded-[24%] ${className}`} />;
}
