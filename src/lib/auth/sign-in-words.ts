export function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) return "Too many emails requested. Wait a minute and try again.";
  if (m.includes("expired")) return "That code expired. Ask for a new one.";
  if (m.includes("invalid")) return "That code did not match. Check it and try again.";
  const sentence = /^[A-Z][A-Za-z ,.'-]*[A-Za-z.]$/.test(message.trim()) && message.trim().includes(" ") && !/\b(status|error|code|null|undefined)\b/i.test(message);
  return sentence ? message : "Sign-in did not work. Try again in a moment.";
}
