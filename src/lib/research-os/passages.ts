// voice-ignore-file: every `text` field below is copied character-for-character
// from a cited primary or secondary source (Tyndall 1869, Rayleigh 1871, NASA
// Space Place, English Wikipedia). Quotations are never reworded, so any
// banned word a source happens to use (e.g. Rayleigh's own "generally") is
// left exactly as written. See CLAUDE.md's "Verbatim material" escape hatch.

/**
 * Research OS for K-12, the Quote tool's curated verbatim-passage table
 * (bkt-ros, Phase 1 item 3: "Quote returns verbatim passages under 90 words
 * with locator and URL for Tyndall 1869, Rayleigh 1871, NASA Space Place,
 * Wikipedia; fallback labeled 'summary'").
 *
 * Every entry below was checked against the live source at the URL given,
 * character for character, before being added here (raw HTML/wikitext
 * fetch, not a paraphrase). Two of the seed's primary-source citations have
 * NO entry here on purpose rather than a guessed or secondhand quotation:
 *
 *   - `rayleigh-scattering-law` / `lambda-minus-4-law`: both cite Rayleigh's
 *     third 1871 paper, "On the scattering of light by small particles"
 *     (doi:10.1080/14786447108640507). Unlike his first 1871 paper below,
 *     no public-domain full-text transcription of this one was found
 *     (Wikisource does not have it). Guessing its wording would misattribute
 *     a fabricated sentence to Rayleigh, worse than no quote at all.
 *
 * Any node whose slug is not a key here falls back to its own seeded
 * `summary` field, labeled "summary" rather than "quote" by the Quote tool
 * (src/app/api/research-os/workspace/route.ts) -- an honest degrade, not a
 * placeholder pretending to be a citation.
 */

export interface QuotePassage {
  /** The verbatim passage, under 90 words, exactly as it appears at `url`. */
  text: string;
  /** Where in the source this passage sits (page, section, or revision). */
  locator: string;
  /** A stable, publicly resolvable URL where the passage can be checked. */
  url: string;
}

const PASSAGES: Record<string, QuotePassage> = {
  // -- NASA Space Place, "Why Is the Sky Blue?" ------------------------------
  // spaceplace.nasa.gov/blue-sky/en/, fetched and diffed against the live
  // page's rendered body text.
  "light-travels-in-straight-lines": {
    text: 'All light travels in a straight line unless something gets in the way and does one of these things:— reflect it (like a mirror) bend it (like a prism) or scatter it (like molecules of the gases in the atmosphere)',
    locator: "NASA Space Place, “Why Is the Sky Blue?”, body text",
    url: "https://spaceplace.nasa.gov/blue-sky/en/",
  },
  "sunlight-looks-white": {
    text: "The light from the Sun looks white. But it is really made up of all the colors of the rainbow.",
    locator: "NASA Space Place, “Why Is the Sky Blue?”, body text",
    url: "https://spaceplace.nasa.gov/blue-sky/en/",
  },
  "air-is-made-of-tiny-particles": {
    text: "Blue light is scattered in all directions by the tiny molecules of air in Earth's atmosphere.",
    locator: "NASA Space Place, “Why Is the Sky Blue?”, body text",
    url: "https://spaceplace.nasa.gov/blue-sky/en/",
  },
  "white-light-splits-into-colors": {
    text: "When white light shines through a prism, the light is separated into all its colors.",
    locator: "NASA Space Place, “Why Is the Sky Blue?”, body text",
    url: "https://spaceplace.nasa.gov/blue-sky/en/",
  },
  "light-can-scatter-off-small-things": {
    text: "Sunlight reaches Earth's atmosphere and is scattered in all directions by all the gases and particles in the air.",
    locator: "NASA Space Place, “Why Is the Sky Blue?”, “The Short Answer”",
    url: "https://spaceplace.nasa.gov/blue-sky/en/",
  },

  // -- Wikipedia, Electromagnetic spectrum -----------------------------------
  "visible-light-is-part-of-em-spectrum": {
    text: "Electromagnetic radiation with a wavelength between 380 nm and 760 nm (400–790 terahertz) is detected by the human eye and perceived as visible light.",
    locator: "Wikipedia, “Electromagnetic spectrum”, section “Visible light”",
    url: "https://en.wikipedia.org/wiki/Electromagnetic_spectrum",
  },

  // -- Wikipedia, Rayleigh scattering, the exact revision cited in seed data -
  "air-molecules-are-much-smaller-than-light-wavelengths": {
    text: "Rayleigh scattering is the scattering or deflection of light, or other electromagnetic radiation, by particles with a size much smaller than the wavelength of the radiation.",
    locator: "Wikipedia, “Rayleigh scattering”, lead paragraph, revision 1372319937",
    url: "https://en.wikipedia.org/w/index.php?title=Rayleigh_scattering&oldid=1372319937",
  },
  "scattering-strength-depends-on-particle-size-vs-wavelength": {
    text: "For light frequencies well below the resonance frequency of the scattering medium (normal dispersion regime), the amount of scattering is inversely proportional to the fourth power of the wavelength (e.g., a blue color is scattered much more than a red color as light propagates through air).",
    locator: "Wikipedia, “Rayleigh scattering”, lead paragraph, revision 1372319937",
    url: "https://en.wikipedia.org/w/index.php?title=Rayleigh_scattering&oldid=1372319937",
  },
  "blue-scatters-more-than-red": {
    text: "The strong wavelength dependence of the Rayleigh scattering (~λ−4) means that shorter (blue) wavelengths are scattered more strongly than longer (red) wavelengths.",
    locator: "Wikipedia, “Rayleigh scattering”, section “Cause of the blue color of the sky”, revision 1372319937",
    url: "https://en.wikipedia.org/w/index.php?title=Rayleigh_scattering&oldid=1372319937",
  },

  // -- Wikipedia, Diffuse sky radiation ---------------------------------------
  "sky-is-blue-not-violet": {
    text: "Diffuse sky radiation, is solar radiation reaching the Earth's surface after having been scattered from the direct solar beam by molecules or particulates in the atmosphere. It is also called sky radiation, the determinative process for changing the colors of the sky.",
    locator: "Wikipedia, “Diffuse sky radiation”, lead paragraph",
    url: "https://en.wikipedia.org/wiki/Diffuse_sky_radiation",
  },
  "why-the-sky-is-blue": {
    text: "Diffuse sky radiation, is solar radiation reaching the Earth's surface after having been scattered from the direct solar beam by molecules or particulates in the atmosphere. It is also called sky radiation, the determinative process for changing the colors of the sky.",
    locator: "Wikipedia, “Diffuse sky radiation”, lead paragraph",
    url: "https://en.wikipedia.org/wiki/Diffuse_sky_radiation",
  },

  // -- Rayleigh 1871, "On the light from the sky, its polarization and colour"
  // doi:10.1080/14786447108640452. Verified against the OCR page scan
  // (Wikisource Page:Scientificpaper01raylgoog.pdf/110, from the public-
  // domain reprint in his "Scientific Papers, Volume 1"), not a paraphrase.
  "rayleigh-1871-sky-color-papers": {
    text: "It is now, I believe, generally admitted that the light which we receive from the clear sky is due in one way or another to small suspended particles which divert the light from its regular course. On this point the experiments of Tyndall with precipitated clouds seem quite decisive.",
    locator: "“On the Light from the Sky, Its Polarization and Colour,” Scientific Papers, Vol. 1, p. 107, opening paragraph",
    url: "https://en.wikisource.org/wiki/Scientific_Papers/Volume_1/On_the_Light_from_the_Sky,_Its_Polarization_and_Colour",
  },

  // -- Tyndall 1869, "On the blue colour of the sky, the polarization of
  // skylight, and on the polarization of light by cloudy matter generally"
  // doi:10.1098/rspl.1868.0033. The Royal Society's own text was not
  // reachable (403 on every route tried); the passage below is Tyndall's
  // own 1869 essay of the same title and year, reprinted in his "Fragments
  // of Science" (public domain, Project Gutenberg #24527), which opens by
  // naming this as the same Royal Society communication.
  "tyndall-scattering-by-small-particles": {
    text: "I now, however, beg to direct attention to two questions glanced at incidentally in the preceding pages—the blue colour of the sky, and the polarisation of skylight. Reserving the historic treatment of the subject for a more fitting occasion, I would merely mention now that these questions constitute, in the opinion of our most eminent authorities, the two great standing enigmas of meteorology.",
    locator: "Fragments of Science, Vol. 2, essay “On the Blue Colour of the Sky, and the Polarisation of Skylight” (1869), opening paragraph",
    url: "https://www.gutenberg.org/ebooks/24527",
  },
};

/** The curated passage for `slug`, or null if none is verified yet (Quote falls back to the node's own summary). */
export function getPassage(slug: string): QuotePassage | null {
  return PASSAGES[slug] ?? null;
}
