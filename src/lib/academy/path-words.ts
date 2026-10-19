import type { PathError } from "./prereq-path";

export function describePathError(error: PathError, title: (id: string) => string): string {
  if (error.kind === "MissingNode") return error.requiredBy ? `${title(error.requiredBy)} needs a topic Bucket does not have yet.` : "Bucket does not have this topic yet.";
  if (error.kind === "Cycle") return `Two topics each need the other first: ${error.nodes.map(title).join(", ")}.`;
  return "Bucket is unsure what you already know here. Take a short check.";
}

export function rawPathError(error: PathError): string {
  if (error.kind === "MissingNode") return `missing ${error.id}${error.requiredBy ? ` required by ${error.requiredBy}` : ""}`;
  if (error.kind === "Cycle") return `cycle ${error.nodes.join(" > ")}`;
  return error.kind;
}
