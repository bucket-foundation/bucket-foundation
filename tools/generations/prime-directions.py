import os, runpy, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
TOOL = os.path.join(ROOT, "tools", "prime-directions")
CORPUS = os.environ.get("BKT_GEN_CORPUS", "80k")
OUT_DIR = os.environ.get("BKT_GEN_OUT", os.getcwd())
sys.path.insert(0, TOOL)
os.chdir(TOOL)
sys.argv = ["prime_directions", "run", CORPUS, "--out", OUT_DIR, "--no-docs"]
runpy.run_module("prime_directions", run_name="__main__")
