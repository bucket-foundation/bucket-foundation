// Back-compat shim: everything used to import `Shield`. The mark is now
// the Inverse Omega. Old callers keep rendering the new glyph.
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
