import os, runpy, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
ATLAS = os.path.join(ROOT, "tools", "solvability-atlas")
OUT_DIR = os.environ.get("BKT_GEN_OUT", os.getcwd())
sys.path.insert(0, ATLAS)
os.chdir(ATLAS)
sys.argv = [os.path.join(ATLAS, "atlas.py"), OUT_DIR]
runpy.run_path(os.path.join(ATLAS, "atlas.py"), run_name="__main__")
