import InverseOmega from "./InverseOmega";

export default function Shield({
  size = 56,
  className = "",
  title = "bucket foundation",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return <InverseOmega size={size} className={className} title={title} />;
}
