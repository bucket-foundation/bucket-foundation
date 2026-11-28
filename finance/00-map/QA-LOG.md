# QA Log

Bead `bkt-q5moa`. Pass dated 2026-11-27. Scope: 01, 03, 09, 10, 11, 12, sources and 06-youtube. Counts are items touched.

## Source Items

| Area | Upgraded | Fixed | Deleted | Still open |
|---|---|---|---|---|
| 09-strategies Grade C claim lines | 20 | 21 | 18 | 0 |
| 03-data-sources cells | 77 | 4 | 0 | 8 rows with unverified cells, 112 n/s cells |
| 10-markets-law, 11-people-firms, 01-money-history items | 28 | 3 | 0 | 4 |
| Prediction market case reconciliation | 1 | 2 | 0 | 2 |

Open items by name:
- Bloomberg and CME DataMine pages block automated fetches.
- Dukascopy, Lincoln Institute, SF Compute and Zillow license cells.
- CME compute futures launch, Flippa fees, Polymarket US state list, PBoC e-CNY page.
- 09-strategies README: SSRN and Alpha Architect pages return 403.
- Two Grade C rows in the case file: New York v. KalshiEX (S.D.N.Y. 1:26-cv-06550) and KalshiEX v. Murrill (W.D. La. 1:26-cv-04476) show as closed on a tracker with no stated reason.
- The `n/s` cells in DATA-SOURCES.md mark facts the provider page does not state; they stay until a provider documents them.

Seven cards (`pb-private-discount`, `pb-roll-up`, `pb-sba-buyout`, `rt-on-off-the-run`, `sb-matched-betting`, `sy-curve-lp`, `sy-rate-arb`) and the cards deleted in the first half now carry an empty Post-Publication Decay claim.

## Reconciliations

| Item | Result |
|---|---|
| NJ v. Kalshi docket | Third Circuit 25-1922, district court 1:25-cv-02152-ESK-MJS, Supreme Court 25A1465 then 26-299. Added to the case file. |
| Kentucky CFTC suit | Filed 2026-06-23 in E.D. Ky. (The Block, Bloomberg Law, Front Office Sports all dated 2026-06-23). The Atlas card said November 2026 and now says June. |
| Court events 2026-11-08 to 2026-11-27 | 4th Cir. affirmed denial of Kalshi's PI against Maryland on 2026-11-17, 2-1 (KalshiEX v. Martin, 25-1892). Supreme Court 26-299: response due 2026-12-07, no later entry. Two tracker closures above. No Utah hearing outcome found. |

## YouTube Digests

34 digests read against transcript.txt and transcript.json: 30 drawn at random (seed 527) plus the four named rechecks (Asness merger arbitrage, Dalio 5 percent, 1iJ34tTjwwo, wdQnaRL3D5w).

| Result | Count |
|---|---|
| Digests checked | 34 |
| Digests with at least one fix | 24 |
| Claim lines corrected | about 50 |
| Claim lines deleted | 2 |

Named rechecks:
- Asness (xWGlMuALK5g): the merger arbitrage line was reversed. Mitchell and Pulvino found that managers, after high fees, do not beat a lower-fee rules-based book.
- Dalio (eGtGKk0E_qk): the 5 percent answer is to the host's question about the 3 percent plan passing. The digest had tied it to Congress agreeing in private.
- 1iJ34tTjwwo: all cited claims found; the 60-line count is confirmed at 1:11.
- wdQnaRL3D5w: the borrow-source line overstated foundations and was corrected; other claims found.

Error types: reversed direction, wrong host or guest attribution, hedged statements stated as fact, timestamps minutes off. About one digest in four needed a fix, so the 130 digests outside the sample have the same risk.

## Digest audit

Bead `bkt-q5moa.27`. Pass dated 2026-11-27. Scope: the original 164 digests in 06-youtube that the YouTube Digests section above does not list as checked, plus 22 new digests. The earlier pass names only four digests; the 30 random ones are not named, so all 160 others were re-audited here.

Method: every claim bullet was matched against transcript.txt and the vtt word timeline. A claim stays only with a verbatim phrase found by grep in transcript.txt and a timestamp read from the vtt cue where the phrase starts. Claims whose numbers or content words were missing near the phrase were rewritten to the supported part or deleted. In 41 digests (flag list reviewed by hand) each flagged claim was read against the transcript window. In the other 119 a script applied the same rule: a clause stays only if at least 40% of its weighted content words and every number appear within 60 words of the phrase. Claims the script kept can still reverse a direction, because the script checks words and numbers only.

| Result | Count |
|---|---|
| Digests audited | 160 |
| Claim bullets before | 2,414 in 158 digests (two digests were edited before counts were taken) |
| Kept with new phrase and timestamp | 1,690 |
| Rewritten to the supported part | 321 |
| Deleted as unsupported | 403 |
| Claims added so SYNTHESIS citations resolve | 11 |
| Claim bullets after, all 160 digests | 2,048 |
| Phrases failing grep or cue check | 0 |

Examples from the hand-reviewed digests: a stress-test line in -tMyq-wQZBU said the edge had vanished while the transcript says the bot replaced a 67% estimate with 37%; a GLD and GDX line in 5G7YdjnRvVI was deleted because no speech near its stated time supported it. Framework and Architecture lines that only summarize the video were deleted when no phrase supported them.

SYNTHESIS.md: 23 citations pointed at claims that were deleted or rewritten. Each now cites a new claim with a phrase, or the unsupported figure was removed (75% compile rate, 1.25 times yield, $40-50k loss, $800,000 pay figure, 77% strategy figure, $400K versus $200K).

New digests: 22 videos with transcript.txt and no digest now have one, 305 claims in all, each with a grep-confirmed phrase and a vtt timestamp. Profit figures are tagged self-reported.

### Per-video counts

Columns: claims before, kept, rewritten, deleted, added. Mode is hand for the 41 reviewed digests and script for the rest.

| Video | Before | Kept | Rewritten | Deleted | Added | Mode |
|---|---|---|---|---|---|---|
| 0ZJXpMZobjY | 17 | 14 | 1 | 2 | 0 | hand |
| 0biSwEL5eMQ | 15 | 12 | 3 | 0 | 0 | hand |
| 0sLQ6AfNzw8 | 21 | 15 | 6 | 0 | 0 | hand |
| 1HoQI1eqnV8 | 16 | 10 | 5 | 1 | 0 | hand |
| 1mDL1fKEVZM | 16 | 13 | 2 | 1 | 0 | hand |
| 2ZbtXVScXJE | 17 | 11 | 5 | 1 | 0 | hand |
| 2_pDTWgJg94 | 14 | 13 | 1 | 0 | 0 | hand |
| 2bE2iyRBK1E | 15 | 15 | 0 | 0 | 0 | script |
| 2yycGEFCNYE | 16 | 12 | 3 | 1 | 0 | hand |
| 3EzdvkRgToY | 15 | 12 | 2 | 1 | 0 | hand |
| 3Ir6sbDAx4c | 15 | 14 | 1 | 0 | 0 | hand |
| 55OXxe_ix2o | 15 | 11 | 1 | 3 | 0 | script |
| 5G7YdjnRvVI | 15 | 10 | 2 | 3 | 0 | script |
| 5qo5gxmGEt8 | 17 | 13 | 4 | 0 | 0 | hand |
| 5v1EtiEuSEY | 18 | 16 | 2 | 0 | 1 | hand |
| 6HN-d9mC0DI | 14 | 11 | 3 | 0 | 0 | hand |
| 6mTvAjmF2-A | 16 | 10 | 5 | 1 | 0 | hand |
| 72qUcUAtRZc | 18 | 14 | 3 | 1 | 0 | hand |
| 78_GRGjlL6E | 15 | 12 | 2 | 1 | 0 | hand |
| 86AlV6174KI | 17 | 17 | 0 | 0 | 0 | hand |
| 8TJQhQ2GZ0Y | 11 | 7 | 4 | 0 | 0 | hand |
| 92WaNz9mPeY | 15 | 12 | 1 | 2 | 0 | hand |
| 9G1IDAqrWkg | 16 | 14 | 1 | 1 | 0 | hand |
| 9Y3yaoi9rUQ | 18 | 12 | 3 | 3 | 0 | hand |
| 9YtmGy-wfE4 | 15 | 13 | 2 | 0 | 0 | hand |
| 9kH01CNISeQ | 17 | 11 | 5 | 1 | 0 | hand |
| BN7ZAWRLJP0 | 14 | 11 | 1 | 2 | 0 | hand |
| BRUlSm4gdQ4 | 15 | 11 | 1 | 3 | 0 | script |
| BiqG3it0gY0 | 9 | 9 | 0 | 0 | 0 | hand |
| CNvz91Jyzbg | 16 | 9 | 5 | 2 | 0 | hand |
| CechARGinR4 | 15 | 12 | 2 | 1 | 0 | script |
| D2Jn1VrqjWI | 15 | 14 | 1 | 0 | 0 | hand |
| DW9zQ8Hz6gQ | 14 | 13 | 1 | 0 | 0 | hand |
| DZt1DDmMNGk | 15 | 7 | 6 | 2 | 0 | hand |
| F7e6SyOnOR8 | 16 | 14 | 0 | 2 | 0 | script |
| FJYgrkVbpEE | 18 | 15 | 2 | 1 | 0 | hand |
| FqaP3VTKccE | 16 | 8 | 5 | 3 | 0 | hand |
| G-MlrpoMig0 | 17 | 13 | 3 | 1 | 0 | hand |
| GR3gWN5ka0c | 16 | 12 | 4 | 0 | 0 | hand |
| HdHlfiOAJyE | 13 | 11 | 2 | 0 | 0 | hand |
| HqCksxcX49w | 17 | 14 | 2 | 1 | 0 | hand |
| IE9OJMyyWMY | 19 | 16 | 1 | 2 | 0 | hand |
| Iij2mpilSJo | 15 | 12 | 3 | 0 | 0 | hand |
| IqvnryFzZD4 | 15 | 10 | 4 | 1 | 0 | hand |
| JgGOtCskLRg | 13 | 11 | 2 | 0 | 0 | hand |
| K07qbvcvAH0 | 16 | 5 | 1 | 10 | 0 | script |
| KPc85Ixey8M | 12 | 10 | 1 | 1 | 0 | script |
| LJIwxiMxbaw | 14 | 9 | 2 | 3 | 0 | script |
| M1T0OlG3XEU | 18 | 10 | 0 | 8 | 0 | script |
| M23f8jouwWU | 13 | 7 | 2 | 4 | 0 | script |
| MXDozNbr7Js | 20 | 13 | 3 | 4 | 0 | script |
| N8gtnbJuMoo | 15 | 9 | 1 | 5 | 0 | script |
| NH1Tta7purM | 16 | 9 | 5 | 2 | 0 | script |
| Nx1U39sL7sE | 16 | 8 | 1 | 7 | 0 | script |
| PHb8EHIKfeQ | 16 | 13 | 0 | 3 | 0 | script |
| PHe0bXAIuk0 | 16 | 15 | 1 | 0 | 0 | script |
| PPl-7_RL0Ko | 15 | 7 | 3 | 5 | 0 | script |
| PRdd_LW2fpQ | 15 | 10 | 2 | 3 | 0 | script |
| QUTaQvnwLzM | 15 | 8 | 0 | 7 | 0 | script |
| QbosMr2JVrc | 14 | 8 | 3 | 3 | 0 | script |
| S1r6Jpdeomk | 17 | 15 | 1 | 1 | 0 | script |
| S7eig5VXFpY | 12 | 9 | 1 | 2 | 0 | script |
| SoB1gSmrSWM | 16 | 13 | 0 | 3 | 0 | script |
| TJpXnvFuvZg | 18 | 7 | 5 | 6 | 0 | script |
| TnS8kI_KuJc | 14 | 9 | 3 | 2 | 0 | script |
| TuTmC8aOQJE | 15 | 10 | 1 | 4 | 0 | script |
| U03Md5enU-0 | 13 | 7 | 6 | 0 | 0 | script |
| UD92QBqA8Eo | 17 | 13 | 1 | 3 | 0 | script |
| UgWQtQ3MEVE | 19 | 15 | 0 | 4 | 1 | script |
| VkUEWUxI6u0 | 16 | 12 | 2 | 2 | 0 | script |
| VlOjcOp9a5U | 10 | 8 | 0 | 2 | 0 | script |
| VzF-tvz3DAk | 17 | 13 | 1 | 3 | 0 | script |
| W2BURItNYmI | 17 | 7 | 4 | 6 | 1 | script |
| W58yBI7owRs | 10 | 10 | 0 | 0 | 0 | script |
| WQui_3Hpmmc | 15 | 13 | 1 | 1 | 0 | script |
| Wq-5pnceeLI | 17 | 11 | 2 | 4 | 0 | script |
| Y82q5Lw7_8E | 17 | 12 | 3 | 2 | 0 | script |
| YAO0St7mPQM | 14 | 9 | 2 | 3 | 0 | script |
| Z5yRMMVUC5w | 16 | 14 | 0 | 2 | 0 | script |
| ZVMTeDBmSrI | 16 | 13 | 1 | 2 | 0 | script |
| ZVU5IQpXzA0 | 20 | 13 | 2 | 5 | 2 | script |
| ZW18j-a-TuY | 16 | 12 | 3 | 1 | 0 | script |
| ZwS1gMGegrM | 11 | 9 | 0 | 2 | 0 | script |
| _76ZkKpdLAw | 16 | 11 | 1 | 4 | 0 | script |
| _87QHZXOOKA | 17 | 10 | 1 | 6 | 0 | script |
| _B_24GUWdSM | 14 | 12 | 0 | 2 | 0 | script |
| _IFUfFuyQlU | 16 | 14 | 1 | 1 | 0 | script |
| _SpIaGTq0u8 | 17 | 12 | 2 | 3 | 0 | script |
| a5PF2PcElV0 | 14 | 11 | 1 | 2 | 0 | script |
| aga-Tak3c3M | 17 | 15 | 0 | 2 | 0 | script |
| akrWQxUqjq8 | 11 | 9 | 0 | 2 | 0 | script |
| b1e4t2k2KJY | 17 | 10 | 3 | 4 | 0 | script |
| bKmcRfE3I6E | 15 | 14 | 0 | 1 | 0 | script |
| bu2416DJSBc | 17 | 9 | 2 | 6 | 0 | script |
| cDlbEQz1PQk | 16 | 11 | 4 | 1 | 0 | script |
| cECouzfzqnM | 18 | 11 | 2 | 5 | 0 | script |
| chSHqogx2CI | 15 | 12 | 2 | 1 | 0 | script |
| dHlBxjbzrtU | 12 | 8 | 3 | 1 | 0 | script |
| e4ytbIm2Xg0 | 14 | 13 | 0 | 1 | 0 | script |
| eG_aRPy1KVE | 14 | 10 | 2 | 2 | 0 | script |
| eLLarGvuBzY | 11 | 9 | 1 | 1 | 0 | script |
| ePT6aMqk2Oo | 18 | 7 | 3 | 8 | 0 | script |
| eTXixzzC-34 | 14 | 11 | 2 | 1 | 0 | script |
| f9XFM8YLccg | 14 | 12 | 0 | 2 | 0 | script |
| fIxSae8k3t0 | 8 | 5 | 0 | 3 | 0 | script |
| fOCzNFwmM7Y | 16 | 9 | 0 | 7 | 0 | script |
| g4K3uyMdVUo | 15 | 8 | 4 | 3 | 0 | script |
| gJLKVsIqiTE | 15 | 12 | 2 | 1 | 0 | script |
| gZweef8LX7M | 15 | 9 | 1 | 5 | 0 | script |
| gi2uH3YxohU | 16 | 10 | 2 | 4 | 1 | script |
| h-0NZ-oIjlk | 16 | 9 | 3 | 4 | 0 | script |
| h_8ZtD21I84 | 14 | 9 | 3 | 2 | 0 | script |
| i2evTEaieY4 | 11 | 9 | 0 | 2 | 0 | script |
| i3UmPsCQGVk | 16 | 14 | 0 | 2 | 0 | script |
| iUVSHMAHrok | 18 | 7 | 4 | 7 | 1 | script |
| iVxaTC7Qp44 | 17 | 8 | 4 | 5 | 0 | script |
| i_pLF9J3QPE | 14 | 9 | 3 | 2 | 0 | script |
| iqEFMb1aKNU | 16 | 14 | 1 | 1 | 0 | script |
| joXDV5eqOoY | 11 | 6 | 2 | 3 | 0 | script |
| jtTl_QKxyq4 | 15 | 7 | 4 | 4 | 0 | script |
| kAl8DezwLAE | 18 | 12 | 2 | 4 | 0 | script |
| kLJEXE5_7rI | 9 | 5 | 0 | 4 | 0 | script |
| kYGswg7KNMU | 15 | 3 | 5 | 7 | 0 | script |
| l1kLCrxL9Hk | 15 | 12 | 2 | 1 | 0 | script |
| lE0Eu19547Q | 15 | 5 | 5 | 5 | 0 | script |
| nmehlS-8b3Y | 17 | 8 | 6 | 3 | 0 | script |
| pKF4M9_LpQ8 | 17 | 12 | 2 | 3 | 0 | script |
| pjLbNM0jcc4 | 16 | 11 | 2 | 3 | 1 | script |
| qEp6mwNw68g | 15 | 6 | 4 | 5 | 0 | script |
| qdbkvD4N-us | 15 | 10 | 2 | 3 | 0 | script |
| qfK9rCDCicE | 18 | 11 | 2 | 5 | 0 | script |
| rMsu4v-UlkA | 15 | 13 | 0 | 2 | 0 | script |
| ro07evEWbCE | 17 | 15 | 2 | 0 | 0 | script |
| rxHu93YzHpc | 17 | 11 | 1 | 5 | 0 | script |
| sAONff8XU80 | 13 | 9 | 2 | 2 | 0 | script |
| sFwyS-L-aDE | 15 | 9 | 1 | 5 | 0 | script |
| tL7Lcl90Sc0 | 14 | 10 | 3 | 1 | 0 | script |
| tODXAJDZtow | 16 | 8 | 4 | 4 | 1 | script |
| txTaBKZ8qrs | 15 | 9 | 3 | 3 | 0 | script |
| uBeM1FUk4Ps | 16 | 11 | 1 | 4 | 0 | script |
| vc5dotshPZc | 15 | 13 | 2 | 0 | 0 | script |
| vuGvQM-oH-0 | 15 | 14 | 0 | 1 | 0 | script |
| vucQ8ila814 | 16 | 12 | 3 | 1 | 0 | script |
| wNEWK5sBJog | 16 | 9 | 3 | 4 | 0 | script |
| wRdx7kVNQ_E | 15 | 10 | 2 | 3 | 0 | script |
| wvXDB9dMdEo | 11 | 9 | 1 | 1 | 0 | script |
| x2pY9kI0zBY | 14 | 10 | 1 | 3 | 1 | script |
| xKZ_8ULR91Y | 15 | 7 | 3 | 5 | 0 | script |
| xfzGZB4HhEE | 16 | 4 | 2 | 10 | 0 | script |
| y4z1FSdN_GA | 10 | 7 | 1 | 2 | 0 | script |
| y_IMH8erqds | 16 | 10 | 3 | 3 | 0 | script |
| y_bsjZThP0o | 17 | 12 | 2 | 3 | 0 | script |
| yrmqYNvvIzs | 14 | 10 | 3 | 1 | 0 | script |
| ywl3pq6yc54 | 17 | 12 | 2 | 3 | 0 | script |
| yxqTervPZe8 | 17 | 15 | 0 | 2 | 0 | script |
| zH2Mg782XhA | 17 | 8 | 1 | 8 | 0 | script |
| zR9PpXWsKFQ | 17 | 11 | 2 | 4 | 1 | script |
| zapp8smQKhg | 12 | 10 | 2 | 0 | 0 | script |
| -tMyq-wQZBU | n/a | 14 after | n/a | n/a | 0 | hand |
| 0AuPs0VT26k | n/a | 14 after | n/a | n/a | 0 | hand |

### New digests

| Video | Claims |
|---|---|
| 11VGnw9Fu48 | 8 |
| bHS8PAa9QS4 | 13 |
| byV7GtcQGww | 14 |
| cl67ow5hbns | 14 |
| dh7A2VyveUw | 14 |
| dt0LctyMniQ | 15 |
| _EIa3XChAcQ | 12 |
| -F0dZ2GxSuA | 13 |
| glgHYXz7cjI | 15 |
| J3VEniAKg5A | 13 |
| JZbuLchDbbw | 13 |
| kCAmRgUza-E | 14 |
| LfO5Z-hWS5E | 15 |
| mrl3I4oBxNE | 14 |
| qLIgx0S8D0w | 14 |
| r95bEutZUN4 | 15 |
| u5UUjHZQCFk | 15 |
| V8JpaPXYrUg | 15 |
| Vdlw6kViw4Y | 15 |
| vQtn7xW5HuY | 15 |
| Vu0XZSz-aj4 | 15 |
| WiiQBg71Mz4 | 14 |
