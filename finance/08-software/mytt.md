# MyTT

https://github.com/mpquant/MyTT. License None stated. Stars 2,896. Last push 2026-06-13. Python. Checked 2026-11-27.

## Architecture
Single-file library `MyTT.py` of 71 functions ported from Tongdaxin, Tonghuashun and Wenhua formula languages. `MyTT_plus.py` and `MyTT_python2.py` are variants; `hb_hq_api.py` is a Huobi quote helper; `example1.py` is a usage demo.

## Data Layer
NumPy arrays and pandas Series in and out. `hb_hq_api.py` pulls Huobi kline data over HTTP into a DataFrame.

## Event Loop
None.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. The library has formula primitives (`REF`, `HHV`, `LLV`, `MA`, `EMA`, `SMA`, `CROSS`, `COUNT`, `BARSLAST`, `VALUEWHEN`) and indicators (`MACD`, `KDJ`, `RSI`, `BOLL`, `ATR`, `CCI`, `DMI`, `TRIX`, `KTN`, `VR`, `EMV`, `PSY`, `WR`, `BIAS`).

## AI Components
None.

## Connectors
Huobi kline endpoint.

## Fit
Formula-language bridge that lets Chinese platform indicator code run in plain Python without TA-Lib.
