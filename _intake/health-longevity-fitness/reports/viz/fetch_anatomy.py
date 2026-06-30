#!/usr/bin/env python3
"""Pull open-license (PD / CC0 / CC BY / CC BY-SA) anatomical images from Wikimedia Commons
as candidates to replace the schematic anatomicals. Saves rasterized images + an attribution
sheet for founder review in Drive."""
import os, json, re, urllib.parse, urllib.request, html, time, glob as _glob
OUT=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","media","anatomy-candidates"))
UA="AGFarms-Bucket/1.0 (gianyrox@gmail.com)"
CONCEPTS=[
 ("neuron","labeled neuron diagram"),
 ("synapse","chemical synapse diagram"),
 ("nephron","nephron kidney diagram"),
 ("mitochondrion","mitochondrion diagram"),
 ("endocrine-glands","endocrine system diagram"),
 ("action-potential","action potential diagram"),
 ("chromosome-telomere","telomere chromosome diagram"),
 ("dna-replication","DNA replication fork diagram"),
 ("tissue-epithelial","epithelial tissue histology"),
 ("tissue-connective","connective tissue histology"),
 ("tissue-muscle","skeletal muscle histology"),
 ("heart-anatomy","human heart anatomy diagram"),
 ("brain-regions","human brain lobes diagram"),
 ("nephron-glomerulus","glomerulus diagram"),
 ("atherosclerosis","atherosclerosis artery diagram"),
 ("the-cell","animal cell diagram labeled"),
]
OK=("public domain","cc0","cc by","cc-by","attribution")
def fetch(query,limit=8):
    u=("https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search"
       f"&gsrsearch={urllib.parse.quote(query)}&gsrnamespace=6&gsrlimit={limit}"
       "&prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=1500")
    req=urllib.request.Request(u,headers={"User-Agent":UA})
    return json.load(urllib.request.urlopen(req,timeout=30)).get("query",{}).get("pages",{})
def clean(t): return re.sub(r'<[^>]+>','',html.unescape(str(t))).strip()
rows=[]
os.makedirs(OUT,exist_ok=True)
# resume: load prior attribution rows so we don't lose batch-1 metadata
_csv=os.path.join(OUT,"ATTRIBUTION.csv")
if os.path.exists(_csv):
    import csv as _c
    for r in list(_c.reader(open(_csv)))[1:]:
        if len(r)>=5: rows.append(tuple(r[:5]))
def dl(url,fn,tries=5):
    for k in range(tries):
        try:
            req=urllib.request.Request(url,headers={"User-Agent":UA})
            data=urllib.request.urlopen(req,timeout=60).read()
            if data and len(data)>1500: open(fn,"wb").write(data); return True
            time.sleep(4)
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(12*(k+1)); continue
            return False
        except Exception: time.sleep(5); continue
    return False
for slug,q in CONCEPTS:
    d=os.path.join(OUT,slug)
    if len([x for x in _glob.glob(os.path.join(d,"*.png"))+_glob.glob(os.path.join(d,"*.jpg")) if os.path.getsize(x)>1500])>=2:
        print("  skip (have)",slug); continue
    try: pages=fetch(q)
    except Exception as e: print("ERR",slug,e); time.sleep(3); continue
    items=sorted(pages.values(),key=lambda p:p.get("index",99))
    got=0
    for p in items:
        if got>=3: break
        ii=(p.get("imageinfo") or [{}])[0]; mime=ii.get("mime","")
        if mime not in ("image/svg+xml","image/png","image/jpeg"): continue
        em=ii.get("extmetadata",{}); lic=clean(em.get("LicenseShortName",{}).get("value","")).lower()
        if not any(k in lic for k in OK): continue
        thumb=ii.get("thumburl") or ii.get("url")
        if not thumb: continue
        d=os.path.join(OUT,slug); os.makedirs(d,exist_ok=True)
        title=re.sub(r'[^A-Za-z0-9._-]','_',p["title"].replace("File:",""))[:70]
        ext=".png" if mime!="image/jpeg" else ".jpg"
        if mime=="image/svg+xml": ext=".png"
        fn=os.path.join(d,f"{got+1}-{title}{ext}")
        try:
            if not dl(thumb,fn): print("  dl fail(429)",title); continue
        except Exception as e: print("  dl fail",title,e); continue
        time.sleep(3.5)
        rows.append((slug,os.path.basename(fn),clean(em.get("LicenseShortName",{}).get("value","")),
                     clean(em.get("Artist",{}).get("value","")),"https://commons.wikimedia.org/wiki/"+urllib.parse.quote(p["title"].replace(" ","_"))))
        got+=1; print(f"  {slug}: {title} [{lic}]")
# attribution sheet
seen=set(); uniq=[]
for r in rows:
    k=(r[0],r[1])
    if k not in seen: seen.add(k); uniq.append(r)
rows=uniq
with open(os.path.join(OUT,"ATTRIBUTION.csv"),"w") as f:
    f.write("concept,file,license,author,source_url\n")
    for r in rows: f.write(",".join('"'+str(c).replace('"',"'")+'"' for c in r)+"\n")
with open(os.path.join(OUT,"README.md"),"w") as f:
    f.write("# Anatomy image candidates (Wikimedia Commons, open-license)\n\n")
    f.write("Candidates to replace the schematic anatomicals. **Pick the ones you like**; I'll wire them in with attribution.\n\n")
    f.write("- All are Public Domain / CC0 / CC BY / CC BY-SA (see ATTRIBUTION.csv).\n")
    f.write("- CC BY / BY-SA require crediting the author + license in the figure footer.\n")
    f.write("- Foldered by concept; up to 3 candidates each.\n")
print(f"\nDONE — {len(rows)} images across {len(set(r[0] for r in rows))} concepts -> {OUT}")
