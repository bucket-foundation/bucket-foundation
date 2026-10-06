import re

from common import Row, keyword_fill, report, slug, strip_markup, wikilinks, wikitext, year_in

LICENCE = "CC BY-SA 4.0"
PAGES = {
    "List of unsolved problems in mathematics": ("mathematics", ""),
    "List of unsolved problems in physics": ("physics", ""),
    "List of unsolved problems in chemistry": ("chemistry", "materials;pharma"),
    "List of unsolved problems in biology": ("biophysics", "biotech;pharma"),
    "List of unsolved problems in computer science": ("information", "software;cryptography"),
    "List of unsolved problems in neuroscience": ("mind", "healthcare;ai"),
    "List of unsolved problems in economics": ("applied", "finance;policy"),
    "List of unsolved problems in astronomy": ("cosmology", "aerospace"),
    "List of unsolved problems in geoscience": ("physics", "energy;climate"),
    "List of unsolved problems in statistics": ("mathematics", "ai;finance"),
    "List of unsolved problems in information theory": ("information", "telecom;cryptography"),
}
SKIP_SECTIONS = re.compile(r"see also|references|external links|books|further reading|historical|notes|lists", re.I)
SOLVED_SECTION = re.compile(r"\b(solved|resolved|proved)\b", re.I)
NAMED = re.compile(r"conjecture|hypothesis|problem", re.I)


def bullets(text):
    section = ""
    solved = False
    for line in text.split("\n"):
        heading = re.match(r"^(=+)\s*(.*?)\s*=+\s*$", line)
        if heading:
            depth = len(heading.group(1))
            title = heading.group(2)
            if depth == 2:
                section = title
                solved = bool(SOLVED_SECTION.search(title))
            else:
                solved = bool(SOLVED_SECTION.search(section)) or bool(SOLVED_SECTION.search(title))
            continue
        if re.match(r"^\*{1,2}\s*[^*\s]", line) and not SKIP_SECTIONS.search(section):
            yield line.lstrip("*").strip(), solved


def name_of(bullet):
    links = wikilinks(bullet)
    bold = re.match(r"'''(.+?)'''", bullet)
    if bold:
        return strip_markup(bold.group(1))
    head = strip_markup(bullet.split(":", 1)[0])
    if links and (head.startswith(links[0]) or len(head) > 80):
        return links[0]
    return head if 0 < len(head) <= 80 else (links[0] if links else "")


def rows_for(page, branch, market):
    out = []
    text = wikitext(page)
    url = "https://en.wikipedia.org/wiki/" + page.replace(" ", "_")
    for bullet, solved in bullets(text):
        name = name_of(bullet)
        if not name or len(name) < 4:
            continue
        plain = strip_markup(bullet)
        keywords = [k for k in wikilinks(bullet) if k.lower() != name.lower()]
        level = 4 if NAMED.search(name) else 3
        out.append(
            Row(
                id="wp-" + slug(name),
                name=name,
                branch=branch,
                level=level,
                status="solved" if solved else "open",
                source=url,
                licence=LICENCE,
                keywords=keyword_fill(keywords, plain, (branch, "open problem" if not solved else "solved problem", page.split(" in ")[-1], "wikipedia list")),
                resolved=year_in(plain) if solved else "",
                market=market,
            )
        )
    report(page, out)
    return out


def rows():
    out = []
    for page, (branch, market) in PAGES.items():
        out.extend(rows_for(page, branch, market))
    return out
