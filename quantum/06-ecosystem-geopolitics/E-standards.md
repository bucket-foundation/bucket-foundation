# Standards bodies · E-standards
**Layer:** L5 Ecosystem & geopolitics · **Chapter:** §06 · **Status:** depth

## Summary
Standards are where quantum stops being physics and becomes procurement. The mature front is **post-quantum cryptography**: NIST finalized **FIPS 203 (ML-KEM)**, **FIPS 204 (ML-DSA)**, and **FIPS 205 (SLH-DSA)** in **August 2024**, selected **HQC** as a backup KEM in **March 2025**, and US EO 14144 (Jan 2025), reinforced by the **22 June 2026 PQC EO** (deadlines 2030/2031, see E-us, E-pqcmarket), pushed federal migration. Everything else — terminology, benchmarking, QKD certification — runs years behind, spread across ISO/IEC, ETSI, ITU, IEEE, and the new **ISO/IEC JTC 3** committee dedicated to quantum technologies. Standards racing is itself geopolitical: China dominates **QKD** standardization the way it dominates QKD patents (see E-patents), while the SI-metrology standards war is its own node (E-metrology-gov).

## The numbers (graded, with caveats)
- T2 3 finalized NIST PQC standards (FIPS 203/204/205, Aug 2024) + HQC selected Mar 2025 — csrc.nist.gov. Published, testable standards — the hardest artifact in this layer.
- T5 Migration deadlines: NSA **CNSA 2.0** targets ~2033 for full national-security-system transition; the June 2026 EO adds OMB high-value-asset deadlines (key establishment 2030, signatures 2031). Deadlines are policy, so they slip.

## Key graded claims
- T2 ISO/IEC JTC 1/WG 14 (renamed "Quantum Information Technology") published ISO/IEC 4879 terminology — jtc1info.org (established)
- T2 ISO/IEC 23837-1/-2 define security requirements + test/evaluation methods for QKD systems — ISO/IEC SC 27 WG 3 (established)
- T2 **ISO/IEC JTC 3** on quantum technologies stood up (kick-off spring 2024) — the first top-level ISO committee dedicated to quantum, a governance milestone — CEN/CENELEC / NPL TQE19 (established)
- T3 **ETSI ISG-QKD** maintains the GS QKD series — the oldest quantum standards effort, running since 2008 (established as activity; deployment adoption thin)
- T3 ITU-T ran **FG-QIT4N** producing terminology for quantum networks/QKD; SG13/SG17 carry follow-on work (demonstrated)
- T4 IEEE efforts (P7130 terminology, P7131 benchmarking) remain drafts with limited industry pull (claimed)
- T5 **NSA's position that QKD is unsuitable for national-security systems** (favoring PQC) is a live standards-war fault line against China's QKD-heavy strategy (contested)

## Conflicts / open questions
- **C-qkd-vs-pqc:** US agencies favor PQC over QKD; China builds QKD backbones. Resolution: a decade of deployment economics and any PQC break.
- **Benchmarking vacuum:** what counts as a "logical qubit" or a "QuOp" remains unstandardized while procurement targets (E-uk ProQure) already cite them — buyers are writing contracts against undefined units.
- Terminology fragmentation: QED-C, CEN/CENELEC JTC 22, ISO WG14, and JTC 3 all issue overlapping vocabularies.

## Sources
- https://csrc.nist.gov/projects/post-quantum-cryptography
- https://jtc1info.org/sd-2-history/jtc1-working-groups/wg-14/
- https://www.nist.gov/document/worldwide-standardization-activity-quantum-key-distribution
- https://eprintspublications.npl.co.uk/9298/1/TQE19.pdf
- https://www.cencenelec.eu/media/CEN-CENELEC/AreasOfWork/CEN-CENELEC_Topics/Quantum%20technologies/Documentation%20and%20Materials/fgqt_q06_standardizationroadmapquantumtechnologies_release1-1.pdf
- https://quantumconsortium.org/publication/quantum-terminology-standards/
