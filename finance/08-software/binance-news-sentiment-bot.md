# Binance News Sentiment Bot

https://github.com/CyberPunkMetalHead/Binance-News-Sentiment-Bot. License MIT. Stars 1,651. Last push 2022-03-16. Python. Checked 2026-11-27.

## Architecture
Single script `news-analysis.py` with an asyncio RSS fetch (`get_feed_data`, `get_headlines`), keyword categorisation, VADER sentiment (`analyse_headlines`, `compile_sentiment`, `compound_average`), then `buy` and `sell`. Feed list in `Crypto feeds.csv`.

## Data Layer
Crypto news RSS feeds and Binance websocket tickers.

## Event Loop
Timed loop: fetch headlines, score, trade.

## Execution
Binance spot market orders sized from lot-size rules (`calculate_volume`).

## Risk
Take-profit and stop-loss percentages, max coins in hand, state saved to file.

## Strategies Shipped
Buy a coin when the compound sentiment average and headline count pass thresholds; sell on target or stop.

## AI Components
VADER lexicon sentiment, no LLM.

## Connectors
Binance.

## Fit
Compact example of news-driven trading. Sentiment signal is weak; keep as a pattern for alert feeds.
