# Satellite QKD · A-satqkd
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3)

## What it is
Distributing quantum keys (and entanglement) via satellite, where photon loss through vacuum beats fiber's exponential attenuation over continental distances. A satellite either acts as a **trusted relay** between two ground stations (it holds both keys and XORs them — secure only if you trust the spacecraft) or **beams entangled pairs** to two stations at once (end-to-end secure, no trust in the satellite, but far lower rate). This is the near-term route to intercontinental quantum-secure links while fiber repeaters (`A-qinternet`) mature.

## Maturity & real deployments (2025–26)
Demonstrated at scale by China; entering an early commercial phase globally.
- **Micius** (launched 2016, USTC/CAS) is the flight-heritage benchmark: entanglement distribution over 1,200 km (Yin et al., Science 2017), decoy-state QKD downlink, and the 2017 Beijing–Vienna intercontinental video call secured by satellite-relayed keys. It is a ~600 kg spacecraft needing large, expensive ground stations.
- **Jinan-1** (2022, operational) is the practicality milestone. It shrank the payload to **~22.7 kg** and the satellite to **~95.9 kg**, cutting cost roughly **45×** while raising key rates **2–3 orders of magnitude** over Micius. Using an 850 nm source at 625 MHz rep rate (~250 million photons/s transmitted), it generated **up to 1.07 million secure bits in a single pass** and ran **real-time** QKD with portable (~100 kg) ground stations, enabling one-time-pad-encrypted image transfer between China and South Africa over 12,900 km (Nature, March 2025). Real-time on-board key handling — not post-pass processing — is the operational jump.
- **Europe**: EAGLE-1 (ESA/SES) is Europe's first end-to-end satellite QKD system, launch slated 2026, feeding EuroQCI's space segment. **Toshiba** announced a satellite QKD transmitter–receiver interoperable with terrestrial fiber QKD (Jan 2026). **SealSQ** began launching a six-satellite QKD/PQC constellation (Jan 2025).

## Key graded claims
- T2 Satellite entanglement distribution over 1,200 km — Yin et al., Science 356 (2017) (established)
- T2 Real-time microsatellite QKD, up to 1.07 Mbit secure key/pass, 12,900 km China–South Africa link, ~45× cheaper spacecraft — Li et al., Nature (2025) (demonstrated)
- T4 EAGLE-1 launch and end-to-end European satellite QKD service by ~2026–27 — ESA/SES, arXiv:2505.20838 (roadmap)
- T4/T6 Chinese multi-satellite quantum constellation / space quantum internet by ~2030 — CAS/USTC statements (roadmap)

## Conflicts / open questions
- **Trust model**: downlink QKD via a single satellite is trusted-node — the spacecraft (and whoever controls it) knows the key — unless it distributes *entanglement* end-to-end, which costs orders of magnitude in rate. Most fielded/announced systems are the trusted-relay kind.
- **Operations**: daytime operation (sky background swamps single photons), weather/cloud outage, and pointing over fast LEO passes limit availability. Whether the key-rate-per-dollar beats just deploying PQC (`A-pqc`) on the same links is the live commercial question.

## The honest call
**Demonstrated and near-commercial, led decisively by China.** Jinan-1 turned satellite QKD from a hero experiment into something that looks like a deployable service, and Europe is a launch or two behind. But it inherits QKD's core limitation — it distributes keys, still needs classical authentication, and the cheap version trusts the satellite — so it is a strategic-sovereignty capability for states and critical infrastructure, not a mass-market technology.

## Sources
- https://www.nature.com/articles/s41586-025-... (Jinan-1 real-time microsatellite QKD)
- https://postquantum.com/industry-news/microsatellite-qkd-record/
- https://en.wikipedia.org/wiki/Quantum_Experiments_at_Space_Scale
- https://arxiv.org/pdf/2505.20838 (EAGLE-1 / European satellite QKD)
- https://spaceinsider.tech/2025/12/12/top-10-qkd-players-and-the-road-to-commercial-qkd-in-space-based-secure-communications/
