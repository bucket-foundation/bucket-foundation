import data from "../../../brand/flag-tiles/client-catalog.json";
import {
  flagAssets,
  iconAssets,
  illustrationAssets,
  photoAssets,
} from "./assets";

export type FlagMaterial =
  | "ceramic"
  | "lacquer"
  | "textile"
  | "enamel"
  | "glass"
  | "terracotta";
export type FlagPattern =
  | "grid"
  | "stripe"
  | "diamond"
  | "wave"
  | "dot"
  | "plain";

export interface FlagCraft {
  title: string;
  region: string;
  material: FlagMaterial;
  accent: string;
  pattern: FlagPattern;
  summary: string;
  sourceUrl: string;
  nativeLabel?: string;
  languageLabel?: string;
  fontFamily?: string;
  lang?: string;
  direction?: "rtl" | "ltr";
  iconDataUri?: string;
  imageDataUri?: string;
  imageAlt?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
  imageLicense?: string;
}

export interface FlagCountry {
  code: string;
  name: string;
  aspectRatio: number;
  svgDataUri: string;
  flagNote?: string;
  craft?: FlagCraft;
}

export interface FlagCatalog {
  version: string | number;
  source: { name: string; url: string; license: string; revision: string };
  countries: FlagCountry[];
}

type ClientCountry = Omit<FlagCountry, "svgDataUri" | "craft"> & {
  craft?: Omit<FlagCraft, "iconDataUri" | "imageDataUri">;
};

const metadata = data as Omit<FlagCatalog, "countries"> & {
  countries: ClientCountry[];
};

export const flagCatalog: FlagCatalog = {
  ...metadata,
  countries: metadata.countries.map((country) => ({
    ...country,
    svgDataUri: flagAssets[country.code].src,
    ...(country.craft
      ? {
          craft: {
            ...country.craft,
            iconDataUri: iconAssets[country.code]?.src,
            imageDataUri: (
              photoAssets[country.code] ?? illustrationAssets[country.code]
            )?.src,
          },
        }
      : {}),
  })),
};
export const flagCountries = flagCatalog.countries;
