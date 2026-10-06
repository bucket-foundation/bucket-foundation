import re

from common import Row, keyword_fill, report, slug, strip_markup, wikilinks, wikitext, year_in

LICENCE = "CC BY-SA 4.0"
TABLES = {
    "Hilbert's problems": ("hilbert", "1900", "Hilbert's {n} problem"),
    "Smale's problems": ("smale", "1998", "Smale's {n} problem"),
}
MILLENNIUM = "Millennium Prize Problems"


def table_rows(text):
    start = text.find("{|")
    end = re.search(r"^\|\}", text[start:], re.M).start() + start
    body = re.sub(r"<ref[^>]*>.*?</ref>", "", text[start:end], flags=re.S)
    body = re.sub(r"<ref[^>]*/>", "", body)
    for chunk in body.split("|-")[1:]:
        cells = [c.strip() for c in re.split(r"\n\|(?!\|)", "\n" + chunk.strip())[1:]]
        cells = [c.split("|", 1)[1].strip() if re.match(r"^[a-z]+=", c) or c.startswith("style") else c for c in cells]
        if len(cells) >= 3 and not cells[0].startswith("!"):
            yield cells


def status_of(cell, year_cell):
    if "{{yes" in cell or ("{{partial" in cell and year_in(strip_markup(year_cell))):
        return "solved"
    return "open"


def gloss(label, explanation, limit=60):
    plain = strip_markup(explanation)
    head = re.split(r"[.:;(]", re.sub(r"^\(\w\)\s*", "", plain), maxsplit=1)[0].strip()
    if len(head) > limit:
        head = head[:limit].rsplit(" ", 1)[0]
    return f"{label}: {head.rstrip(' ,')}"


def rows():
    out = []
    for page, (prefix, posed, label) in TABLES.items():
        url = "https://en.wikipedia.org/wiki/" + page.replace(" ", "_")
        text = wikitext(page)
        for cells in table_rows(text):
            ordinal = strip_markup(cells[0]).strip()
            if not re.fullmatch(r"\d+(st|nd|rd|th)", ordinal):
                continue
            number = re.sub(r"\D", "", ordinal)
            explanation = cells[1]
            links = wikilinks(explanation)
            name = links[0] if links and NAMED_LINK.search(links[0]) else label.format(n=ordinal)
            year_cell = cells[3] if len(cells) > 3 else ""
            status = status_of(cells[2], year_cell)
            resolved = year_in(strip_markup(year_cell)) if status == "solved" else ""
            keywords = [k for k in links if k.lower() != name.lower()]
            out.append(
                Row(
                    id=f"{prefix}-{number}",
                    name=name if name != label.format(n=ordinal) else gloss(name, explanation),
                    branch="information" if "P versus NP" in name else "mathematics",
                    level=5,
                    status=status,
                    source=url,
                    licence=LICENCE,
                    keywords=keyword_fill(keywords, strip_markup(explanation), (page.split("'")[0].lower(), "mathematics", status, "named list")),
                    posed=posed,
                    resolved=resolved,
                )
            )
        report(page, out)
    out.extend(millennium())
    return out


NAMED_LINK = re.compile(r"conjecture|hypothesis|problem|theorem|question", re.I)


def millennium():
    out = []
    text = wikitext(MILLENNIUM)
    url = "https://en.wikipedia.org/wiki/Millennium_Prize_Problems"
    solved = False
    name = ""
    body = []

    def flush():
        if name:
            plain = strip_markup(" ".join(body))
            out.append(
                Row(
                    id="millennium-" + slug(name),
                    name=name,
                    branch="information" if "P versus NP" in name else "physics" if "Navier" in name or "Yang" in name else "mathematics",
                    level=5,
                    status="solved" if solved else "open",
                    source=url,
                    licence=LICENCE,
                    keywords=keyword_fill(wikilinks(" ".join(body))[:8], plain, ("millennium", "clay", "prize problem", "mathematics")),
                    posed="2000",
                    resolved=year_in(plain) if solved else "",
                )
            )

    for line in text.split("\n"):
        heading = re.match(r"^(=+)\s*(.*?)\s*=+\s*$", line)
        if heading and len(heading.group(1)) == 2:
            flush()
            name, body = "", []
            solved = heading.group(2).strip().lower() == "solved problems"
            continue
        if heading and len(heading.group(1)) == 3:
            flush()
            name, body = strip_markup(heading.group(2)), []
            continue
        if name:
            body.append(line)
    flush()
    report(MILLENNIUM, out)
    return out
