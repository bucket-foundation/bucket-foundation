# Evidence search worker

The CPU encoder behind evidence search, bead `ros-ai-worker`, under [learning/research-os/ai/IMPLEMENTATION.md](../../learning/research-os/ai/IMPLEMENTATION.md), "API and worker contracts". It embeds a query with a pinned model and scores the chunk vectors of the admitted corpus, and it returns ids and scores. Keyword ranking, fusion and every access decision stay in the Next server, in `src/lib/research-os/evidence-search/`.

## Commands

Run from this directory.

```bash
python3 -m evidence_search verify                     # model files, license and runtime against the pins
python3 -m evidence_search probe --out probe.json     # machine, memory, disk, load and encode timings
python3 -m evidence_search build-vectors ../../local/evidence/<corpus revision> --batch 32
EVIDENCE_WORKER_SECRET=<32+ characters> \
  python3 -m evidence_search serve --vectors ../../local/evidence/vectors/<corpus revision>/minilm-l6-v2
```

`serve` binds `127.0.0.1:8431` by default and refuses any address off this machine. The server sends the same secret in `x-evidence-worker-key`.

## Pins

| File | Pins |
|---|---|
| `models.json` | `sentence-transformers/all-MiniLM-L6-v2` at revision `1110a243fdf4`, Apache-2.0 by its README at that revision, 384 dimensions, mean pooling, cosine, and a SHA-256 for each of its 11 files |
| `runtime.lock.json` | Python 3.13, torch 2.9.1+rocm6.4, transformers 5.5.3, sentence-transformers 5.4.0, tokenizers 0.22.2, numpy 2.5.1, safetensors 0.8.0rc0 |

The encoder loads with the Hugging Face offline switches set and remote code off, so a missing file is an error and never a download. `verify` and the encoder refuse to run when a file hash, the license or a package version differs.

## Vectors

`build-vectors` reads a corpus from `scripts/research-os/evidence/build-corpus.ts`, checks `sources.jsonl` against its manifest, and chunks each body at 192 word pieces with 32 of overlap, counted by the model's tokenizer. It writes `matrix.f32`, `chunks.jsonl` and a manifest pinning both under `local/evidence/vectors/<corpus revision>/minilm-l6-v2/`. A chunk is a byte span of the normalized body and carries no text. The index checks every hash on load.

The pinned `tokenizer.json` carries the model's truncation at 128 tokens. Chunking with it on would keep a long body's first window and drop the rest, so the encoder turns truncation off and chunking refuses a tokenizer that still truncates.

## Contract

`POST /score` takes `requestId`, `query` (up to 512 code points), `corpusRevision`, `eligible` as `[sourceId, sourceRevision]` pairs, `limit` (1 to 100) and `deadlineMs` (1 to 6000). Any other field is refused. The worker masks its rows to the eligible pairs before it scores anything, scores each source by its best chunk, and returns ranked ids with finite scores. A corpus revision it does not hold answers 409.

| Limit | Value |
|---|---|
| Computations at once | 1 |
| Requests waiting | 4; a fifth answers 503 at once |
| CPU threads | 8 |
| Body | 2 MiB |
| Deadline | checked on entering the queue and between stages; a late request answers 503 |

The server trusts a response only after checking that the request id and corpus revision echo, that each result is an eligible pair seen once with a finite score, and that the count is within the limit. Anything else counts as a worker failure, and the search answers with keyword ranking marked `degraded`.

## Measured here

2026-09-22, on the Ryzen 7 7840HS with 60 GiB of RAM:

| Probe | Result |
|---|---|
| Model load | 4.1 s |
| Encode on CPU, 64 short passages | 568 per second at batch 8, 874 at 16, 1,197 at 32 |
| One query | 5.3 ms |
| Peak memory | 3.4 GiB, inside the 8 GiB cap |
| Reserves | 29 GiB of RAM available, 117 GiB of disk free |
| GPU | torch sees 2 devices; CPU is the committed path |
| Vectors for the 500-record corpus | 500 rows, one chunk each, 2.3 s of encoding |

On that corpus, "what makes the heavens look azure during daytime" puts `sky-is-blue-not-violet` and `why-the-sky-is-blue` first and second in the dense ranking, and keyword ranking alone puts neither in its top five.

**Fusion depth.** With 100 candidates per list over 500 sources, nearly every keyword hit also sat somewhere in the dense list, and a weak match on both beat the dense list's first place: the live test's top five were cosmology and mind atoms. Each list now goes into fusion 20 deep, the reranker's window, and the same search returns the sky nodes. The value is a development default; the sealed evaluation in EVALUATION.md sets the one it freezes.

## Tests

| Command | Covers |
|---|---|
| `npm run test:evidence-worker` | 30 Python tests. Normalization against the shared fixtures; ranking, masking and ties; every request refusal; the queue and both deadlines; the HTTP secret, paths and body limits; loopback binding; chunk windows and byte spans; vector build, rebuild and tamper checks; and, with the snapshot cached, the real model: a changed file stops it, and the paraphrase fixtures rank a relevant source first where keyword ranking does not |
| `npm run test:research-os` | The server side: BM25 against scores computed by hand, masking, fusion, each worker-response check, and the search's modes and deadlines |
| `npm run test:evidence-live` | The real worker process over the local corpus: hybrid search, eligibility on both sides, and keyword search after the worker is killed |
