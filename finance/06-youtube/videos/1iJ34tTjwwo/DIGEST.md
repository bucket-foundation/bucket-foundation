<!-- voice-ignore-file: transcript-derived digest -->
# What Are MCP Servers? (And How I Built an AI Trading Bot on It) | Harkirat Singh | 1iJ34tTjwwo | 1.25 h

Teaches: A live build of an MCP server for the Zerodha broker: register a Kite Connect app, place orders from a Bun script, then wrap buy, sell and portfolio functions as MCP tools that Claude Desktop calls over stdio. No strategy is built. No promotion appears in the transcript.

Claims:
- MCP is an Anthropic protocol that lets an LLM call outside services; Claude supports it and other LLMs did not yet [0:05:00]-[0:06:00].
- He says trading is a weak use case for MCP, and that letting AI trade is worse because latency matters [1:13:00].
- A Kite Connect app is limited to the developer's own client ID unless Zerodha approves wider use; historical data costs 2,000 rupees [0:16:00], [0:20:00].
- Login runs through OAuth: a login URL returns a one-time request token that is exchanged for an access token, which can be cached [0:21:00]-[0:25:00], [0:31:00].
- One SDK call places a regular NSE market order with product CNC; the buy and sell showed up in the Zerodha account [0:27:00]-[0:30:00], [0:32:00].
- The MCP server uses the TypeScript SDK, zod input schemas and tool definitions; stdio transport fits Claude spawning the server on the same machine [0:40:00]-[0:49:00].
- Claude Desktop needs developer mode and the absolute path to the script; tool names containing spaces were rejected [0:53:00]-[0:57:00].
- Claude first treated the buy tool as a fake interface; after the descriptions said it places real exchange orders, it executed them [0:58:00]-[1:01:00].
- The finished server is under 60 lines with buy stock, sell stock and show portfolio tools; Claude sold the remaining holdings after reading the portfolio [1:09:00]-[1:11:00].

Architecture: Data: Zerodha holdings and last price through the Kite SDK. Signal: none, the user types the command. Model: Claude Desktop choosing among three tools. Execution: Bun MCP server over stdio sending market orders to Zerodha. Risk: only Claude's per-chat tool-allow prompt [0:58:00].

Worked:
- SDK orders filled and appeared in the live account [0:30:00], [0:32:00].
- Claude chose the right tool from a plain request and liquidated one ITC share [1:10:00].
- Portfolio tool returned positions once the access token was set globally [1:07:00]-[1:08:00].

Failed:
- First run returned an invalid access token because the request token had expired [0:29:00].
- A tool name with spaces was rejected by Claude Desktop [0:56:00].
- A purchase of two Asian Paint shares failed for lack of funds [1:03:00].
- The portfolio tool first returned "object Object" [1:07:00].
- The speaker says nobody will use this server; no returns or backtest appear.
