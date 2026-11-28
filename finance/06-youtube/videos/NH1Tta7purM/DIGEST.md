<!-- voice-ignore-file: transcript-derived digest -->
# CppCon 2017: Carl Cook, When a Microsecond Is an Eternity: High Performance Trading Systems in C++ | CppCon | NH1Tta7purM | 1.00 h

Teaches: Low-latency C++ techniques from a market-making developer at Optiver: keep the rarely run hot path fast by warming caches, cutting branches and virtual calls, avoiding allocation, and measuring with a wire-tap lab setup. The speaker is an employee describing his own production practice; timings are his own and unverified.

Claims:
- Market makers quote buy and sell prices and earn the spread; they are not trying to hold a directional position, and success means being slightly faster than competitors. "and success means being just slightly faster" [0:03:59]
- Jitter matters more than a lower median, so a tighter deviation beats a faster median. "a lower median but the standard deviation" [0:07:03]
- A wire-to-wire time of 2.5 microseconds is less time than light takes to fall from the top of the Burj Khalifa to the ground. "less time than it takes for light" [0:11:21]
- Replacing error-handling branches with one flag check saved 100 to 200 nanoseconds. "yeah so where is the error checking" [0:14:13]
- Putting the needed market field (quantity multiplier) into the instrument's cache line avoids a lookup. "example the quantity multiplier from the market" [0:25:08]
- Most important tip: send 1,000 to 10,000 simulated orders through the system (stopped before the exchange) to keep instruction cache, data cache and branch predictor warm; he says this gives a 5 microsecond speedup. "number somewhere between 1 000 to 10" [0:35:34]
- Hyper-threading shares cache and slowed single-threaded sorting in his example; he disables all but one core to keep the L3 cache for the hot thread. "a core if you're hyper threading cache" [0:10:04]
- Exceptions cost nothing unless thrown (1 to 2 microseconds when thrown) in his measurements. "and only that one out of 1" [0:31:31]

- Measure first; understand the compiler (Compiler Explorer), the machine cache, and system tuning; make the hot path simple, branch-light and allocation-free; push expensive work off the hot path; confirm every change with production-like timing. "system the same binary the same everything" [0:09:16]

Worked:
- Wire-tap measurement gives lab results that match production speedups and slowdowns. "you see a speedup in this lab" [0:51:53]

Failed:
- He says new code he expected to be faster measured slower. "do do measure it it's always slower" [0:54:09]
- Profile-guided optimization can overfit and give uneven results. "question do i use profile guided optimization" [0:36:41]
- Distribution GCC kept the old string ABI, so he stayed on copy-on-write strings in 2017. "in 2017 i'm still stuck with copy" [0:43:13]
- The lab rig is hard to set up; forgotten interrupt settings, CPU affinity or a colleague compiling on the server break it. "interwraps or you forgot to set cpu" [0:52:10]
