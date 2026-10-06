import { plugin } from "bun";
import { dirname, resolve } from "node:path";
import { exploreAliases } from "../explore-aliases";

const HERE = resolve(import.meta.dir, "..");
const SITE = `${resolve(HERE, "../../src")}/`;
const SHIMS: Record<string, string> = {
  "next/link": resolve(HERE, "src/shims/next-link.tsx"),
  "next/dynamic": resolve(HERE, "src/shims/next-dynamic.tsx"),
  "next/navigation": resolve(HERE, "src/shims/next-navigation.ts"),
};
const OWN = /^(react|react-dom|three|three-stdlib|@react-three\/fiber|@react-three\/drei)(\/.*)?$/;
const IMPORT = /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(["'])([^"']+)\2/g;
const JSX = dirname(Bun.resolveSync("react", HERE));

const own = (spec: string) => exploreAliases[spec] ?? SHIMS[spec] ?? (OWN.test(spec) ? Bun.resolveSync(spec, HERE) : null);

plugin({
  name: "bkt-ui-site-imports",
  setup(build) {
    build.onLoad({ filter: /smiles-drawer\/dist\/smiles-drawer\.min\.js$/ }, () => ({ contents: `export { default } from ${JSON.stringify(resolve(HERE, "node_modules/smiles-drawer/dist/smiles-drawer.min.mjs"))}`, loader: "js" }));
    build.onLoad({ filter: new RegExp(`^${SITE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*\\.tsx?$`) }, async ({ path }) => {
      const source = (await Bun.file(path).text()).replace(IMPORT, (all, lead: string, quote: string, spec: string) => {
        const to = own(spec);
        return to ? `${lead}${quote}${to}${quote}` : all;
      });
      const tsx = path.endsWith(".tsx");
      return { contents: tsx ? `/** @jsxImportSource ${JSX} */\n${source}` : source, loader: tsx ? "tsx" : "ts" };
    });
  },
});
