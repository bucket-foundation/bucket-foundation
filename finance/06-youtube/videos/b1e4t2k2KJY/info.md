<!-- voice-ignore-file -->
# How to Build an Exchange

- **Video ID**: `b1e4t2k2KJY`
- **URL**: https://www.youtube.com/watch?v=b1e4t2k2KJY
- **Channel**: Jane Street — https://www.youtube.com/channel/UCDsVC_ewpcEW_AQcO-H-RDQ
- **Uploaded**: 20170313
- **Duration**: 38:17 (2297s)
- **Views**: 325923  ·  **Likes**: None
- **Captured**: 2026-11-27T09:21:09

## Description

Electronic exchanges play an important role in the world financial system, acting as focal points where actors from across the world meet to trade with each other.

But building an exchange is a difficult technical challenge, requiring high transaction rates, low, deterministic response times, fairness, and reliability.

This talk looks at the question of how to design an exchange through the lens of JX, a crossing engine we built at Jane Street in the last two years.  Performance plays an interesting role in this design, in that, although the end-to-end latency of the system is not important in and of itself, the ability of individual components of JX to handle messages rates in the 500k/sec range with latencies in the single-digit microseconds helped us build a replicated system that is both simple and robust.

## Chapters

- `0s` — The limit order book
- `90s` — Core exchange messages
- `211s` — System requirements and goals
- `461s` — Exchange architecture design
- `743s` — Multicast and retransmission
- `838s` — Port functionality and recovery
- `1086s` — Matching engine redundancy
- `1292s` — Performance and optimization
- `1487s` — Parallelism considerations
- `1677s` — Conflict resolution mechanisms
- `2002s` — Summary and takeaways

## Files

- `metadata.json` — full yt-dlp dump
- `transcript.txt` — plain text
- `transcript.vtt` — original captions
- `transcript.json` — timestamped chunks
- `chapters.json` — chapter markers
- `thumbnail.jpg`
