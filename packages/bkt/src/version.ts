import pkg from "../package.json" with { type: "json" };

declare const BKT_BUILD_VERSION: string | undefined;

export const VERSION: string = typeof BKT_BUILD_VERSION === "string" ? BKT_BUILD_VERSION : pkg.version;
