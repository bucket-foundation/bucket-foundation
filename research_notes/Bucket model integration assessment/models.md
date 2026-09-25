# Bucket model integration assessment

Research date: 2026-09-25. Scope: public documentation review. No inference requests, dependency installs, or weight downloads were performed.

## DeepSeek fit and deployment

### Takeaway

Recommendation: evaluate hosted DeepSeek for evidence extraction and grounded explanations. Require provider contract tests before connecting it to graph mutations.

### Cited Findings

- DeepSeek describes V4.1-Flash as a text-and-image MoE with a 552B-parameter backbone, 8B active parameters during prefill and 16B during decode, plus 196B Engram parameters. Hugging Face reports 763B total parameters. Its context limit is one million tokens. Code and weights carry MIT licensing. The release lacks a Jinja chat template; publisher instruct evaluations use reasoning effort 100. Those evaluations are publisher results. [Model card](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash)
- The reference inference instructions show tensor parallelism across eight ranks and FP4 expert conversion. They describe a reference runtime, with separate checkpoint conversion and multi-node support. They provide no universal minimum VRAM guarantee. [Inference instructions](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/main/inference/README.md)
- The hosted API maps `deepseek-flash` to V4.1-Flash and advertises OpenAI-format and Anthropic-format interfaces, JSON output, tool calls, Responses API, and vision. Published per-million-token Flash prices are $0.15 off-peak/$0.30 peak cache-miss input; $0.003/$0.006 cached input; $0.60/$1.20 output. Maximum output is 384K. Aliases can move between model versions. These are DeepSeek's rates, with no third-party-provider price guarantee. [API pricing](https://api-docs.deepseek.com/quick_start/pricing/)
- Hosted strict tool schemas require the beta endpoint and `strict: true`; every object property must be required and `additionalProperties` must be false. Chat Completions has different history rules from Responses and Messages: inserted tool calls mid-conversation require the latter interfaces. [Tool API](https://api-docs.deepseek.com/guides/tool_calls/)
- The publisher's `deepseek-recipe` translates protocol formats and parses streams. It supplies neither inference nor HTTP transport. Its unsupported features include JSON Schema constraint enforcement, strict-tool enforcement, `previous_response_id` retrieval, and server-executed web search. An OpenAI-shaped endpoint alone does not establish these capabilities. [Protocol toolkit](https://github.com/deepseek-ai/deepseek-recipe)
- LlamaIndex's benchmark page lists a DeepSeek V4.1-Flash mean score of 87.11. ExtractBench covers 370 documents and measures structured extraction with grounding. This is evidence from a benchmark publisher separate from DeepSeek; it does not measure prerequisite correctness or learner outcomes. [ExtractBench](https://huggingface.co/datasets/llamaindex/ExtractBench)

### Inferences

- Hosted inference is the first deployment candidate. Active-parameter counts describe computation; total weights and runtime overhead determine deployment memory. Eight-rank example commands do not establish that Bucket's hardware can serve the model.
- Test JSON parsing, tool histories, streaming, timeout handling, usage accounting, and image payloads against the chosen endpoint. Pin provider configuration and record returned model identity; keep schema validation in Bucket.

### Gaps

Bucket throughput, latency, extraction precision, and self-hosted operating costs remain unmeasured. Thinking-mode and JSON-mode documentation fetches failed in this session, so their detailed request contracts remain unverified.

## Laya semantics and limits

### Takeaway

Recommendation: pilot Laya as a bounded classifier with labeled Bucket examples and an abstention policy. Keep its probability estimates separate from mastery evidence and graph-edge confidence.

### Cited Findings

- Laya is an Apache-2.0 decision-model family. The root English model has 421M parameters and a 512-token default budget; multilingual has 322M with 1,024 default tokens and up to 8,192. The Python SDK exposes `Router.predict(state, questions)`. Serving uses `POST /v1/systemone`, a Jev-shaped interface. The model card reports 39.5 ms English and 32.8 ms multilingual for one question on T4. It also warns of `noul` option-label bias and unusable `action.act_probability`, which approaches 1.0 across inputs. Treat these timings and warnings as publisher evidence. [Model card](https://huggingface.co/convaiinnovations/laya)
- `noul` means probability of the true answer. `choice` selects from supplied options. `predict_long` aggregates windows: binary questions use the maximum probability; choice and score use the most-confident window. Its confidence belongs to that window and lacks document-level calibration. The SDK can pin revisions and verify artifact hashes. [Agent API](https://nandhakishorm.github.io/laya/reference/agent/)
- Schema projection accepts finite enums, booleans, and bounded integer levels. It rejects free strings, arrays, and nested objects. Limits include 32 properties, 32 options, and ten score levels. Boolean projection thresholds `noul` at 0.5; numeric projection returns the most-probable level. `return_details=True` preserves distributions and confidence. [Schema API](https://nandhakishorm.github.io/laya/structured/)
- Publisher results report 0.766 typed-decision accuracy after task fine-tuning; the root checkpoint scores 0.362, below a 0.461 majority baseline. Published calibration depends on temperature fitting and software version; cross-provider comparisons use different samples and prompts. These are task-dependent publisher measurements. [Benchmark report](https://github.com/NandhaKishorM/laya/blob/main/BENCHMARKS.md)
- CPU Docker guidance allows 8 GB RAM and 10 GB disk. CUDA memory depends on checkpoint, batch size, and input length. The HTTP server supports bearer-key configuration; public weights need no Hub credential. [Deployment guide](https://nandhakishorm.github.io/laya/docker/)

### Inferences

- Use short evidence spans with small label sets: route requests or flag candidate relations for review. Preserve distributions and checkpoint metadata. Fit temperatures on a calibration split and choose thresholds on held-out cases; test language, label order, and document truncation.
- Laya's finite outputs cannot generate concept descriptions or evidence quotations. Its score levels have no inherent conversion to study minutes or learning gain. Hosting incurs compute and operating costs despite open weights.

### Gaps

No Bucket-specific evaluation or independent replication was established. Hardware figures are setup guidance rather than measured Bucket requirements.

## Graph and learning-path responsibilities

### Takeaway

Recommendation: assign generation to DeepSeek and bounded routing experiments to Laya. Let application code enforce graph constraints and compute learning plans.

### Cited Findings

The available interfaces expose generation and tool requests on DeepSeek, and finite typed answers on Laya. Neither source establishes a validated learner-state model or prerequisite-path solver. [DeepSeek tool API](https://api-docs.deepseek.com/guides/tool_calls/), [Laya schema API](https://nandhakishorm.github.io/laya/structured/)

### Inferences

- DeepSeek could propose prerequisite edges with source spans and explanations. Store them as candidates until source checks and review establish acceptance.
- Learning plans should preserve mandatory branches and shared prerequisites. Derive mastery from learner evidence; represent effort estimates with uncertainty. Let the solver consume accepted edges and estimates, then have DeepSeek explain its result.
- Evaluation should measure relation precision and evidence validity, plus routing errors and abstention coverage. Keep training, calibration, and test documents separate to reduce leakage. Start Laya in shadow mode, logging decisions without changing graph state.

### Gaps

Model selection remains conditional on Bucket's evaluation data and deployment budget. Codebase integration locations are covered by the companion repository assessment.
