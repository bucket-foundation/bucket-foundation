#!/usr/bin/env python3
"""Bump panel heights for figures whose body overflowed the frame (review fixes)."""
import re
MAP={
 "build_final_svg.py":{"week_calendar":480,"rpe":560,"dietary":540,"exclusion":480,"refeeding":380,"debunks":450,"if_then":360},
 "build_body_schematic.py":{"levels":560,"endo_axis":520},
 "build_disease_schematic.py":{"t2d_ladder":520,"fodmap":370},
 "build_life_misc.py":{"pyramid":500,"frailty":500,"circadian":500},
 "build_final2.py":{"homology":480,"breathwork":450,"vaccines_kids":490,"stemcell_flags":450,"surgery_q":480,"metab":510,"labpair":510,"imaging_flow":390},
 "build_final3.py":{"racquet":500},
 "build_body_anat.py":{"telomere_cap":420,"nephron":470,"end_replication":420,"neuron":480},
 "build_practice_schematic.py":{"sids":480,"agonist":360,"cancer_paradox":390},
 "build_drugs_misc.py":{"placebo_bounded":400},
}
for f,funcs in MAP.items():
    src=open(f).read(); n=0
    for fn,newh in funcs.items():
        # find `def fn(` then the next  W,H=NNNN,MMMM
        m=re.search(r'def '+re.escape(fn)+r'\s*\(', src)
        if not m: print("  MISS",f,fn); continue
        seg=src[m.end():]
        mm=re.search(r'(W,H\s*=\s*\d+\s*,\s*)(\d+)', seg)
        if not mm: print("  NO WH",f,fn); continue
        old=mm.group(0); new=mm.group(1)+str(newh)
        src=src[:m.end()]+seg.replace(old,new,1); n+=1
    open(f,"w").write(src); print(f"{f}: {n} bumped")
print("done")
