export const SPACE_VIEWS = ["circle", "slices"] as const;
export type SpaceViewId = (typeof SPACE_VIEWS)[number];
