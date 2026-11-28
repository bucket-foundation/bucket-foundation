<!-- voice-ignore-file: transcript-derived digest -->
# Crypto Trading Bot in Python For Coinbase | NeuralNine | BN7ZAWRLJP0 | 0.42 h

Teaches: How to connect to the Coinbase Pro API in Python with the cbpro library, query market data, place and cancel buy and sell orders, and run a trivial price-threshold loop. The speaker says it is not financial advice and the strategy is only a demo.

Claims:
- Coinbase Pro API keys come with a public key, a secret and a passphrase; the secret and passphrase are shown only once and permissions (view, trade, transfer) are set at creation. "and once you create that api key" [0:02:49]
- A public client gives products, currencies, time, order book, ticker, 24-hour stats and trades without credentials; an authenticated client is needed to buy, sell or read account data. "can also see the 24 hour stats" [0:06:33]
- Buy and sell calls accept limit orders (price and size) and market orders (size only), plus place_limit_order and place_market_order variants, with cancel_all and get_orders. "with off client dot place market order" [0:16:42]
- The demo bot polls the ticker, buys 0.2 units if price falls below 25,000 and sells 0.3 units if it rises above 30,000, sleeping between checks. "if the currency falls below 25 000" [0:19:16]
- The speaker says a real bot would use a better strategy such as moving average crossovers or an ML price model. "would use moving averages that are crossing" [0:24:05]

Architecture:
- Data: Coinbase Pro public ticker and order book. "example public client get product order book" [0:05:49]
- Signal: fixed price thresholds (buy below, sell above), made up for the demo. "can see here rose above selling price" [0:23:20]
- Execution: cbpro authenticated client, market orders in a while-true loop with a 10 second sleep (changed to 2 seconds for the demo). "else print nothing and time sleep 10" [0:21:36]
- API keys can be scoped to view-only or to trading permissions. "i can only view stuff" [0:02:34]

Worked:
- Authentication check: a wrong passphrase returned "invalid passphrase", and a valid one returned the accounts. "we have we have an authenticated account" [0:10:35]
- The loop printed price status and triggered sell messages when the price rose above the set sell price. "can see here rose above selling price" [0:23:20]

Failed:
- Test buy and sell orders were intentionally impossible and returned "insufficient funds"; no real trades were made. "that so it would say insufficient funds" [0:15:29]
