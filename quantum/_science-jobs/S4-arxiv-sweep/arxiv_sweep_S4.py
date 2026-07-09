#!/usr/bin/env python3
"""S4 arXiv sweep — pull last ~90 days of quant-ph + cond-mat.mes-hall,
cluster by manual node IDs, flag papers that upgrade a T4 vendor claim.
Regenerates arxiv_sweep_S4.csv. Assessment step uses host.llm inside Claude
Science; standalone runs produce the candidate pool + metadata only.
Usage:  python3 arxiv_sweep_S4.py [YYYYMMDD_start] [YYYYMMDD_end]
"""
import sys, urllib.request, urllib.parse, time, csv, xml.etree.ElementTree as ET

WIN_START = (sys.argv[1] if len(sys.argv)>1 else "20260410")+"0000"
WIN_END   = (sys.argv[2] if len(sys.argv)>2 else "20260709")+"2359"
NS = {"a":"http://www.w3.org/2005/Atom","arxiv":"http://arxiv.org/schemas/atom"}

QUERIES = [
 ("Majorana / topological qubit","H-topo;C-majorana-existence",'all:"Majorana zero mode" OR all:"topological qubit"'),
 ("Surface-code below-threshold QEC","S-qec;S-logical;C-ftqc-timeline",'abs:"surface code" AND abs:"below threshold"'),
 ("Logical qubit / error correction demo","S-logical;S-qec;C-ftqc-timeline",'abs:"logical qubit" AND abs:"error correction"'),
 ("qLDPC codes / overhead","S-qec;O-overhead;C-overhead-ratio",'all:"qLDPC" OR abs:"quantum LDPC"'),
 ("Magic state distillation/cultivation","S-qec;O-overhead",'abs:"magic state" AND (abs:distillation OR abs:cultivation)'),
 ("Real-time / neural decoders","S-decoders;O-decoder",'abs:"decoder" AND abs:"error correction" AND abs:"real-time"'),
 ("Quantum advantage OTOC / Echoes","O-advantage;C-advantage-survival",'abs:"quantum advantage" AND (abs:OTOC OR abs:"out-of-time-order")'),
 ("Spin-glass / annealing classical sim","F-adiabatic;O-classical-sim;C-advantage-survival",'abs:"spin glass" AND (abs:"tensor network" OR abs:annealing OR abs:"quantum annealer")'),
 ("Classical simulation noisy circuits","O-classical-sim;S-tensornet",'abs:"classical simulation" AND abs:"quantum circuit" AND abs:noise'),
 ("Shor / RSA factoring resource estimate","S-shor;O-crqc-timeline;C-crqc-timeline",'abs:"Shor" AND (abs:factoring OR abs:RSA) AND abs:resource'),
 ("Photonic fault tolerance / loss","H-photonic;C-photonic-scaling",'abs:photonic AND (abs:"fault-tolerant" OR abs:"fault tolerant") AND (abs:loss OR abs:GKP)'),
 ("Two-qubit gate fidelity record","H-supercon;H-ion;H-neutral;C-ftqc-timeline",'abs:"two-qubit gate" AND abs:fidelity AND (abs:"99.9" OR abs:"99.99")'),
 ("TLS / two-level-system defects","H-supercon;H-fab;C-tls-scaling",'abs:"two-level system" AND abs:superconducting AND abs:qubit'),
 ("Neutral-atom / Rydberg processor","H-neutral;A-rydberg",'abs:"neutral atom" AND (abs:"quantum computing" OR abs:"logical qubit" OR abs:processor)'),
 ("Trapped-ion processor","H-ion;H-iontrap",'abs:"trapped ion" AND (abs:"quantum computer" OR abs:"logical qubit" OR abs:fidelity)'),
 ("Silicon spin qubit","H-silicon;H-spinsplit",'abs:"silicon spin qubit" OR (abs:"spin qubit" AND abs:silicon AND abs:fidelity)'),
 ("Bosonic / cat qubit","H-bosonic",'abs:"cat qubit" OR (abs:bosonic AND abs:"error correction")'),
 ("Energy / thermodynamic advantage","O-energy;C-energy-advantage",'abs:"quantum computing" AND abs:energy AND (abs:advantage OR abs:consumption OR abs:thermodynamic)'),
 ("Benchmarking / quantum volume","S-bench;O-benchmark-standard;C-benchmark-metrics",'abs:benchmark AND abs:quantum AND (abs:"quantum volume" OR abs:CLOPS OR abs:"algorithmic qubit")'),
 ("Error mitigation ZNE/readout","S-errmit",'abs:"error mitigation" AND (abs:"zero-noise" OR abs:readout)'),
 ("Quantum utility / kicked Ising","O-utility-definition;C-quantum-utility",'abs:"quantum utility" OR (abs:"kicked Ising" AND abs:simulation)'),
 ("Quantum machine learning / kernels","S-qml;S-hhl",'abs:"quantum kernel" OR abs:"quantum machine learning" AND abs:dequantiz'),
 ("Hamiltonian simulation / QSVT","S-hamsim;S-qsvt",'abs:"Hamiltonian simulation" AND (abs:"quantum signal processing" OR abs:QSVT OR abs:resource)'),
 ("Quantum networking / repeaters","A-qinternet;A-qmemory-hw;H-transduce",'abs:"quantum network" AND (abs:repeater OR abs:transduc OR abs:"quantum memory")'),
 ("QKD / satellite","A-qkd;A-satqkd",'abs:"quantum key distribution" AND (abs:satellite OR abs:field OR abs:record)'),
]

def fetch(search):
    q=f'({search}) AND submittedDate:[{WIN_START} TO {WIN_END}]'
    url="https://export.arxiv.org/api/query?"+urllib.parse.urlencode(
        {"search_query":q,"start":0,"max_results":80,"sortBy":"submittedDate","sortOrder":"descending"})
    for a in range(3):
        try:
            with urllib.request.urlopen(url,timeout=45) as r: return r.read()
        except Exception:
            if a==2: raise
            time.sleep(5)

papers={}
for label,nodes,search in QUERIES:
    root=ET.fromstring(fetch(search))
    for e in root.findall("a:entry",NS):
        aid=e.find("a:id",NS).text.split("/abs/")[-1]; base=aid.split("v")[0]
        p=papers.setdefault(base,{"aid":aid,"title":" ".join(e.find("a:title",NS).text.split()),
            "date":e.find("a:published",NS).text[:10],"nodes":set(),"buckets":[]})
        p["buckets"].append(label); p["nodes"].update(nodes.split(";"))
    time.sleep(3)
    print(f"{label:42s} -> ok")

with open("arxiv_candidates_S4.csv","w",newline="") as f:
    w=csv.writer(f); w.writerow(["arxiv_id","date","nodes","buckets","title"])
    for p in sorted(papers.values(),key=lambda x:x["date"],reverse=True):
        w.writerow([p["aid"],p["date"],";".join(sorted(p["nodes"])),
                    ";".join(sorted(set(p["buckets"]))),p["title"]])
print(f"\n{len(papers)} unique papers -> arxiv_candidates_S4.csv")
print("Relevance grading vs evidence/CONFLICTS.md runs inside Claude Science (host.llm).")
