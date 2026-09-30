export const ERAS: readonly { from: number; to: number; label: string }[] = [
  { from: -Infinity, to: 1899, label: "before 1900" },
  { from: 1900, to: 1949, label: "1900 to 1949" },
  { from: 1950, to: 1979, label: "1950 to 1979" },
  { from: 1980, to: 1999, label: "1980 to 1999" },
  { from: 2000, to: 2019, label: "2000 to 2019" },
  { from: 2020, to: Infinity, label: "2020 on" },
];

export function eraOf(year: number): number {
  const i = ERAS.findIndex((e) => year >= e.from && year <= e.to);
  return i < 0 ? ERAS.length - 1 : i;
}

export function timeCoord(year: number): number {
  const e = eraOf(year);
  const { from, to } = ERAS[e];
  const lo = Number.isFinite(from) ? from : 1600;
  const hi = Number.isFinite(to) ? to : 2026;
  return e + Math.min(1, Math.max(0, (year - lo) / (hi - lo + 1)));
}
