<!-- voice-ignore-file: transcript-derived digest -->
# Claude's New Trading Agent Is Insane! (Tutorial) | Samin Yasar | x2pY9kI0zBY | 0.46 h

Teaches: Connecting Claude to a broker connector (named Liquid Trade, connector "Co-invest"), the Quiver Quant MCP for insider and politician trades, and Firecrawl for page monitoring, then creating scheduled routines that copy trades or act on Discord alerts. The creator promotes a paid school community and a Claude Club, so the framing is promotional.

Claims:
- Claude gets stocks, crypto, forex, commodities and prediction markets through one connector, set up from liquid.trade. "trade stocks crypto forex uh prediction markets" [0:03:45]
- He starts in paper trading mode and places test orders in Bitcoin, Ethereum, Tesla, EUR/USD and gold. "these orders i bought bitcoin ethereum tesla" [0:07:18]
- He opens with a politician on a roughly 285k salary and a 67 million net worth as the reason to track insiders. "somehow the net worth is 67 million" [0:01:50]
- He advises Claude Code over chat because it "works a lot better" at making trades happen. "code okay code works a lot better" [0:11:30]
- The copy-trade routine runs every 30 minutes in market hours, checks new insider buys, calculates a position and asks for approval before executing. "30 minutes during the market hours check" [0:17:42]
- A fully automatic mode is possible: "if you just wanted it to go YOLO". "just wanted it to go yolo you" [0:19:46]
- Firecrawl reads a Discord channel page and a routine acts on buy or sell alerts every 30 minutes. "this channel check in every 30 minutes" [0:24:21]
- Strategy claim: a compound annual growth rate of 45% looks pretty good (self-reported, unverified). "compound annual growth rate looks pretty good at 45%" [0:14:58]

Architecture: Data: Quiver Quant (politician and insider trades, filings) and Firecrawl page text. Signal: copy a chosen trader's strategy or parse a Discord alert. Model: Claude Code with scheduled routines. Execution: broker connector, paper account first. Risk: paper mode, approval prompt before each trade, notifications in app or Telegram [0:18:00].

Worked:
- Connectors installed and a paper portfolio displayed inside Claude. "me show you how to actually connect" [0:07:50]
- Routine creation succeeded for the Tim Moore copy trade and for the Discord alert monitor. "this is the tim moore copy trade" [0:17:33]

Failed:
- The test alert was a single "buy Bitcoin at current price" message. "someone buy bitcoin at current trading price" [0:24:11]
- Quiver Quant showed insiders selling Tesla, which he took as a reason not to buy. "if insiders are buying or selling tesla" [0:13:44]
