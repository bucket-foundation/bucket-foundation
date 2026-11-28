import pandas as pd, numpy as np, sys
R='/home/gian/agfarms/bucket-foundation/finance/lab/data/raw/'
s=pd.read_excel(R+'shiller/ie_data.xls',sheet_name='Data',header=7)
s=s[pd.to_numeric(s['Date'],errors='coerce').notna()].copy()
s['Date']=s['Date'].astype(float)
y=s['Date'].astype(int); m=((s['Date']-y)*100).round().astype(int)
s.index=pd.to_datetime(dict(year=y,month=m,day=1))
for c in ['P','CPI','CAPE','Rate GS10','Price']: s[c]=pd.to_numeric(s[c],errors='coerce')
def fred(n):
    d=pd.read_csv(R+f'fred/{n}.csv',index_col=0,parse_dates=True).iloc[:,0]; return pd.to_numeric(d,errors='coerce').dropna()
def px(p):
    d=pd.read_csv(R+p,index_col=0,parse_dates=True)['Close']; return d.dropna()
FF=fred('FEDFUNDS'); G10=fred('GS10'); TB=fred('TB3MS'); CS=fred('CSUSHPINSA'); CPI=fred('CPIAUCSL')
spy=px('etf/SPY.csv'); qqq=px('etf/QQQ.csv'); tlt=px('etf/TLT.csv'); gld=px('etf/GLD.csv'); btc=px('crypto_yahoo/BTC-USD.csv'); eem=px('etf/EEM.csv'); iwm=px('etf/IWM.csv'); dgs10=fred('DGS10'); d3=fred('DGS3MO')
def dd(series,a,b,name,real=False):
    x=series[a:b]
    if len(x)==0: print(name,'no data'); return
    pk=x.idxmax(); tr=x[pk:].idxmin()
    print(f"{name}: peak {pk.date()} {x[pk]:.2f} trough {tr.date()} {x[tr]:.2f} dd {100*(x[tr]/x[pk]-1):.1f}%")
def at(series,d,name):
    x=series[:d]
    if len(x)==0: print(name,'n/a'); return
    print(f"{name} @{x.index[-1].date()}: {x.iloc[-1]:.2f}")
rp=s['Price']
ev=[('1873','1872-01','1878-12'),('1907','1906-01','1908-12'),('1929','1929-01','1933-12'),('1937','1937-01','1938-12'),('1973','1972-06','1975-06'),('1980s Volcker','1979-06','1982-12'),('1987','1987-01','1987-12'),('2000','1999-06','2003-03'),('2008','2007-06','2009-06'),('2020','2020-01','2020-06'),('2022','2021-10','2022-12')]
for n,a,b in ev:
    print('==',n); dd(s['P'],a,b,'S&P comp nominal monthly'); dd(rp,a,b,'S&P real monthly')
    x=s[a:b]; pk=x['P'].idxmax(); print(f" CAPE at peak {x.loc[pk,'CAPE']}  GS10 {x.loc[pk,'Rate GS10']}")
for n,d in [('1907','1906-12'),('1929','1929-09'),('1966','1966-01'),('1987','1987-08'),('1999','1999-12'),('2000','2000-03'),('2007','2007-10'),('2021','2021-12'),('2024','2024-09')]:
    print(n,'CAPE',s.loc[:d,'CAPE'].dropna().iloc[-1])
print('CAPE mean',s['CAPE'].mean(),'median',s['CAPE'].median())
for n,d in [('1973-01','1973-01'),('1979-08','1979-08'),('1981-06','1981-06'),('1987-09','1987-09'),('1989-05','1989-05'),('2000-05','2000-05'),('2006-07','2006-07'),('2007-08','2007-08'),('2019-07','2019-07'),('2020-03','2020-03'),('2022-03','2022-03'),('2023-03','2023-03'),('2023-07','2023-07'),('2024-09','2024-09'),('2026-10','2026-10')]:
    print(n,'FF',FF[:d].iloc[-1],'GS10',G10[:d].iloc[-1],'TB3',TB[:d].iloc[-1],'10y-3m',round(G10[:d].iloc[-1]-TB[:d].iloc[-1],2))
inv=(G10-TB.reindex(G10.index)); inv=inv.dropna(); neg=inv<0
starts=inv.index[(neg)&(~neg.shift(1,fill_value=False))]
print('10y-3m inversions start months:',[str(x.date())[:7] for x in starts])
yoy=CPI.pct_change(12)*100
for d in ['1974-12','1980-03','1980-06','1990-10','2008-07','2021-12','2022-06','2026-10']: print('CPI yoy',d,round(yoy[:d].iloc[-1],1))
dd(CS,'2005-01','2012-12','Case-Shiller natl NSA')
dd(spy,'2000-01-01','2002-12-31','SPY 2000-02'); dd(qqq,'2000-01-01','2002-12-31','QQQ 2000-02')
dd(spy,'2007-01-01','2009-12-31','SPY GFC'); dd(spy,'2011-04-01','2011-12-31','SPY 2011'); dd(spy,'2015-07-01','2016-03-31','SPY 2015-16'); dd(eem,'2015-04-01','2016-03-31','EEM 2015-16')
dd(spy,'2020-01-01','2020-06-30','SPY COVID'); dd(tlt,'2020-03-01','2020-03-31','TLT Mar2020'); dd(gld,'2020-03-01','2020-03-31','GLD Mar2020')
dd(spy,'2022-01-01','2022-12-31','SPY 2022'); dd(tlt,'2020-07-01','2023-12-31','TLT 2020-23'); dd(qqq,'2021-11-01','2022-12-31','QQQ 2022')
dd(btc,'2021-01-01','2022-12-31','BTC 2021-22'); dd(btc,'2022-05-01','2022-06-30','BTC Terra window'); dd(btc,'2022-11-01','2022-11-30','BTC FTX window')
dd(iwm,'2023-02-01','2023-05-31','IWM SVB'); dd(spy,'2025-02-01','2025-04-30','SPY 2025 tariff'); dd(btc,'2025-01-01','2026-11-27','BTC 2025-26'); dd(spy,'2025-05-01','2026-11-27','SPY since May25')
dd(qqq,'2025-02-01','2025-04-30','QQQ 2025 tariff'); dd(tlt,'2025-04-01','2025-04-30','TLT Apr2025')
print('DGS10 Apr2025', dgs10['2025-04-01':'2025-04-15'].round(2).to_dict())
print('DGS10 Mar2020', dgs10['2020-03-06':'2020-03-20'].round(2).to_dict())
for d in ['2020-03-09','2020-03-12','2020-03-16','1987-10-19']: 
    r=spy.pct_change()
    if pd.Timestamp(d) in r.index: print('SPY day',d,round(100*r[d],2))
r=spy.pct_change().dropna(); print('worst SPY days',(r.nsmallest(12)*100).round(2).to_dict())
b=btc.pct_change().dropna(); print('worst BTC days',(b.nsmallest(10)*100).round(2).to_dict())
print('SPY 2025-04-09',round(100*r['2025-04-09'],2))
print('2026 SPY recent', spy['2026-01-01':].resample('ME').last().round(1).to_dict())
print('2026 BTC recent', btc['2025-06-01':].resample('ME').last().round(0).to_dict())
