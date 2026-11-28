import json,sys
vid=sys.argv[1]; maxw=int(sys.argv[2]) if len(sys.argv)>2 else 1200
R='/home/gian/agfarms/bucket-foundation/finance/06-youtube/videos/'+vid
ch=json.load(open(R+'/transcript.json'))
def sec(s):
    h,m,x=s.split(':'); return int(h)*3600+int(m)*60+float(x)
wins={}
for c in ch:
    t=c['text'].strip()
    if t: wins.setdefault(int(sec(c['start'])//60),[]).append(t)
m=json.load(open(R+'/metadata.json'))
tot=sum(len(' '.join(v).split()) for v in wins.values())
print(m.get('title'),'|',m.get('channel'),'|',m.get('duration_string'),'|',m.get('upload_date'),'| words',tot)
keys=sorted(wins); per=120
n=max(1,min(len(keys),maxw//per))
step=len(keys)/n
for i in range(n):
    k=keys[int(i*step)]
    w=' '.join(wins[k]).split()
    print(f"[{k//60}:{k%60:02d}:00] "+' '.join(w[:per]))
