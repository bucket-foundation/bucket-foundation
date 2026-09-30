export const SPACE_VIEWS = ["circle", "slices", "cylinder", "sphere", "sphere-time", "helicoid", "globe", "earth"] as const;
export type SpaceViewId = (typeof SPACE_VIEWS)[number];
