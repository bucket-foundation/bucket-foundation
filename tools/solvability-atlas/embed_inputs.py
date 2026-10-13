import atlas

VARIANTS = ("name", "name_keywords", "name_statement", "name_statement_keywords_branch", "statement_only", "current")


def statement_of(n):
    if n.get("statement"):
        return n["statement"]
    rec = atlas.load_record(n["id"]) if n["kind"] == "problem" else None
    return rec["statement"]["text"] if rec and rec["statement"]["text"] else ""


def text_for(n, variant):
    if variant == "current":
        return atlas.full_text(n)[0]
    if variant not in VARIANTS:
        raise ValueError(f"unknown embedding input {variant}")
    statement = statement_of(n)
    name = n["name"]
    keywords = ", ".join(n["keywords"])
    if variant == "name":
        return f"{name}."
    if variant == "name_keywords" or not statement:
        if variant == "name_statement_keywords_branch":
            return f"{name}. {n['branch']}. " + keywords
        return atlas.name_keyword_text(n)
    if variant == "name_statement":
        return f"{name}. {statement}"
    if variant == "statement_only":
        return statement
    return f"{name}. {n['branch']}. {statement} Keywords: {keywords}."
