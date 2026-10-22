"use client";

import { useMemo, useRef, useState } from "react";
import {
  flagCatalog,
  flagCountries,
  type FlagCountry,
  type FlagMaterial,
} from "./catalog";
import TactileFlagTile from "./TactileFlagTile";
import "./fonts.css";
import styles from "./flags.module.css";
import "../../../brand/flag-tiles/tokens.css";

const STUDY_ORDER = [
  "JP",
  "PT",
  "MX",
  "IN",
  "GH",
  "IT",
  "MA",
  "KR",
  "CN",
  "FR",
  "TR",
  "PE",
  "ID",
  "SE",
  "GB",
  "US",
];
const HERO_CODES = ["JP", "PT", "MX", "GH"];
const MATERIALS: { value: FlagMaterial; label: string }[] = [
  { value: "ceramic", label: "Ceramic" },
  { value: "lacquer", label: "Lacquer" },
  { value: "textile", label: "Textile" },
  { value: "enamel", label: "Enamel" },
  { value: "glass", label: "Glass" },
  { value: "terracotta", label: "Terracotta" },
];

const studyRank = (country: FlagCountry) => {
  const at = STUDY_ORDER.indexOf(country.code.toUpperCase());
  return at < 0 ? STUDY_ORDER.length : at;
};

const folded = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en");

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function FlagGallery({
  product = "bucket",
}: {
  product?: "bucket" | "polingual";
}) {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<"curated" | "all">("curated");
  const [surface, setSurface] = useState<"universal" | "craft">("craft");
  const [material, setMaterial] = useState<FlagMaterial>("ceramic");
  const [selectedCode, setSelectedCode] = useState("JP");
  const detailRef = useRef<HTMLElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const curatedCount = flagCountries.filter((country) => country.craft).length;
  const selected =
    flagCountries.find(
      (country) => country.code.toUpperCase() === selectedCode,
    ) ?? flagCountries[0];
  const hero = HERO_CODES.map((code) =>
    flagCountries.find((country) => country.code.toUpperCase() === code),
  ).filter((country): country is FlagCountry => Boolean(country));
  const countries = useMemo(() => {
    const term = folded(query.trim());
    return flagCountries
      .filter(
        (country) =>
          (collection === "all" || country.craft) &&
          (!term ||
            folded(country.name).includes(term) ||
            country.code.toLowerCase().includes(term)),
      )
      .sort((a, b) =>
        collection === "curated"
          ? studyRank(a) - studyRank(b) || a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name),
      );
  }, [query, collection]);

  const tileProps = (country: FlagCountry) =>
    surface === "craft" && country.craft
      ? {
          material: country.craft.material,
          pattern: country.craft.pattern,
          accent: country.craft.accent,
        }
      : { material: surface === "craft" ? ("ceramic" as const) : material };

  const selectCountry = (country: FlagCountry) => {
    setSelectedCode(country.code.toUpperCase());
    if (detailRef.current) detailRef.current.scrollTop = 0;
    requestAnimationFrame(() => detailHeadingRef.current?.focus({ preventScroll: true }));
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 900px)").matches
    ) {
      detailRef.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
  };

  if (!selected)
    return (
      <main className={styles.page}>
        <p>The flag collection is being prepared.</p>
      </main>
    );

  const selectedMaterial = tileProps(selected).material;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.masthead} aria-label="Flag collection">
          <a href="/" className={styles.wordmark}>
            {product === "polingual" ? "polingual" : "bucket"}
            <span>.</span>
          </a>
          <span className={styles.mastheadTitle}>THE FLAG ATELIER</span>
          <a href="#collection" className={styles.mastheadLink}>
            Explore the collection <Arrow />
          </a>
        </nav>

        <section className={styles.hero} aria-labelledby="flag-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.statusDot} /> OBJECTS OF THE WORLD
            </p>
            <h1 id="flag-title">
              A world
              <br />
              you can <em>hold.</em>
            </h1>
            <p className={styles.heroLead}>Country flags, made tangible.</p>
            <p className={styles.heroText}>
              Small objects with a sense of place. Explore the materials and
              regional craft traditions behind each frame.
            </p>
            <a href="#collection" className={styles.heroLink}>
              Find your place <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className={styles.heroScene}>
            <span className={styles.sceneRing} />
            <span className={styles.sceneCross}>+</span>
            {hero.map((country, index) => (
              <button
                type="button"
                aria-label={`View ${country.name} craft study`}
                onClick={() => {
                  selectCountry(country);
                  document.getElementById("collection")?.scrollIntoView({ block: "start", behavior: "auto" });
                }}
                key={country.code}
                className={`${styles.heroObject} ${styles[`heroObject${index}`]}`}
              >
                <TactileFlagTile
                  country={country}
                  {...tileProps(country)}
                  decorative
                  eager
                />
              </button>
            ))}
            <span className={styles.sceneLabel}>
              A SMALL STUDY IN BELONGING
            </span>
            <span className={styles.sceneNumber}>01 / WORLD COLLECTION</span>
          </div>
        </section>

        <div className={styles.collectionIntro} id="collection">
          <div>
            <p className={styles.eyebrow}>THE COLLECTION</p>
            <h2>Every place has a texture.</h2>
          </div>
          <p>
            {flagCountries.length} countries and territories.
            <br />
            <span>One shared tile language.</span>
          </p>
        </div>

        <section className={styles.controls} aria-label="Collection controls">
          <div className={styles.controlTop}>
            <div
              className={styles.tabs}
              role="group"
              aria-label="Collection filter"
            >
              <button
                type="button"
                aria-pressed={collection === "curated"}
                onClick={() => {
                  setCollection("curated");
                  setQuery("");
                }}
              >
                Craft studies <span>{curatedCount}</span>
              </button>
              <button
                type="button"
                aria-pressed={collection === "all"}
                onClick={() => setCollection("all")}
              >
                All places <span>{flagCountries.length}</span>
              </button>
            </div>
            <label className={styles.search}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m15.5 15.5 5 5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (event.target.value.trim()) setCollection("all");
                }}
                placeholder="Find a country or code"
                aria-label="Search countries and territories"
              />
            </label>
          </div>
          <div className={styles.controlBottom}>
            <div
              className={styles.surfaceControl}
              role="group"
              aria-label="Tile finish"
            >
              <span className={styles.controlLabel}>FINISH</span>
              <button
                type="button"
                aria-pressed={surface === "craft"}
                onClick={() => setSurface("craft")}
              >
                <span className={styles.craftSwatch} /> Local craft
              </button>
              <button
                type="button"
                aria-pressed={surface === "universal"}
                onClick={() => setSurface("universal")}
              >
                <span className={styles.ceramicSwatch} /> Studio finish
              </button>
            </div>
            {surface === "universal" ? (
              <label className={styles.materialSelect}>
                <span className={styles.srOnly}>Studio material</span>
                <select
                  aria-label="Studio material"
                  value={material}
                  onChange={(event) =>
                    setMaterial(event.target.value as FlagMaterial)
                  }
                >
                  {MATERIALS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className={styles.finishNote}>
                Craft on the frame. The flag keeps its form.
              </p>
            )}
          </div>
        </section>

        <div className={styles.workspace}>
          <section
            className={styles.collection}
            aria-label="Country and territory tiles"
          >
            <div className={styles.resultsLine}>
              <p role="status" aria-live="polite">
                {countries.length} {countries.length === 1 ? "place" : "places"}
                {query.trim() ? ` matching “${query.trim()}”` : " to explore"}
              </p>
              <span>SELECT A TILE TO LOOK CLOSER</span>
            </div>
            {countries.length ? (
              <div className={styles.grid}>
                {countries.map((country) => (
                  <button
                    type="button"
                    key={country.code}
                    aria-label={`Explore ${country.name}`}
                    aria-pressed={selectedCode === country.code.toUpperCase()}
                    aria-controls="selected-flag-detail"
                    onClick={() => selectCountry(country)}
                    className={styles.countryButton}
                  >
                    <span className={styles.tileStage}>
                      <TactileFlagTile
                        country={country}
                        {...tileProps(country)}
                        decorative
                      />
                      <span className={styles.selectionMark} aria-hidden="true">
                        ↗
                      </span>
                    </span>
                    {country.craft?.nativeLabel && (
                      <span className={styles.culturalLabel}>
                        <span
                          lang={country.craft.lang}
                          dir={country.craft.direction}
                          style={{
                            fontFamily: `${country.craft.fontFamily ?? "Georgia"}, serif`,
                          }}
                        >
                          {country.craft.nativeLabel}
                        </span>
                        {country.craft.iconDataUri && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={country.craft.iconDataUri}
                            alt=""
                            width={23}
                            height={23}
                          />
                        )}
                      </span>
                    )}
                    <span className={styles.countryLabel}>
                      {country.name}
                      <span>{country.code.toUpperCase()}</span>
                    </span>
                    <span className={styles.countryMaterial}>
                      {surface === "craft" && country.craft
                        ? country.craft.title
                        : `${tileProps(country).material} study`}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <h3>No place found.</h3>
                <p>Try a country name or a two-letter code.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCollection("all");
                  }}
                >
                  Show all places <span aria-hidden="true">↗</span>
                </button>
              </div>
            )}
          </section>

          <aside
            id="selected-flag-detail"
            className={styles.detail}
            ref={detailRef}
            aria-label="Selected country detail"
          >
            <div className={styles.detailTop}>
              <span>A CLOSER LOOK</span>
              <span>{selected.code.toUpperCase()}</span>
            </div>
            <div className={styles.detailStage}>
              <TactileFlagTile
                country={selected}
                {...tileProps(selected)}
                eager
              />
              <span className={styles.detailShadow} />
            </div>
            <div className={styles.detailBody}>
              <p className={styles.detailMaterial}>
                {selectedMaterial} /{" "}
                {surface === "craft" && selected.craft
                  ? "CRAFT STUDY"
                  : "STUDIO STUDY"}
              </p>
              <h2 ref={detailHeadingRef} tabIndex={-1}>{selected.name}</h2>
              {selected.flagNote && (
                <p className={styles.detailSummary}>{selected.flagNote}</p>
              )}
              {selected.craft ? (
                <>
                  {selected.craft.nativeLabel && (
                    <div className={styles.typeStudy}>
                      <div className={styles.typeStudyHeading}>
                        <span className={styles.controlLabel}>TYPE STUDY</span>
                        {selected.craft.iconDataUri && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={selected.craft.iconDataUri}
                            alt=""
                            width={28}
                            height={28}
                          />
                        )}
                      </div>
                      <p
                        className={styles.typeSpecimen}
                        lang={selected.craft.lang}
                        dir={selected.craft.direction}
                        style={{
                          fontFamily: `${selected.craft.fontFamily ?? "Georgia"}, serif`,
                        }}
                      >
                        {selected.craft.nativeLabel}
                      </p>
                      <p className={styles.typeLanguage}>
                        {selected.craft.languageLabel}
                      </p>
                    </div>
                  )}
                  <p className={styles.craftTitle}>{selected.craft.title}</p>
                  <p className={styles.craftRegion}>{selected.craft.region}</p>
                  {selected.craft.imageDataUri && (
                    <figure className={styles.craftImage}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selected.craft.imageDataUri}
                        alt={
                          selected.craft.imageAlt ??
                          `${selected.craft.title} motif study`
                        }
                        loading="lazy"
                      />
                      <figcaption>
                        <span className={styles.imageDescription}>
                          {selected.craft.imageAlt}
                        </span>
                        {selected.craft.imageCredit}
                        {selected.craft.imageLicense &&
                          ` · ${selected.craft.imageLicense}`}
                        {selected.craft.imageSourceUrl && (
                          <a
                            href={selected.craft.imageSourceUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            Study reference <Arrow />
                          </a>
                        )}
                      </figcaption>
                    </figure>
                  )}
                  <p className={styles.detailSummary}>
                    {selected.craft.summary}
                  </p>
                  <a
                    href={selected.craft.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.sourceLink}
                  >
                    Explore the craft reference <Arrow />
                  </a>
                  {surface === "universal" && (
                    <p className={styles.studioNote}>
                      Studio finish is selected. Choose Local craft to see this
                      frame study.
                    </p>
                  )}
                </>
              ) : (
                <p className={styles.detailSummary}>
                  A studio frame in {selectedMaterial}. This country or
                  territory has a place in the collection; a regional craft
                  study can be added with a named source.
                </p>
              )}
              <div className={styles.sizeSection}>
                <span className={styles.controlLabel}>AT EVERY SCALE</span>
                <div className={styles.sizePreviews}>
                  {[40, 56, 80].map((size) => (
                    <div key={size}>
                      <span style={{ width: size }}>
                        <TactileFlagTile
                          country={selected}
                          {...tileProps(selected)}
                          decorative
                        />
                      </span>
                      <span>{size}px</span>
                    </div>
                  ))}
                </div>
              </div>
              <a
                href={selected.svgDataUri}
                download={`${selected.code.toLowerCase()}-flag.svg`}
                className={styles.download}
              >
                Download flag SVG <span aria-hidden="true">↓</span>
              </a>
              <p className={styles.flagCredit}>
                Flag artwork:{" "}
                <a
                  href={flagCatalog.source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {flagCatalog.source.name}
                </a>{" "}
                · {flagCatalog.source.license}
                <br />Source snapshot retrieved 22 October 2026.
              </p>
            </div>
          </aside>
        </div>

        <section
          className={styles.principles}
          aria-label="About the collection"
        >
          <p className={styles.eyebrow}>PLACE, WITH CONTEXT</p>
          <h2>
            Flags identify places.
            <br />
            <em>Languages cross borders.</em>
          </h2>
          <p>
            Each tile names a country or territory. Its frame is a contemporary
            interpretation of a cited craft tradition. Script specimens name
            their language. A place holds many cultures; a language belongs to
            many places.
          </p>
          <div className={styles.principleFooter}>
            <span>BUCKET × POLINGUAL</span>
            <a href="#flag-title">
              Back to the collection <span aria-hidden="true">↑</span>
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
