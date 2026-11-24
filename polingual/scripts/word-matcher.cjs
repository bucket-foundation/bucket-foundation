const SLUGS = require("../src/data/word-slugs.json");
const LANGS = require("../src/lib/site-langs.json");

function wordMatcher(langs = LANGS, slugs = SLUGS) {
  return [
    `/:lang((?!(?:${langs.join("|")})/)[^/]+)/word/:slug`,
    `/:lang/word/:slug((?!(?:${slugs.join("|")})(?:$|[/#?.]))[^/]+)`,
    "/:lang/word/:slug/:rest+",
  ];
}

module.exports = { wordMatcher };

if (require.main === module) console.log(JSON.stringify(wordMatcher(), null, 2));
