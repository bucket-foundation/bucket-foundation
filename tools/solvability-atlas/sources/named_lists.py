import re

from common import Row, first_sentence, form_of, keywords_from, posed_year, report, resolved_year, slug, strip_markup, wikilinks, wikitext, year_in

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


DISPUTED = re.compile(r"no consensus|disputed|controvers|weaker form|only partial|partially|some cases|not (?:fully|completely)|unclear", re.I)
OVERRIDES = {
    "smale-8": "open",
    "hilbert-14": "partial",
    "hilbert-18": "partial",
    "smale-14": "partial",
    "smale-17": "partial",
}


def status_of(cell, year_cell):
    plain = strip_markup(cell)
    if "{{partial" in cell or DISPUTED.search(plain):
        return "partial"
    if "{{yes" in cell and year_in(strip_markup(year_cell)):
        return "solved"
    return "open"


def gloss(label, explanation, limit=140):
    plain = re.sub(r"^\(\w\)\s*", "", strip_markup(explanation))
    sentence = first_sentence(plain, limit - len(label) - 2)
    if not sentence:
        head = re.split(r"[.:;?]", plain, maxsplit=1)[0].strip()
        sentence = head if 0 < len(head) <= limit - len(label) - 2 else ""
    return f"{label}: {sentence.rstrip(' ,')}" if sentence else label


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
            status = OVERRIDES.get(f"{prefix}-{number}", status_of(cells[2], year_cell))
            resolved = year_in(strip_markup(year_cell)) if status == "solved" else ""
            keywords = [k for k in links if k.lower() != name.lower()]
            statement = strip_markup(explanation)
            out.append(
                Row(
                    id=f"{prefix}-{number}",
                    name=name if name != label.format(n=ordinal) else gloss(name, explanation),
                    branch="information" if "P versus NP" in name else "mathematics",
                    form=form_of(name, statement),
                    status=status,
                    source=url,
                    licence=LICENCE,
                    keywords=keywords_from(statement, keywords),
                    posed=posed,
                    resolved=resolved,
                    statement=statement,
                    statement_source=url,
                    status_source=f"Wikipedia table status column on {page}" + ("; curator override, see SOURCES.md" if f"{prefix}-{number}" in OVERRIDES else ""),
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
                    form=form_of(name, plain),
                    status="solved" if solved else "open",
                    source=url,
                    licence=LICENCE,
                    keywords=keywords_from(plain, wikilinks(" ".join(body))),
                    posed=posed_year(plain) or "2000",
                    resolved=resolved_year(plain) if solved else "",
                    statement=plain,
                    statement_source=url,
                    status_source="Wikipedia section: Solved problems" if solved else "Wikipedia section: Unsolved problems",
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
