export const EDTF_SUBSET_SOURCE =
  "^(Y-?[1-9][0-9]{4,8}|-?[0-9]{4}(-[0-9]{2}){0,2}|-?[0-9]{2}([0-9]X|XX))[?~%]?(/(Y-?[1-9][0-9]{4,8}|-?[0-9]{4}(-[0-9]{2}){0,2}|-?[0-9]{2}([0-9]X|XX))[?~%]?)?$";
export const EDTF_SUBSET = new RegExp(EDTF_SUBSET_SOURCE);

export const APPROXIMATE_YEARS = 10;
export const APPROXIMATE_YEARS_FINE = 1;
export const GREGORIAN_ADOPTION_COMPLETE = 1923;
export const OLD_STYLE_LAST_YEAR = 1752;
export const MAX_ABS_YEAR = 999_999_999;

export const SPAN_PRECISIONS = ["day", "month", "year", "decade", "century", "millennium", "ka", "10ka", "100ka"] as const;
export const SPAN_CALENDARS = ["gregorian", "julian", "julian-os", "hebrew", "islamic", "chinese", "other"] as const;
export const SPAN_QUALIFIERS = ["none", "approximate", "uncertain", "both"] as const;
export const SPAN_ROLES = ["born", "died", "flourished"] as const;

export type SpanPrecision = (typeof SPAN_PRECISIONS)[number];
export type SpanCalendar = (typeof SPAN_CALENDARS)[number];
export type SpanQualifier = (typeof SPAN_QUALIFIERS)[number];
export type LifespanRole = (typeof SPAN_ROLES)[number];
export type CalendarHint = "gregorian" | "julian" | "julian-os" | "unknown";
export type YearConvention = "historical" | "astronomical";

export type SpanUncertainty =
  | { kind: "point"; params: Record<string, never> }
  | {
      kind: "uniform";
      params: { min: number; max: number; endpoints: { start: [number, number]; end: [number, number] } };
    };

export interface Span {
  edtf: string;
  start_year: number;
  end_year: number;
  start_min: number;
  start_max: number;
  end_min: number;
  end_max: number;
  precision: SpanPrecision;
  calendar: SpanCalendar;
  qualifier: SpanQualifier;
  uncertainty: SpanUncertainty;
}

export type SpanRefusal =
  | "syntax"
  | "impossible-date"
  | "out-of-range"
  | "open-interval"
  | "reversed"
  | "composite"
  | "calendar"
  | "inconsistent";

export interface Refused {
  ok: false;
  refusal: SpanRefusal;
  detail: string;
}
export type SpanResult = { ok: true; span: Span } | Refused;
export type LifespanRoles = Partial<Record<LifespanRole, Span>>;
export type LifespanResult = { ok: true; roles: LifespanRoles } | Refused;

export interface SpanOptions {
  calendar?: CalendarHint;
}

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

interface Flags {
  approximate: boolean;
  uncertain: boolean;
}

interface Endpoint {
  label: string;
  lo: number;
  hi: number;
  min: number;
  max: number;
  precision: SpanPrecision;
  calendar: SpanCalendar;
  flags: Flags;
}

interface RawDate {
  year: number;
  month: number | null;
  day: number | null;
  width: 1 | 10 | 100;
  flags: Flags;
  unspecified?: string;
}

const NO_FLAGS: Flags = { approximate: false, uncertain: false };
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const COMPONENT = /^(?:Y(-?[1-9][0-9]{4,8})|(-?[0-9]{4})(?:-([0-9]{2}))?(?:-([0-9]{2}))?|(-?)([0-9]{2})([0-9]X|XX))([?~%]?)$/;
const TEXT_PREFIX = /^(trad\.\s*)?((?:c\.|ca\.|circa)\s*)?/i;
const ERA = "(BCE|BC|CE|AD)";
const ERA_YEAR = new RegExp(`^(?:([0-9]{1,9})\\s*${ERA}?|(AD|CE)\\s+([0-9]{1,9}))$`, "i");
const CENTURY = new RegExp(`^([0-9]{1,7})(st|nd|rd|th)\\s+century(?:\\s+${ERA})?$`, "i");
const DAY_TEXT = /^([0-9]{1,2})\s+([A-Za-z]{3,9})\.?\s+([0-9]{1,4})(?:\/([0-9]{2}))?(\s+OS)?$/;
const LIFESPAN = new RegExp(
  `^(trad\\.\\s*)?(c\\.\\s*)?([0-9]{1,9})(?:\\s*${ERA})?\\s*-\\s*(?:(c\\.\\s*)?([0-9]{1,9})(?:\\s*${ERA})?)?$`,
  "i",
);
const PARENTHETICAL = /^(.*?)\s*\(([^()]+)\)$/;
const RANGE_SEPARATOR = /\s+[-\u2013]\s+/;
const COMPOSITE_NAME = /[A-Za-z]{2,}\s+[0-9]{1,9}\s*-/;

const fdiv = (a: number, b: number) => Math.floor(a / b);
const mod = (a: number, b: number) => a - b * fdiv(a, b);

function refuse(refusal: SpanRefusal, detail: string): Refused {
  return { ok: false, refusal, detail };
}

function isRefused<T extends object>(x: T | Refused): x is Refused {
  return (x as Refused).ok === false;
}

function isGregorianLeap(y: number): boolean {
  return mod(y, 4) === 0 && (mod(y, 100) !== 0 || mod(y, 400) === 0);
}

function isJulianLeap(y: number): boolean {
  return mod(y, 4) === 0;
}

function daysInMonth(year: number, month: number, julian: boolean): number {
  const leap = julian ? isJulianLeap(year) : isGregorianLeap(year);
  return month === 2 && leap ? 29 : MONTH_DAYS[month - 1];
}

export function julianOffsetDays(year: number, month: number): number {
  const y = month <= 2 ? year - 1 : year;
  return fdiv(y, 100) - fdiv(y, 400) - 2;
}

function toJdn(date: CalendarDate, julian: boolean): number {
  const a = fdiv(14 - date.month, 12);
  const y = date.year + 4800 - a;
  const m = date.month + 12 * a - 3;
  const base = date.day + fdiv(153 * m + 2, 5) + 365 * y + fdiv(y, 4);
  return julian ? base - 32083 : base - fdiv(y, 100) + fdiv(y, 400) - 32045;
}

function jdnToGregorian(jdn: number): CalendarDate {
  const a = jdn + 32044;
  const b = fdiv(4 * a + 3, 146097);
  const c = a - fdiv(146097 * b, 4);
  const d = fdiv(4 * c + 3, 1461);
  const e = c - fdiv(1461 * d, 4);
  const m = fdiv(5 * e + 2, 153);
  return {
    day: e - fdiv(153 * m + 2, 5) + 1,
    month: m + 3 - 12 * fdiv(m, 10),
    year: 100 * b + d - 4800 + fdiv(m, 10),
  };
}

export function julianToGregorian(date: CalendarDate): CalendarDate {
  return jdnToGregorian(toJdn(date, true));
}

export function gregorianDayNumber(date: CalendarDate): number {
  return toJdn(date, false);
}

export function historicalToAstronomical(year: number, bce: boolean): number {
  return bce ? 1 - year : year;
}

function formatYear(year: number): string | null {
  const abs = Math.abs(year);
  if (abs > MAX_ABS_YEAR) return null;
  if (abs >= 10000) return `Y${year}`;
  return `${year < 0 ? "-" : ""}${String(abs).padStart(4, "0")}`;
}

function formatDay(date: CalendarDate): string | null {
  const y = formatYear(date.year);
  if (y === null || y.startsWith("Y")) return null;
  return `${y}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function qualifierChar(flags: Flags): string {
  if (flags.approximate && flags.uncertain) return "%";
  if (flags.approximate) return "~";
  if (flags.uncertain) return "?";
  return "";
}

function flagsOf(char: string): Flags {
  return { approximate: char === "~" || char === "%", uncertain: char === "?" || char === "%" };
}

function widening(flags: Flags, precision: SpanPrecision): number {
  if (!flags.approximate) return 0;
  return precision === "day" || precision === "month" ? APPROXIMATE_YEARS_FINE : APPROXIMATE_YEARS;
}

function precisionOf(raw: RawDate): SpanPrecision {
  if (raw.width === 100) return "century";
  if (raw.width === 10) return "decade";
  if (raw.day !== null) return "day";
  if (raw.month !== null) return "month";
  return "year";
}

function rawRange(raw: RawDate): [number, number] {
  return [raw.year, raw.year + raw.width - 1];
}

function labelOf(raw: RawDate): string | null {
  if (raw.unspecified !== undefined) return raw.unspecified;
  const y = formatYear(raw.year);
  if (y === null) return null;
  if (raw.month === null) return y;
  const m = `${y}-${String(raw.month).padStart(2, "0")}`;
  return raw.day === null ? m : `${m}-${String(raw.day).padStart(2, "0")}`;
}

function parseComponent(text: string): RawDate | Refused {
  const m = COMPONENT.exec(text);
  if (!m) return refuse("syntax", `not in the supported EDTF subset: ${text}`);
  const flags = flagsOf(m[8]);
  if (m[1] !== undefined) return { year: Number(m[1]), month: null, day: null, width: 1, flags };
  if (m[2] !== undefined) {
    if (m[2] === "-0000") return refuse("syntax", "year -0000 is written 0000");
    return {
      year: Number(m[2]),
      month: m[3] === undefined ? null : Number(m[3]),
      day: m[4] === undefined ? null : Number(m[4]),
      width: 1,
      flags,
    };
  }
  const width = m[7] === "XX" ? 100 : 10;
  const lead = width === 100 ? Number(m[6]) * 100 : (Number(m[6]) * 10 + Number(m[7][0])) * 10;
  const year = m[5] === "-" ? -lead - width + 1 : lead;
  return { year, month: null, day: null, width, flags, unspecified: `${m[5]}${m[6]}${m[7]}` };
}

function validate(raw: RawDate, julian: boolean): Refused | null {
  if (raw.month === null) return null;
  if (raw.month < 1 || raw.month > 12) return refuse("impossible-date", `month ${raw.month} does not exist`);
  if (raw.day === null) return null;
  const max = daysInMonth(raw.year, raw.month, julian);
  if (raw.day < 1 || raw.day > max) {
    return refuse("impossible-date", `day ${raw.day} does not exist in month ${raw.month} of ${raw.year}`);
  }
  return null;
}

function endpointFromRaw(raw: RawDate, hint: CalendarHint): Endpoint | Refused {
  const julian = hint === "julian" || hint === "julian-os";
  const invalid = validate(raw, julian);
  if (invalid) return invalid;
  const precision = precisionOf(raw);
  const w = widening(raw.flags, precision);
  const [lo, hi] = rawRange(raw);
  const label = labelOf(raw);
  if (label === null) return refuse("out-of-range", `year ${raw.year} is outside int4 years`);
  const plain: Endpoint = { label, lo, hi, min: lo - w, max: hi + w, precision, calendar: "gregorian", flags: raw.flags };

  if (hint === "julian-os") {
    if (raw.day === null || raw.month === null) return refuse("calendar", "Old Style dates need day precision");
    return oldStyle({ year: raw.year, month: raw.month, day: raw.day }, null, raw.flags);
  }

  if (hint === "unknown") {
    if (raw.day === null || raw.month === null || raw.year >= GREGORIAN_ADOPTION_COMPLETE) return plain;
    const shifted = julianToGregorian({ year: raw.year, month: raw.month, day: raw.day }).year;
    return { ...plain, min: Math.min(lo, shifted) - w, max: Math.max(hi, shifted) + w };
  }

  if (hint === "gregorian") return plain;

  if (raw.day !== null && raw.month !== null) {
    const g = julianToGregorian({ year: raw.year, month: raw.month, day: raw.day });
    const glabel = formatDay(g);
    if (glabel === null) return refuse("out-of-range", `Julian date ${label} converts outside 4-digit years`);
    return { ...plain, label: glabel, lo: g.year, hi: g.year, min: g.year - w, max: g.year + w, calendar: "julian" };
  }
  const first = julianToGregorian({ year: lo, month: raw.month ?? 1, day: 1 });
  const lastMonth = raw.month ?? 12;
  const last = julianToGregorian({ year: hi, month: lastMonth, day: daysInMonth(hi, lastMonth, true) });
  return { ...plain, min: Math.min(lo, first.year) - w, max: Math.max(hi, last.year) + w, calendar: "julian" };
}

function oldStyle(date: CalendarDate, dual: number | null, flags: Flags): Endpoint | Refused {
  const beforeLadyDay = date.month < 3 || (date.month === 3 && date.day <= 24);
  if (date.year > OLD_STYLE_LAST_YEAR || (date.year === OLD_STYLE_LAST_YEAR && (date.month > 9 || (date.month === 9 && date.day > 2)))) {
    return refuse("calendar", `Old Style ends on 2 September ${OLD_STYLE_LAST_YEAR}`);
  }
  let candidates: number[];
  if (dual !== null) {
    if (!beforeLadyDay) return refuse("calendar", "a dual year applies only from 1 January to 24 March");
    if (mod(date.year + 1, 100) !== dual) return refuse("inconsistent", `dual year ${date.year}/${dual} is not consecutive`);
    candidates = [date.year + 1];
  } else if (beforeLadyDay && date.year < OLD_STYLE_LAST_YEAR) {
    candidates = [date.year, date.year + 1];
  } else {
    candidates = [date.year];
  }
  const labelYear = candidates[0];
  const conversions: CalendarDate[] = [];
  for (const year of candidates) {
    const raw: RawDate = { year, month: date.month, day: date.day, width: 1, flags };
    const invalid = validate(raw, true);
    if (invalid) return invalid;
    conversions.push(julianToGregorian({ year, month: date.month, day: date.day }));
  }
  const primary = conversions[0];
  const label = formatDay(primary);
  if (label === null) return refuse("out-of-range", "Old Style date outside 4-digit years");
  const years = [labelYear, ...conversions.map((c) => c.year)];
  const w = widening(flags, "day");
  return {
    label,
    lo: primary.year,
    hi: primary.year,
    min: Math.min(...years) - w,
    max: Math.max(...years) + w,
    precision: "day",
    calendar: "julian-os",
    flags,
  };
}

function coarser(a: SpanPrecision, b: SpanPrecision): SpanPrecision {
  return SPAN_PRECISIONS.indexOf(a) >= SPAN_PRECISIONS.indexOf(b) ? a : b;
}

function combineQualifier(a: Flags, b: Flags): SpanQualifier {
  const approximate = a.approximate || b.approximate;
  const uncertain = a.uncertain || b.uncertain;
  if (approximate && uncertain) return "both";
  if (approximate) return "approximate";
  if (uncertain) return "uncertain";
  return "none";
}

function uncertaintyOf(s: Omit<Span, "uncertainty">): SpanUncertainty {
  if (s.start_min === s.start_max && s.end_min === s.end_max) return { kind: "point", params: {} };
  return {
    kind: "uniform",
    params: { min: s.start_min, max: s.end_max, endpoints: { start: [s.start_min, s.start_max], end: [s.end_min, s.end_max] } },
  };
}

function build(a: Endpoint, b: Endpoint, single: boolean, precision?: SpanPrecision): SpanResult {
  if (a.calendar !== b.calendar) return refuse("calendar", "interval endpoints use different calendars");
  const edtf = single ? `${a.label}${qualifierChar(a.flags)}` : `${a.label}${qualifierChar(a.flags)}/${b.label}${qualifierChar(b.flags)}`;
  const fields = {
    edtf,
    start_year: a.lo,
    end_year: b.hi,
    start_min: a.min,
    start_max: a.max,
    end_min: b.min,
    end_max: b.max,
    precision: precision ?? coarser(a.precision, b.precision),
    calendar: a.calendar,
    qualifier: combineQualifier(a.flags, b.flags),
  };
  if (
    fields.start_year > fields.end_year ||
    fields.start_min > fields.end_min ||
    fields.start_max > fields.end_max ||
    fields.start_min > fields.start_year ||
    fields.start_year > fields.start_max ||
    fields.end_min > fields.end_year ||
    fields.end_year > fields.end_max
  ) {
    return refuse("reversed", `interval ends before it starts: ${edtf}`);
  }
  if (!EDTF_SUBSET.test(edtf)) throw new Error(`span emitted EDTF outside the subset: ${edtf}`);
  const clean = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, Object.is(v, -0) ? 0 : v])) as typeof fields;
  return { ok: true, span: { ...clean, uncertainty: uncertaintyOf(clean) } };
}

function fromEndpoint(e: Endpoint | Refused): SpanResult {
  return isRefused(e) ? e : build(e, e, true);
}

export function parseEdtf(text: string, options: SpanOptions = {}): SpanResult {
  const hint = options.calendar ?? "unknown";
  const trimmed = text.trim();
  if (trimmed === "") return refuse("syntax", "empty");
  const parts = trimmed.split("/");
  if (parts.length > 2) return refuse("syntax", `more than one slash: ${trimmed}`);
  if (parts.length === 2 && parts.some((p) => p === "" || p === ".." || p === "?")) {
    return refuse("open-interval", `open or unknown ends stay in silver: ${trimmed}`);
  }
  const ends: Endpoint[] = [];
  for (const part of parts) {
    const raw = parseComponent(part);
    if (isRefused(raw)) return raw;
    const e = endpointFromRaw(raw, hint);
    if (isRefused(e)) return e;
    ends.push(e);
  }
  return ends.length === 1 ? build(ends[0], ends[0], true) : build(ends[0], ends[1], false);
}

export function parseYear(year: number, convention: YearConvention): SpanResult {
  if (!Number.isInteger(year)) return refuse("syntax", `not an integer year: ${year}`);
  if (convention === "historical" && year === 0) return refuse("out-of-range", "historical years have no year 0");
  const astronomical = convention === "historical" && year < 0 ? year + 1 : year;
  if (Math.abs(astronomical) > MAX_ABS_YEAR) return refuse("out-of-range", `year ${year} is outside int4 years`);
  return fromEndpoint(endpointFromRaw({ year: astronomical, month: null, day: null, width: 1, flags: NO_FLAGS }, "gregorian"));
}

function prefixFlags(text: string): { rest: string; flags: Flags } {
  const m = TEXT_PREFIX.exec(text)!;
  return { rest: text.slice(m[0].length), flags: { approximate: m[2] !== undefined, uncertain: m[1] !== undefined } };
}

function isBce(era: string | undefined): boolean {
  return era !== undefined && era.toUpperCase().startsWith("B");
}

function ordinalSuffix(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

function yearEndpoint(value: number, bce: boolean, flags: Flags): Endpoint | Refused {
  if (value < 1) return refuse("out-of-range", "historical years start at 1");
  const year = historicalToAstronomical(value, bce);
  if (Math.abs(year) > MAX_ABS_YEAR) return refuse("out-of-range", `year ${value} is outside int4 years`);
  return endpointFromRaw({ year, month: null, day: null, width: 1, flags }, "gregorian");
}

function parseCentury(n: number, suffix: string, era: string | undefined, flags: Flags): SpanResult {
  if (n < 1) return refuse("out-of-range", "centuries start at 1");
  if (suffix.toLowerCase() !== ordinalSuffix(n)) return refuse("syntax", `bad ordinal ${n}${suffix}`);
  const bce = isBce(era);
  const first = bce ? historicalToAstronomical(n * 100, true) : (n - 1) * 100 + 1;
  const last = bce ? historicalToAstronomical((n - 1) * 100 + 1, true) : n * 100;
  const a = endpointFromRaw({ year: first, month: null, day: null, width: 1, flags }, "gregorian");
  if (isRefused(a)) return a;
  const b = endpointFromRaw({ year: last, month: null, day: null, width: 1, flags }, "gregorian");
  if (isRefused(b)) return b;
  return build(a, b, false, "century");
}

function parseDayText(m: RegExpExecArray, flags: Flags, options: SpanOptions): SpanResult {
  const month = MONTH_NAMES.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
  if (month === 0 || !MONTH_NAMES.some((name) => m[2].toLowerCase().startsWith(name))) {
    return refuse("syntax", `unknown month ${m[2]}`);
  }
  const date = { year: Number(m[3]), month, day: Number(m[1]) };
  if (date.year < 1) return refuse("out-of-range", "day dates start at year 1");
  const dual = m[4] === undefined ? null : Number(m[4]);
  if (dual !== null || m[5] !== undefined || options.calendar === "julian-os") {
    return fromEndpoint(oldStyle(date, dual, flags));
  }
  const raw: RawDate = { ...date, width: 1, flags };
  return fromEndpoint(endpointFromRaw(raw, options.calendar ?? "unknown"));
}

export function parseSpan(text: string, options: SpanOptions = {}): SpanResult {
  const trimmed = text.trim();
  if (trimmed === "") return refuse("syntax", "empty");
  const { rest, flags } = prefixFlags(trimmed);
  const prefixed = rest !== trimmed;

  const century = CENTURY.exec(rest);
  if (century) return parseCentury(Number(century[1]), century[2], century[3], flags);

  const day = DAY_TEXT.exec(rest);
  if (day) return parseDayText(day, flags, options);

  const era = ERA_YEAR.exec(rest);
  if (era && (era[2] !== undefined || era[3] !== undefined || prefixed)) {
    const value = Number(era[1] ?? era[4]);
    return fromEndpoint(yearEndpoint(value, isBce(era[2]), flags));
  }

  if (prefixed) return refuse("syntax", `unreadable date after a prefix: ${trimmed}`);
  return parseEdtf(trimmed, options);
}

function outside(text: string): string {
  const m = PARENTHETICAL.exec(text);
  return m ? m[1] : text;
}

export function parseLifespan(text: string, options: SpanOptions = {}): LifespanResult {
  const trimmed = text.trim();
  if (trimmed === "") return refuse("syntax", "empty");
  const main = outside(trimmed);
  if (main.includes(",") || COMPOSITE_NAME.test(main.replace(TEXT_PREFIX, ""))) {
    return refuse("composite", `more than one subject: ${trimmed}`);
  }

  const paren = PARENTHETICAL.exec(trimmed);
  if (paren) return parseParenthetical(paren[1], paren[2], options);

  const { rest } = prefixFlags(trimmed);
  if (CENTURY.test(rest)) {
    const flourished = parseSpan(trimmed, options);
    return flourished.ok ? { ok: true, roles: { flourished: flourished.span } } : flourished;
  }

  const m = LIFESPAN.exec(trimmed);
  if (!m) return refuse("syntax", `not a lifespan: ${trimmed}`);
  const uncertain = m[1] !== undefined;
  const bornEra = m[4] ?? m[7];
  const diedEra = m[7] ?? m[4];
  const born = fromEndpoint(yearEndpoint(Number(m[3]), isBce(bornEra), { approximate: m[2] !== undefined, uncertain }));
  if (!born.ok) return born;
  if (m[6] === undefined) return { ok: true, roles: { born: born.span } };
  const died = fromEndpoint(yearEndpoint(Number(m[6]), isBce(diedEra), { approximate: m[5] !== undefined, uncertain }));
  if (!died.ok) return died;
  if (died.span.start_year < born.span.start_year) return refuse("reversed", `death before birth: ${trimmed}`);
  return { ok: true, roles: { born: born.span, died: died.span } };
}

function parseParenthetical(main: string, inner: string, options: SpanOptions): LifespanResult {
  const outer = LIFESPAN.exec(main.trim());
  const parts = inner.split(RANGE_SEPARATOR);
  if (!outer || outer[6] === undefined || parts.length !== 2) return refuse("syntax", `unreadable lifespan: ${main} (${inner})`);
  const born = parseSpan(parts[0], options);
  if (!born.ok) return born;
  const died = parseSpan(parts[1], options);
  if (!died.ok) return died;
  const bornLabel = historicalToAstronomical(Number(outer[3]), isBce(outer[4] ?? outer[7]));
  const diedLabel = historicalToAstronomical(Number(outer[6]), isBce(outer[7] ?? outer[4]));
  const holds = (s: Span, y: number) => s.start_min <= y && y <= s.end_max;
  if (!holds(born.span, bornLabel) || !holds(died.span, diedLabel)) {
    return refuse("inconsistent", `parenthetical dates disagree with ${main.trim()}`);
  }
  if (died.span.start_year < born.span.start_year) return refuse("reversed", "death before birth");
  return { ok: true, roles: { born: born.span, died: died.span } };
}

export const WIKIDATA_GREGORIAN = "Q1985727";
export const WIKIDATA_JULIAN = "Q1985786";
export const WIKIDATA_PRECISIONS: Record<number, SpanPrecision> = {
  11: "day",
  10: "month",
  9: "year",
  8: "decade",
  7: "century",
  6: "millennium",
  5: "10ka",
  4: "100ka",
};

export interface WikidataTime {
  time: string;
  precision: number;
  calendar: string;
  source?: "rdf" | "json";
}

const WIKIDATA_TIME = /^([+-]?)([0-9]{1,16})-([0-9]{2})-([0-9]{2})T/;

function yearEndpointAt(year: number): Endpoint | Refused {
  return endpointFromRaw({ year, month: null, day: null, width: 1, flags: NO_FLAGS }, "gregorian");
}

function windowSpan(first: number, last: number, precision: SpanPrecision, calendar: SpanCalendar): SpanResult {
  if (Math.abs(first) > MAX_ABS_YEAR || Math.abs(last) > MAX_ABS_YEAR) return refuse("out-of-range", `window ${first} to ${last} is outside int4 years`);
  const a = yearEndpointAt(first);
  if (isRefused(a)) return a;
  const b = yearEndpointAt(last);
  if (isRefused(b)) return b;
  const r = build(a, b, false, precision);
  return r.ok ? { ok: true, span: { ...r.span, calendar } } : r;
}

function ordinalWindow(year: number, unit: number): [number, number] {
  if (year >= 1) {
    const n = Math.ceil(year / unit);
    return [(n - 1) * unit + 1, n * unit];
  }
  const n = Math.ceil((1 - year) / unit);
  return [1 - n * unit, -(n - 1) * unit];
}

function centredWindow(year: number, unit: number): [number, number] {
  return [year - unit / 2, year + unit / 2 - 1];
}

export function fromWikidata(value: WikidataTime): SpanResult {
  const precision = WIKIDATA_PRECISIONS[value.precision];
  if (!precision) return refuse("out-of-range", `Wikidata precision ${value.precision} is coarser than 100,000 years or unknown`);
  const model = value.calendar.split("/").pop() ?? "";
  if (model !== WIKIDATA_GREGORIAN && model !== WIKIDATA_JULIAN) return refuse("calendar", `calendar model ${value.calendar} is neither Gregorian nor Julian`);
  const calendar: SpanCalendar = model === WIKIDATA_JULIAN ? "julian" : "gregorian";
  const m = WIKIDATA_TIME.exec(value.time.trim());
  if (!m) return refuse("syntax", `not a Wikidata time value: ${value.time}`);
  const source = value.source ?? "rdf";
  const signed = Number(m[2]) * (m[1] === "-" ? -1 : 1);
  if (source === "json" && signed === 0) return refuse("impossible-date", "Wikidata JSON has no year 0");
  const year = source === "json" && signed < 0 ? signed + 1 : signed;
  const month = Number(m[3]);
  const day = Number(m[4]);

  if (precision === "day" || precision === "month" || precision === "year") {
    if (Math.abs(year) > 9999) return refuse("out-of-range", `${precision} precision needs a 4-digit year, got ${year}`);
    const raw: RawDate = {
      year,
      month: precision === "year" ? null : month,
      day: precision === "day" ? day : null,
      width: 1,
      flags: NO_FLAGS,
    };
    const hint: CalendarHint = source === "json" && calendar === "julian" ? "julian" : "gregorian";
    const r = fromEndpoint(endpointFromRaw(raw, hint));
    return r.ok ? { ok: true, span: { ...r.span, calendar } } : r;
  }
  if (precision === "decade") {
    const first = fdiv(year, 10) * 10;
    return windowSpan(first, first + 9, "decade", calendar);
  }
  if (precision === "century") return windowSpan(...ordinalWindow(year, 100), "century", calendar);
  if (precision === "millennium") {
    if (Math.abs(year) > 9999) return windowSpan(...centredWindow(year, 1000), "ka", calendar);
    return windowSpan(...ordinalWindow(year, 1000), "millennium", calendar);
  }
  if (precision === "10ka") return windowSpan(...centredWindow(year, 10000), "10ka", calendar);
  return windowSpan(...centredWindow(year, 100000), "100ka", calendar);
}
