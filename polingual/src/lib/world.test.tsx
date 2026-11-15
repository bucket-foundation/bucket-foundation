import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Field, FlagBand, FlagTile, Ground, Input, Sheet, Stage, Sticker, StreakFlame, Tabs } from "../ui";

test("grounds render each kind", () => {
  assert.match(renderToStaticMarkup(<Ground kind="lattice" cut />), /data-ground="lattice"/);
  assert.match(renderToStaticMarkup(<Ground />), /data-ground="paper"/);
  const toned = renderToStaticMarkup(<Ground tone="lapis" pattern="tile" tile="azulejo" testId="g" />);
  assert.match(toned, /data-ground="lapis"/);
  assert.match(toned, /data-pattern="tile"/);
  assert.match(toned, /--ground-tile/);
});

test("sticker places hero art", () => {
  const html = renderToStaticMarkup(<Sticker name="seal" x="10%" y="20%" size={80} rotate={-5} />);
  assert.match(html, /data-sticker="seal"/);
  assert.match(html, /rotate\(-5deg\)/);
});

test("flag band, flame, field, sheet, tabs render", () => {
  assert.match(renderToStaticMarkup(<FlagBand />), /flag-band/);
  assert.match(renderToStaticMarkup(<StreakFlame days={100} />), />100</);
  assert.match(renderToStaticMarkup(<Field label="Email"><Input type="email" /></Field>), /Email[\s\S]*type="email"/);
  assert.match(renderToStaticMarkup(<Sheet data-testid="s">x</Sheet>), /data-testid="s"/);
  const tabs = renderToStaticMarkup(<Tabs label="t" value="a" onChange={() => {}} tabs={[{ id: "a", label: "A" }, { id: "b", label: "B" }]} />);
  assert.match(tabs, /aria-selected="true"[^>]*>A</);
});

test("flag tile shows word and reading", () => {
  const html = renderToStaticMarkup(<FlagTile lang="es" code="ES" label="Spanish" word="cien" reading="/θjen/" />);
  assert.match(html, /cien/);
  assert.match(html, /θjen/);
});

test("stage keeps content in its own column", () => {
  const html = renderToStaticMarkup(<Stage testId="st"><p>hello</p></Stage>);
  assert.match(html, /data-testid="st"/);
  assert.match(html, /aria-hidden="true"[\s\S]*data-sticker="seal"[\s\S]*<p>hello<\/p>/);
});

test("type primitives render their roles", async () => {
  const { Eyebrow, Lede, Stack, Title } = await import("../ui");
  const html = renderToStaticMarkup(<Stack><Eyebrow>Daily</Eyebrow><Title onDark>Hi</Title><Lede>Body</Lede></Stack>);
  assert.match(html, /<p[^>]*>Daily<\/p><h1[^>]*data-dark="true"[^>]*>Hi<\/h1><p[^>]*>Body<\/p>/);
});
