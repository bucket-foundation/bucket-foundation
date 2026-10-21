import json,os,re
HERE=os.path.dirname(os.path.abspath(__file__))
REPO=os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SUBSET=os.path.join(REPO,"learning/app/polingual/subset.json")
BRANCHES=os.path.join(REPO,"learning/branches/branches.json")
CONCEPTS=["light","water","fire","sun","one","mother","eye","heart"]
CUR=dict(en="light",la="lux",sa="ज्योतिस्",el="φως",ru="свет",hi="प्रकाश",he="נגה",ja="明かり",sv="ljus",es="luz",pt="luz",pl="światło",cs="světlo",de="Licht",fr="lumière",fi="valo",it="luce",ko="광",th="รัศมี",fa="پرتو",ar="شمس",zh="朝陽",tr="su",ta="நீர்",nl="vuur",vi="nước")
def _subset(): return json.load(open(SUBSET,encoding="utf-8"))
def strip():
    d=_subset();names=d["manifest"]["language_names"];out=[]
    for code in d["manifest"]["languages"]:
        pick=None
        if code in CUR:
            w=next(w for w in d["words"] if w["l"]==code and w["s"]==CUR[code])
            pick=dict(code=code,name=names[code],word=w["s"],ipa=(w.get("ipa") or "").strip("[]/"),concept=w.get("c",""),gloss=w["g"][:60])
        for con in ([] if pick else CONCEPTS):
            c=[w for w in d["words"] if w["l"]==code and w.get("c")==con and re.match(rf"^(an? |the )?{con}\b(?! ?bulb)",w["g"].lower())]
            c.sort(key=lambda w:(w["s"].lower()!=con,len(w["g"])))
            if c:
                w=c[0];pick=dict(code=code,name=names[code],word=w["s"],ipa=(w.get("ipa") or "").strip("[]/"),concept=con,gloss=w["g"][:60]);break
        if pick: out.append(pick)
    return out,d["attribution"]
def card(code,concept="light"):
    d=_subset()
    for w in d["words"]:
        if w["l"]==code and w.get("c")==concept and w["g"].lower().startswith(concept):
            return dict(word=w["s"],ipa=(w.get("ipa") or "").strip("[]/"),gloss=w["g"],pos=w.get("p",""),ety=(w.get("e") or "").split("\n")[1:5])
def branches():
    b=json.load(open(BRANCHES,encoding="utf-8"))["branches"]
    return [dict(id=x["id"],n=x["id"][:2],name=x["id"][3:].replace("-"," ").capitalize(),arxiv=x.get("arxiv",[]),queries=x.get("queries",[]),pilot=x.get("pilot",False)) for x in b]
if __name__=="__main__":
    s,a=strip();print(len(s),[(x["code"],x["word"],x["concept"]) for x in s]);print(branches())
