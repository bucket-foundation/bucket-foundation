export const ADJECTIVES = [
  "amber", "brave", "bright", "calm", "clever", "cozy", "eager", "gentle", "golden", "happy", "jolly", "kind",
  "lucky", "merry", "nimble", "proud", "quick", "quiet", "silver", "steady", "sunny", "swift", "tidy", "witty",
] as const;

export const NOUNS = [
  "badger", "comet", "falcon", "fern", "heron", "kettle", "koala", "lamp", "lantern", "maple", "otter", "owl",
  "panda", "pebble", "puffin", "quill", "river", "robin", "tiger", "tulip", "violin", "walrus", "willow", "zebra",
] as const;

const ADJ = new Set<string>(ADJECTIVES);
const NOUN = new Set<string>(NOUNS);

export function isNickname(key: unknown): key is string {
  if (typeof key !== "string") return false;
  const parts = key.split("-");
  return parts.length === 2 && ADJ.has(parts[0]) && NOUN.has(parts[1]);
}

export function nicknameChoices(random: () => number, count = 3): string[] {
  const out = new Set<string>();
  while (out.size < count) {
    const a = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)];
    const n = NOUNS[Math.floor(random() * NOUNS.length)];
    out.add(`${a}-${n}`);
  }
  return [...out];
}
