export const FRENCH_H_ASPIRE: ReadonlySet<string> = new Set([
  "hache", "hachis", "haie", "haillon", "haine", "haïr", "hall", "halle", "halte", "hamac",
  "hameau", "hamburger", "hamster", "hanche", "handball", "handicap", "hangar", "hanneton", "hanter", "happer",
  "harangue", "haras", "harceler", "hardi", "harem", "hareng", "hargne", "haricot", "harnais", "harpe",
  "harpon", "hasard", "hâte", "hausse", "haut", "hautbois", "hauteur", "havre", "hennir", "hérisson",
  "hernie", "héron", "héros", "herse", "hêtre", "heurter", "hibou", "hiérarchie", "hisser", "hobby",
  "hockey", "hold-up", "hollandais", "homard", "hongrois", "honte", "honteux", "hoquet", "horde", "hors",
  "hot-dog", "hotte", "houblon", "houle", "houppe", "housse", "houx", "hublot", "huer", "huit",
  "huitième", "hululer", "humer", "hurler", "hutte", "hyène",
  "hachette", "hachoir", "haineux", "hâtif", "hautain", "hautement", "huitaine", "hurlement", "hurleur", "harponner",
  "hargneux", "hardiesse", "hanté", "handicapé", "hiérarchique", "houleux", "hutin",
]);

const PLURAL = /(s|x)$/;

export function isHAspire(noun: string): boolean {
  const w = noun.trim().toLowerCase().split(/[\s'’-]+/)[0];
  if (FRENCH_H_ASPIRE.has(w)) return true;
  return PLURAL.test(w) && FRENCH_H_ASPIRE.has(w.slice(0, -1));
}
