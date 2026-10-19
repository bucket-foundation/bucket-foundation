export function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) return "Too many emails requested. Wait a minute and try again.";
  if (m.includes("expired")) return "That code expired. Ask for a new one.";
  if (m.includes("invalid")) return "That code did not match. Check it and try again.";
  if (/^[a-z0-9_]+$/.test(message) || /^\{|^\[|\b(status|error|code)\b\s*[:=]/i.test(message)) return "Sign-in did not work. Try again in a moment.";
  return message;
}
