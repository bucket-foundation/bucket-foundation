#!/usr/bin/env python3
"""Frame open-license (PD/CC) Wikimedia anatomical images in the design-system panel,
with proper attribution footer. English-labeled / language-neutral images only."""
import os, sys, base64, csv, subprocess, html, re
sys.path.insert(0, os.path.dirname(__file__))
import ds
FIG=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","figures"))
CAND=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","anatomy-candidates"))
# attribution lookup
ATTR={}
for r in csv.reader(open(os.path.join(CAND,"ATTRIBUTION.csv"))):
    if len(r)>=5 and r[0]!="concept": ATTR[(r[0],r[1])]=(r[2],r[3],r[4])
def cred(slug,fname):
    lic,auth,src=ATTR.get((slug,fname),("","",""))
    auth=re.sub(r'<[^>]+>','',html.unescape(auth)).strip()[:46] or "Wikimedia Commons"
    return f"Image: {auth} · {lic or 'open license'} · Wikimedia Commons"
def dims(p):
    o=subprocess.check_output(["magick","identify","-format","%w %h",p]).decode().split()
    return int(o[0]),int(o[1])
# (output, slug, filename, kicker, head, subtitle, claim)
PICKS=[
 ("RA01-neuron","neuron","1-Complete_neuron_cell_diagram_en.svg.png","Nervous System · §14","The neuron","Dendrites receive the signal, the axon carries it, and the terminals pass it on.","neuron-anatomy"),
 ("RA02-synapse","synapse","4-SynapseSchematic_en.svg.png","Nervous System · §14","The synapse","One neuron passes its signal to the next across the cleft, carried by neurotransmitters.","synapse-anatomy"),
 ("RA03-mitochondrion","mitochondrion","3-Animal_mitochondrion_diagram_en.svg.png","Foundations · §01","The mitochondrion","The cell's power plant, where oxygen and fuel become ATP.","mitochondrion-anatomy"),
 ("RA04-nephron","nephron","1-Kidney_nephron_molar_transport_diagram.svg.png","Renal System · §17","The nephron","The kidney's filter unit: blood is filtered, then the tubule reclaims what the body needs.","nephron-anatomy"),
 ("RA05-endocrine-glands","endocrine-glands","2-Illu_endocrine_system_New.png.png","Endocrine · §13","The endocrine glands","Hormone factories from head to pelvis, working as one signaling network.","endocrine-anatomy"),
 ("RA06-action-potential","action-potential","1-Propagation_of_action_potential_along_myelinated_nerve_fiber_en.svg.png","Nervous System · §14","The action potential","An all-or-nothing electrical wave jumps node to node down a myelinated axon.","action-potential-anatomy"),
 ("RA07-dna-replication","dna-replication","1-DNA_replication_en.svg.png","Foundations · §01","DNA replication","The fork that copies the genome, with a leading and a lagging strand.","dna-replication-anatomy"),
 ("RA08-telomere","chromosome-telomere","2-Chromosome_structure.png.png","Telomeres · §16","The chromosome and its telomeres","Protective caps at each end that shorten with every cell division.","telomere-anatomy"),
 ("RA09-brain-lobes","brain-regions","1-Diagram_showing_the_lobes_of_the_brain_CRUK_308.svg.png","Brain · §08","The lobes of the brain","Frontal, parietal, temporal, and occipital lobes, plus the cerebellum and brainstem.","brain-lobes-anatomy"),
 ("RA10-atherosclerosis","atherosclerosis","1-Atherosclerosis_diagram.png.png","Cardiovascular · §22","Atherosclerosis","Plaque builds inside the artery wall over decades and can rupture.","atherosclerosis-anatomy"),
 ("RA11-tissue-epithelial","tissue-epithelial","1-Histological_section_of_small_intestine_epithelial_tissue__zoom.jpg.jpg","Anatomy · §18","Epithelial tissue, under the microscope","Small-intestine epithelium: the sheet that lines surfaces and forms glands.","epithelial-histology"),
 ("RA12-tissue-connective","tissue-connective","1-Connective_Tissue_Reticular__40885193805_.jpg.jpg","Anatomy · §18","Connective tissue, under the microscope","Reticular connective tissue: the framework that supports and binds.","connective-histology"),
 ("RA13-tissue-muscle","tissue-muscle","1-Skeletal_muscle_histology.jpg.jpg","Anatomy · §18","Skeletal muscle, under the microscope","Striated skeletal muscle fibers: the tissue that generates force.","muscle-histology"),
]
W=1000
made=[]
for out,slug,fname,kick,head,sub,claim in PICKS:
    p=os.path.join(CAND,slug,fname)
    if not os.path.exists(p): print("MISS",p); continue
    iw,ih=dims(p)
    maxw,maxh=900,560
    sc=min(maxw/iw, maxh/ih); dw,dh=iw*sc, ih*sc
    H=int(168+dh+58)
    head_svg,cy,foot=ds.panel(W,H,kick,head,sub,cred(slug,fname),claim)
    b64=base64.b64encode(open(p,"rb").read()).decode()
    mime="image/jpeg" if p.lower().endswith((".jpg",".jpeg")) else "image/png"
    x=(W-dw)/2; y=cy+4
    # subtle card behind the image
    img=(f'<rect x="{x-10:.0f}" y="{y-10:.0f}" width="{dw+20:.0f}" height="{dh+20:.0f}" rx="10" '
         f'fill="#ffffff" stroke="{ds.RULE}" stroke-width="1"/>'
         f'<image x="{x:.0f}" y="{y:.0f}" width="{dw:.0f}" height="{dh:.0f}" '
         f'href="data:{mime};base64,{b64}" preserveAspectRatio="xMidYMid meet"/>')
    ds.render(head_svg+img+foot, f"{FIG}/{out}.png")
    made.append(out); print("ok",out,f"({iw}x{ih} -> {int(dw)}x{int(dh)})")
print(f"\nbuilt {len(made)} real-media figures")
