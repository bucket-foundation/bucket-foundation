<!-- voice-ignore-file -->
# CppCon 2017: Carl Cook “When a Microsecond Is an Eternity: High Performance Trading Systems in C++”

- **Video ID**: `NH1Tta7purM`
- **URL**: https://www.youtube.com/watch?v=NH1Tta7purM
- **Channel**: CppCon — https://www.youtube.com/channel/UCMlGfpWw-RUdWX_JbLCukXg
- **Uploaded**: 20171008
- **Duration**: 1:00:07 (3607s)
- **Views**: 361462  ·  **Likes**: 8081
- **Captured**: 2026-11-27T09:21:18

## Description

http://CppCon.org
—
Presentation Slides, PDFs, Source Code and other presenter materials are available at: https://github.com/CppCon/CppCon2017
—
Automated trading involves submitting electronic orders rapidly when opportunities arise. But it’s harder than it seems: either your system is the fastest and you make the trade, or you get nothing. 

This is a considerable challenge for any C++ developer - the critical path is only a fraction of the total codebase, it is invoked infrequently and unpredictably, yet must execute quickly and without delay. Unfortunately we can’t rely on the help of compilers, operating systems and standard hardware, as they typically aim for maximum throughput and fairness across all processes. 

This talk describes how successful low latency trading systems can be developed in C++, demonstrating common coding techniques used to reduce execution times. While automated trading is used as the motivation for this talk, the topics discussed are equally valid to other domains such as game development and soft real-time processing.
— 
Carl Cook: Optiver, Software Engineer

Carl has a Ph.D. from the University of Canterbury, New Zealand, graduating in 2006. He currently works for Optiver, a global electronic market maker, where he is tasked with adding new trading features into the execution stack while continually reducing latencies. Carl is also an active member of SG14, making sure that requirements from the automated trading industry are represented. He is currently assisting with several proposals, including non-allocating standard functions, fast containers, and CPU affinity/cache control.
—
Videos Filmed & Edited by Bash Films: http://www.BashFilms.com 

Work at Hudson River Trading (HRT): https://tinyurl.com/safxfctf
---

Videos Filmed & Edited by Bash Films: http://www.BashFilms.com

## Chapters

- `0s` — Introduction
- `268s` — Safety first
- `435s` — The role of C++
- `637s` — How fast is fast?
- `740s` — Slowpath removal
- `882s` — Template-based configuration
- `1016s` — Lambda functions are fast and convenient
- `1100s` — Memory allocation
- `1149s` — Exceptions in C++
- `1206s` — Prefer templates to branches
- `1328s` — Multi-threading
- `1374s` — If you must use multiple threads...
- `1420s` — Data lookups
- `1532s` — Fast associative containers (std: unordered_map)
- `1901s` — always_inline and noinine
- `2015s` — Keeping the cache hot
- `2270s` — Intel Xeon E5 processor
- `2431s` — Placement new can be slightly inefficient
- `2545s` — Small string optimization support
- `2602s` — Overhead of C++11 static local variable initialization
- `2644s` — std:: function may allocate
- `2726s` — std::pow can be slow
- `2888s` — Measurement of low latency systems

## Files

- `metadata.json` — full yt-dlp dump
- `transcript.txt` — plain text
- `transcript.vtt` — original captions
- `transcript.json` — timestamped chunks
- `chapters.json` — chapter markers
- `thumbnail.jpg`
