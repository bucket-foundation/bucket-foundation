import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError, plainError } from "./api";
import { TROUBLE_GENERIC, trouble, TroubleNote } from "./trouble";

test("a server refusal shows its plain sentence and no code", () => {
  const t = trouble(new ApiError("no_profile", 403));
  expect(t).toEqual({ text: plainError(403), raw: null });
  expect(renderToStaticMarkup(<TroubleNote t={t} />)).not.toContain("no_profile");
});

test("a network failure shows a plain sentence and keeps the raw message behind details", () => {
  const t = trouble(new TypeError("Failed to fetch"));
  expect(t.text).toBe(TROUBLE_GENERIC);
  const html = renderToStaticMarkup(<TroubleNote t={t} />);
  expect(html).toContain(`<p>${TROUBLE_GENERIC}</p>`);
  expect(html).toMatch(/<details class="raw"><summary>details<\/summary><pre>Failed to fetch<\/pre><\/details>/);
  expect(html).not.toMatch(/<details[^>]* open/);
});
