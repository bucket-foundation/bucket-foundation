import json,sys,re
vid=sys.argv[1]; spec=sys.argv[2]
R='/home/gian/agfarms/bucket-foundation/finance/06-youtube/videos/'+vid
ch=json.load(open(R+'/transcript.json')); m=json.load(open(R+'/metadata.json'))
def sec(s):
    h,mm,x=s.split(':'); return int(h)*3600+int(mm)*60+float(x)
def norm(s):
    s=re.sub(r'&(nbsp|gt|lt|amp|quot|#39);',' ',s)
    return re.sub(r'\s+',' ',re.sub(r"[^\w\s']",' ',s.lower())).strip()
pieces=[];offs=[];pos=0
for c in ch:
    t=norm(c['text'])
    if not t: continue
    offs.append((pos,sec(c['start'])));pieces.append(t);pos+=len(t)+1
full=' '.join(pieces)
def ts(phrase):
    p=norm(phrase); i=full.find(p)
    if i<0: return None
    s=0
    for o,t in offs:
        if o<=i: s=t
        else: break
    return '%d:%02d:%02d'%(s//3600,(s%3600)//60,s%60)
secs={'Claim':[], 'Worked':[], 'Failed':[]};teach='';arch='none'
bad=[]
for line in open(spec,encoding='utf-8'):
    line=line.rstrip('\n')
    if not line.strip(): continue
    k,_,rest=line.partition(':'); rest=rest.strip()
    if k=='Teaches': teach=rest
    elif k=='Architecture': arch=rest
    elif k in secs:
        txt,_,ph=rest.partition('||'); txt=txt.strip(); ph=ph.strip()
        t=ts(ph)
        if t is None: bad.append(ph); continue
        secs[k].append(f'- {txt} "{ph}" [{t}]')
if bad:
    print('BAD PHRASES:'); [print(' ',b) for b in bad]; 
hours=(m.get('duration') or 0)/3600
out=['<!-- voice-ignore-file: transcript-derived digest -->',f"# {m.get('title')} | {m.get('channel') or m.get('uploader')} | {vid} | {hours:.2f} h",'',f'Teaches: {teach}','','Claims:']+secs['Claim']+['',f'Architecture: {arch}','','Worked:']+(secs['Worked'] or ['- none reported'])+['','Failed:']+(secs['Failed'] or ['- none reported'])
open(R+'/DIGEST.md','w').write('\n'.join(out)+'\n')
print('ok',vid,len(secs['Claim']),'claims',len(bad),'bad')
