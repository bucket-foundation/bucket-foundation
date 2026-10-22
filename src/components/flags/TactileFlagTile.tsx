import type { FlagCountry, FlagMaterial, FlagPattern } from "./catalog";
import styles from "./flags.module.css";

export interface TactileFlagTileProps {
  country: FlagCountry;
  material?: FlagMaterial;
  pattern?: FlagPattern;
  accent?: string;
  decorative?: boolean;
  eager?: boolean;
  className?: string;
}

export default function TactileFlagTile({
  country,
  material = "ceramic",
  pattern = "plain",
  accent,
  decorative = false,
  eager = false,
  className = "",
}: TactileFlagTileProps) {
  return (
    <span
      className={`${styles.tile} ${className}`}
      data-material={material}
      data-pattern={pattern}
      style={{ color: "inherit", ...(accent ? { "--flag-accent": accent } : {}) }}
    >
      <span className={styles.tileFace}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={country.svgDataUri}
          alt={decorative ? "" : `Flag of ${country.name}`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className={styles.flag}
        />
      </span>
      <span className={styles.tileMark} aria-hidden="true">
        {country.code.toUpperCase()}
      </span>
    </span>
  );
}
