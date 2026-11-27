<!-- voice-ignore-file: transcript-derived digest -->
# How to Build an Exchange | Jane Street | b1e4t2k2KJY | 0.64 h

Teaches: A Jane Street engineer's university talk on exchange architecture: a limit order book served by a single in-memory matching engine, multicast messaging, state machine replication, a passive backup engine and per-topic sequence numbers instead of locks. The talk ends with a recruiting pitch.

Claims:
- A limit order book sorts bids high to low and offers low to high; add orders are about half of all messages, cancels 30 to 40%, executions 1 to 2%. "cancels are probably like 30 or 40%" [0:02:42]
- US equity scale cited: about 3 million messages per second at peak, thousands of connections, millions of live orders and around 10,000 symbols. "us equities maybe around 10 000 symbols" [0:03:52]
- Multicast uses UDP, so retransmit servers keep messages by sequence number and the matching engine keeps an in-memory copy as a last resort. "keep you know an in memory copy" [0:13:44]
- State machine replication lets any application be rebuilt by replaying the day's messages; the matching engine is protected by a passive twin running identical code that listens to the engine output, with manual failover and no Paxos. "state machine and actually the identical code" [0:19:11]
- About 30% of engine time can go to one cache-missing array lookup. "actually spend about 30% of their time" [0:26:00]
- Concurrency uses a topic per message and a sequence number per topic. "we have a sequence number per topic" [0:28:43]
- Symbol-level parallelism is limited because Jane Street wants atomic risk limits across overlapping ETFs. "are atomic and that's at the level" [0:35:14]

- One totally ordered stream drives every component. "come from that global totally ordered stream" [0:33:55]

Worked:
- Deterministic replay for testing new matching engines plus fuzz testing. "roll out new matching engines we replay" [0:36:05]

Failed:
- Instinet's hidden orders that kept price improvement led participants to probe every price point. "orders that would try every price point" [0:07:26]
- Exchanges that stacked several matching engines under one sequence stream gave clients multiple sequence spaces instead, because of cost and complexity. "engines they had one essentially sequence stream" [0:27:15]
- Java's complex garbage collector and threading made determinism harder than OCaml. "collector a more complex um multi threaded" [0:23:49]
- Paxos was judged too complex and slow and he knows of no exchange using it. "one and there are systems like paxos" [0:19:45]
