export const SPACE_VIEWS = ["circle", "slices", "cylinder", "sphere", "sphere-time"] as const;
export type SpaceViewId = (typeof SPACE_VIEWS)[number];
