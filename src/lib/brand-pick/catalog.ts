export const DIRECTION_IDS = ["d1", "d2", "d3", "d4", "d5", "d6", "d7"] as const;
export type DirectionId = (typeof DIRECTION_IDS)[number];

export const ASPECT_IDS = ["overall", "logo", "landing", "app", "motion", "game", "type"] as const;
export type AspectId = (typeof ASPECT_IDS)[number];

export interface Palette {
  bg: string;
  surf: string;
  text: string;
  muted: string;
  acc: string;
  onacc: string;
  hl: string;
}

export interface Direction {
  id: DirectionId;
  name: string;
  movement: string;
  system: string;
  pitch: string;
  display: string;
  body: string;
  palette: Palette;
}

export const DIRECTIONS: Record<DirectionId, Direction> = {
  d1: {
    id: "d1",
    name: "Grid",
    movement: "Swiss International Style",
    system: "IBM Carbon",
    pitch: "Bucket as a reference work. Flush-left type on a 16-column grid, one blue for action.",
    display: "IBM Plex Sans",
    body: "IBM Plex Sans",
    palette: { bg: "#FFFFFF", surf: "#F4F4F4", text: "#161616", muted: "#525252", acc: "#0F62FE", onacc: "#FFFFFF", hl: "#DA1E28" },
  },
  d2: {
    id: "d2",
    name: "Kamon",
    movement: "Japanese mon crests and ukiyo-e",
    system: "Apple HIG",
    pitch: "Each canon branch and each language gets a crest. Indigo and sumi on washi, vermilion for the seal.",
    display: "Shippori Mincho",
    body: "Zen Kaku Gothic New",
    palette: { bg: "#F4EFE4", surf: "#FBF8F1", text: "#1C1C1C", muted: "#5A5148", acc: "#1F3A5F", onacc: "#F4EFE4", hl: "#B8341B" },
  },
  d3: {
    id: "d3",
    name: "Squiggle",
    movement: "Memphis Group",
    system: "Duolingo",
    pitch: "Loud and toy-like, serious about the work. Polingual as a game you open on the bus.",
    display: "Fredoka",
    body: "Nunito",
    palette: { bg: "#FFF8E7", surf: "#FFFFFF", text: "#2B2B2B", muted: "#5E5A52", acc: "#58CC02", onacc: "#173600", hl: "#FF4B91" },
  },
  d4: {
    id: "d4",
    name: "Wedge",
    movement: "Soviet constructivism",
    system: "Material Design 3",
    pitch: "Knowledge as construction. A hot-red wedge cuts a black field, type stacks in condensed caps.",
    display: "Oswald",
    body: "Roboto Flex",
    palette: { bg: "#141414", surf: "#222222", text: "#EFE6D2", muted: "#B5AC9A", acc: "#E3242B", onacc: "#FFFFFF", hl: "#EFE6D2" },
  },
  d5: {
    id: "d5",
    name: "Girih",
    movement: "Islamic geometric tiling",
    system: "Microsoft Fluent 2",
    pitch: "Foundations as pattern. One compass, one ruler, infinite tiling. Cobalt night, turquoise glaze.",
    display: "Reem Kufi",
    body: "Noto Sans",
    palette: { bg: "#0B2A5B", surf: "#123873", text: "#F5F7FA", muted: "#C3CEE2", acc: "#3FC1C9", onacc: "#062027", hl: "#F2C14E" },
  },
  d6: {
    id: "d6",
    name: "Primitive",
    movement: "Bauhaus",
    system: "Teenage Engineering",
    pitch: "Circle, square, triangle, and a knob. Bucket as an instrument you play.",
    display: "Jost",
    body: "Jost",
    palette: { bg: "#D9D6CF", surf: "#EDEBE6", text: "#111111", muted: "#3F3D39", acc: "#FF5F00", onacc: "#111111", hl: "#1D4ED8" },
  },
  d7: {
    id: "d7",
    name: "Euclid",
    movement: "Attic red-figure, stoichedon and Byrne's Euclid",
    system: "Wikimedia Codex",
    pitch: "The Greek polymath's notebook. Terracotta and black from Attic vases, Byrne's colored proofs.",
    display: "GFS Didot",
    body: "Gentium Book Plus",
    palette: { bg: "#F3EEE3", surf: "#FBF8F1", text: "#1A1714", muted: "#5B5148", acc: "#A6442A", onacc: "#FFFFFF", hl: "#1E4F94" },
  },
};

export interface Aspect {
  id: AspectId;
  label: string;
  question: string;
}

export const ASPECTS: Record<AspectId, Aspect> = {
  overall: { id: "overall", label: "overall", question: "Which one feels more like Bucket?" },
  logo: { id: "logo", label: "logo and mark", question: "Which logo and mark do you like better?" },
  landing: { id: "landing", label: "landing page", question: "Which landing page do you like better?" },
  app: { id: "app", label: "app screens", question: "Which app screens do you like better?" },
  motion: { id: "motion", label: "motion and video", question: "Which motion do you like better?" },
  game: { id: "game", label: "gamification", question: "Which game layer do you like better?" },
  type: { id: "type", label: "type and color", question: "Which type and color do you like better?" },
};

export interface Media {
  kind: "image" | "video";
  src: string;
  alt: string;
  poster?: string;
}

const BASE = "/brand/directions";

export function mediaFor(aspect: AspectId, id: DirectionId): Media[] {
  const name = DIRECTIONS[id].name;
  switch (aspect) {
    case "overall":
      return [{ kind: "image", src: `${BASE}/3d/${id}-object.jpg`, alt: `${name} hero object` }];
    case "logo":
      return [
        { kind: "image", src: `${BASE}/logos/${id}-mho.svg`, alt: `${name} mark` },
        { kind: "image", src: `${BASE}/logos/${id}-glyph.svg`, alt: `${name} glyph` },
      ];
    case "landing":
      return [{ kind: "image", src: `${BASE}/pages/${id}/thumbs/landing-1440.png`, alt: `${name} landing page` }];
    case "app":
      return [
        { kind: "image", src: `${BASE}/pages/${id}/thumbs/app-learn-1440.png`, alt: `${name} learn screen` },
        { kind: "image", src: `${BASE}/screens/thumbs/${id}-search.png`, alt: `${name} search screen` },
      ];
    case "motion":
      return [{ kind: "video", src: `${BASE}/video/${id}-16x9.mp4`, poster: `${BASE}/video/${id}-frame-1.jpg`, alt: `${name} motion reel` }];
    case "game":
      return [
        { kind: "image", src: `${BASE}/pages/${id}/thumbs/game-celebrate-1440.png`, alt: `${name} celebration screen` },
        { kind: "image", src: `${BASE}/pages/${id}/thumbs/game-badges-1440.png`, alt: `${name} badges screen` },
      ];
    case "type":
      return [{ kind: "image", src: `${BASE}/pages/${id}/thumbs/names-1440.png`, alt: `${name} type in use` }];
  }
}

export function isDirectionId(v: unknown): v is DirectionId {
  return typeof v === "string" && (DIRECTION_IDS as readonly string[]).includes(v);
}

export function isAspectId(v: unknown): v is AspectId {
  return typeof v === "string" && (ASPECT_IDS as readonly string[]).includes(v);
}
