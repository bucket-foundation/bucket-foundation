export type EfficacyLevel = "independent" | "company" | "none-found" | "not-searched";

export type Logo = { src: string; sourceUrl: string; tone: "light" | "dark"; kind: string };

export type Player = {
  id: string;
  name: string;
  segment: string;
  what: string;
  learner: string;
  mechanism: string;
  price: string;
  efficacy: { level: EfficacyLevel; finding: string; design: string };
  logo: Logo | null;
};

export type Segment = { id: string; label: string; players: Player[] };

export const SEGMENT_LABEL: Record<string, string> = {
  "researcher-knowledge-tools": "Research and knowledge tools",
  "professional-workplace": "Professional and workplace",
  "ai-tutors-study-tools": "AI tutors and study tools",
  "k12-platforms-lms": "K-12 platforms and LMS",
  "adaptive-mastery-tutoring": "Adaptive mastery and tutoring",
  "open-nonprofit": "Open and nonprofit",
  language: "Language",
  "spaced-repetition-flashcards": "Spaced repetition and flashcards",
  "test-prep": "Test prep",
  "moocs-credentials": "MOOCs and credentials",
  "china-india": "China and India",
};

export const EFFICACY_LABEL: Record<EfficacyLevel, string> = {
  independent: "Independent study",
  company: "Company study",
  "none-found": "Searched, none found",
  "not-searched": "Search pending",
};

export const EFFICACY_ORDER: EfficacyLevel[] = ["independent", "company", "none-found", "not-searched"];

export function panelSpans(counts: number[], rows = 3, columns = 24): number[][] {
  const total = counts.reduce((a, b) => a + b, 0);
  const target = total / rows;
  const groups: number[][] = [[]];
  let running = 0;
  counts.forEach((c, i) => {
    const last = groups.length === rows;
    if (!last && groups.at(-1)!.length > 0 && running + c / 2 > target) {
      groups.push([]);
      running = 0;
    }
    groups.at(-1)!.push(i);
    running += c;
  });
  return groups.map((group) => {
    const sum = group.reduce((a, i) => a + counts[i], 0);
    const exact = group.map((i) => (counts[i] / sum) * columns);
    const spans = exact.map((e) => Math.max(1, Math.floor(e)));
    let left = columns - spans.reduce((a, b) => a + b, 0);
    const byRemainder = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r);
    for (let k = 0; left > 0; k += 1, left -= 1) spans[byRemainder[k % spans.length].i] += 1;
    return spans;
  });
}

export function filterPlayers(players: Player[], f: { segment: string; level: string; text: string }): Player[] {
  const needle = f.text.trim().toLowerCase();
  return players.filter(
    (p) =>
      (!f.segment || p.segment === f.segment) &&
      (!f.level || p.efficacy.level === f.level) &&
      (!needle || [p.name, p.learner, p.mechanism, p.price, p.efficacy.finding].some((s) => s.toLowerCase().includes(needle))),
  );
}
