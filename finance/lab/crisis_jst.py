import pandas as pd, numpy as np
d=pd.read_stata('/home/gian/agfarms/bucket-foundation/finance/lab/data/raw/jst/JSTdatasetR6.dta')
d=d.sort_values(['iso','year'])
d['cr']=d.tloans/d.gdp*100
d['dcr5']=d.groupby('iso')['cr'].diff(5)
d['hp_real']=d.hpnom/d.cpi; d['dhp5']=d.groupby('iso')['hp_real'].pct_change(5,fill_method=None)*100
d['eq_real']=d.eq_tr
print('countries',d.iso.nunique(),'years',d.year.min(),d.year.max())
c=d[d.crisisJST==1]
print('crises',len(c)); print(c.groupby(pd.cut(c.year,[1869,1913,1945,1972,2020])).size())
print(c[['iso','year']].groupby('year').size().sort_values(ascending=False).head(8))
print('5y chg credit/GDP pp, crisis years median',c.dcr5.median().round(2),'all years median',d.dcr5.median().round(2))
print('5y real house px chg %, crisis',c.dhp5.median().round(1),'all',d.dhp5.median().round(1))
d['top']=d.groupby('iso')['dcr5'].transform(lambda x: x>x.quantile(.8))
d['crisis_next2']=d.groupby('iso')['crisisJST'].transform(lambda x: x.shift(-1).fillna(0)+x.shift(-2).fillna(0))>0
print('P(crisis in next 2y | top-quintile 5y credit growth)',d[d.top].crisis_next2.mean().round(3),'| else',d[~d.top & d.dcr5.notna()].crisis_next2.mean().round(3))
print(c[c.year>=1985][['iso','year']].to_string(index=False))
