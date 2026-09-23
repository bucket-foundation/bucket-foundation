import ast
import io
import re
import sys
import tokenize

KEEP = re.compile(r"noqa|type:\s*ignore|pragma|^#!|-\*- coding|fmt:\s*(off|on|skip)|pylint:|voice-ignore|SPDX-License|shellcheck")

def strip(src):
    lines = src.splitlines(keepends=True)
    drop_lines = set()
    cuts = {}
    try:
        toks = list(tokenize.generate_tokens(io.StringIO(src).readline))
    except (tokenize.TokenError, SyntaxError, IndentationError):
        return src
    for t in toks:
        if t.type != tokenize.COMMENT or KEEP.search(t.string):
            continue
        row, col = t.start
        line = lines[row - 1]
        if line[:col].strip() == "":
            drop_lines.add(row)
        else:
            cuts[row] = col
    try:
        tree = ast.parse(src)
    except SyntaxError:
        tree = None
    uses_doc = "__doc__" in src
    replace = {}
    if tree is not None:
        for node in ast.walk(tree):
            if not isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            body = node.body
            if not body or not isinstance(body[0], ast.Expr) or not isinstance(getattr(body[0], "value", None), ast.Constant) or not isinstance(body[0].value.value, str):
                continue
            if isinstance(node, ast.Module) and uses_doc:
                continue
            d = body[0]
            first = lines[d.lineno - 1]
            last = lines[d.end_lineno - 1]
            if first[: d.col_offset].strip() or last[d.end_col_offset:].strip().split("#")[0].strip():
                continue
            if len(body) == 1 and not isinstance(node, ast.Module):
                replace[d.lineno] = " " * d.col_offset + "pass\n"
                for r in range(d.lineno + 1, d.end_lineno + 1):
                    drop_lines.add(r)
            else:
                for r in range(d.lineno, d.end_lineno + 1):
                    drop_lines.add(r)
    out = []
    for i, line in enumerate(lines, 1):
        if i in replace:
            out.append(replace[i])
            continue
        if i in drop_lines:
            continue
        if i in cuts:
            nl = "\n" if line.endswith("\n") else ""
            line = line[: cuts[i]].rstrip() + nl
        out.append(line)
    res = []
    for i, line in enumerate(out):
        if line.strip() == "" and res and res[-1].strip() == "" and (i + 1 < len(out)):
            continue
        res.append(line)
    text = "".join(res).lstrip("\n")
    try:
        compile(text, "<strip>", "exec")
    except SyntaxError:
        return src
    return text

sys.stdout.write(strip(open(sys.argv[1], encoding="utf-8").read()))
