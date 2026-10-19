import importlib, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "papers", "solvability-frontier", "figures"))
FIGURE = os.environ["BKT_GEN_FIGURE"]
OUT_DIR = os.environ.get("BKT_GEN_OUT", os.getcwd())
module = importlib.import_module(FIGURE)
module.OUT = os.path.join(OUT_DIR, f"{FIGURE}.pdf")
module.main()
