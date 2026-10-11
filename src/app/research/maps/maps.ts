export type MapEntry = { slug: string; title: string; line: string };

export const MAPS: MapEntry[] = [
  { slug: "edtech", title: "Edtech market map", line: "187 learning products in 11 categories, each with its logo and its efficacy evidence." },
  { slug: "coverage", title: "Knowledge coverage map", line: "Every CIP 2020 major family and SOC 2018 career group, coloured by what the corpus holds." },
  { slug: "progressions", title: "Progression graphs", line: "Prerequisite graphs for mathematics and for data structures and algorithms." },
  { slug: "flow", title: "Major to career flow", line: "The 5,723 crosswalk links from CIP series to SOC major groups." },
  { slug: "occupations-history", title: "Occupations through time", line: "Employment share by major occupation group across the years held, and occupations born, peaking and ending." },
  { slug: "technology-waves", title: "Technology waves", line: "Fourteen waves, the work each made and ended, and the lag to peak employment and to training." },
  { slug: "completeness", title: "Completeness", line: "The critic's seven dimensions as a heatmap of verified rows, with the overall score." },
  { slug: "school-map", title: "School map", line: "Subject by grade in 15 school systems, and the 42 AP courses sized by units." },
  { slug: "lifespan", title: "Learning across a life", line: "What a person learns from birth to old age, by kind of knowing." },
  { slug: "evidence-market", title: "Evidence against market", line: "Products by level and learning methods by evidence grade, against controlled studies." },
  { slug: "forecast-backtest", title: "Forecast backtest", line: "The damped trend forecast against no change and against BLS at four origins." },
];
