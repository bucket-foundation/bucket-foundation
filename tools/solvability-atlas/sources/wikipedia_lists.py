import re

from common import Row, first_sentence, form_of, keywords_from, posed_year, report, resolved_year, slug, strip_markup, wikilinks, wikitext

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
BOLD = re.compile(r"'{3}(.+?)'{3}")


def bullets(text):
    section = ""
    subsection = ""
    solved = False
    for line in text.split("\n"):
        heading = re.match(r"^(=+)\s*(.*?)\s*=+\s*$", line)
        if heading:
            depth = len(heading.group(1))
            title = heading.group(2)
            if depth == 2:
                section, subsection = title, ""
            else:
                subsection = title
            solved = bool(SOLVED_SECTION.search(section)) or bool(SOLVED_SECTION.search(subsection))
            continue
        if re.match(r"^\*{1,2}\s*[^*\s]", line) and not SKIP_SECTIONS.search(section):
            yield line.lstrip("*").strip(), solved, section + (" / " + subsection if subsection else "")


def name_of(bullet):
    links = wikilinks(bullet)
    bold = BOLD.match(bullet)
    if bold:
        return strip_markup(bold.group(1))
    head, sep, _ = bullet.partition(":")
    head = strip_markup(head)
    if sep and 0 < len(head) <= 80 and not re.search(r"[?.!]", head):
        return head
    sentence = first_sentence(strip_markup(bullet))
    if sentence:
        return sentence
    return links[0] if links else ""


def rows_for(page, branch, market):
    out = []
    text = wikitext(page)
    url = "https://en.wikipedia.org/wiki/" + page.replace(" ", "_")
    for bullet, solved, section in bullets(text):
        name = name_of(bullet).rstrip(" :;,")
        if not name or len(name) < 4:
            continue
        plain = strip_markup(bullet)
        if plain.endswith(":") or len(plain) < 12:
            continue
        keywords = [k for k in wikilinks(bullet) if k.lower() != name.lower()]
        out.append(
            Row(
                id="wp-" + slug(name),
                name=name,
                branch=branch,
                form=form_of(name, plain),
                status="solved" if solved else "open",
                source=url,
                licence=LICENCE,
                keywords=keywords_from(plain, keywords, name=name),
                posed=posed_year(plain),
                resolved=resolved_year(plain) if solved else "",
                market=market,
                statement=plain,
                statement_source=url,
                status_source=f"Wikipedia section: {section}",
            )
        )
    report(page, out)
    return out


def rows():
    out = []
    for page, (branch, market) in PAGES.items():
        out.extend(rows_for(page, branch, market))
    return out
