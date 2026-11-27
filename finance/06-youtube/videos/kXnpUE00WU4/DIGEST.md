<!-- voice-ignore-file: transcript-derived digest -->
# Freqtrade - Make A Trading Strategy | FREQS | kXnpUE00WU4 | 0.22 h

Teaches: FREQS tutorial (2022) on creating a custom Freqtrade strategy by combining the sample strategy with a community one: minimal ROI, stop loss, timeframe, Bollinger bands, TEMA and Heikin Ashi indicators, and testing in Docker with Telegram.

Claims:
- Minimal ROI is the target gain and the stop loss should be sized with it; the tutorial cuts a 10 percent stop to 3 percent against a 1 percent ROI. "I'm going to change this to 3 stop loss" [0:03:22]
- The strategy timeframe must be supported by the exchange, and the example moves from 5 to 15 minute candles. "your time frame needs to be compatible with your exchange" [0:03:44]
- The sample entry buys when RSI crosses above 30 to show upward momentum, with TEMA at or below the middle Bollinger band and rising, and volume above zero. "when the rsi crosses above 30" [0:06:09]
- Heikin Ashi candles remove noise and pair with macro indicators such as an EMA 20 over EMA 50 golden cross. "hikanashi candles remove a little bit of the noise" [0:09:02]
- He deletes the RSI cross condition to force quick trades for demonstration, and warns that shift negative one should never be used because it reads the future. "shift negative one should never be" [0:06:48]
- The bot is restarted with docker compose up and confirms through Telegram that it uses the combined strategy with 1 percent ROI and 3 percent stop loss. "it's finding already with the little blue circle" [0:12:47]

Architecture: Freqtrade combined strategy class selected in docker-compose.yml, notifications via Telegram.

Worked:
- none reported

Failed:
- none reported
