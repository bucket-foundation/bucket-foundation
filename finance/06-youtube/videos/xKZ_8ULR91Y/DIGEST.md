<!-- voice-ignore-file: transcript-derived digest -->
# Jane Street on GPUs, Trading, and Hiring: A Conversation with Dwarkesh | Jane Street | xKZ_8ULR91Y | 0.49 h

Teaches: Two Jane Street leaders (Ron Minsky of technology and Dan Pontovo of physical engineering) tour a Texas training data center and discuss trading time horizons, why model architectures differ from chatbot labs, compute constraints, and which roles the firm hires. The firm is a sponsor of the host, so the hiring segment is promotional.

Claims:
- The best strategy is an ensemble across horizons. "really to have a kind of ensemble" [0:01:55]
- A common prediction target is a fair value for each instrument, which composes into many trading processes; inference may run on CPU, FPGA or GPU depending on latency and model size. "thing is to predict a fair value" [0:02:53]
- A 6 billion dollar compute deal with CoreWeave is cited; the firm says it faces its own scaling laws and values faster experimentation across diverse model architectures. "recently signed a $6 billion comput deal" [0:04:32]
- Financial models are smaller and data is noisier and larger in volume than chatbot data; one domain's sequential data rate (the NASDAQ feed) is high, and data loading and a custom internal object store matter more. "high but the amount of sequential data" [0:07:17]
- Power limits forced an end to the one-data-center, x86-only shortcuts, and Nvidia products required adding ARM. "on this x86 only thing because nvidia" [0:09:26]
- Data center bottlenecks named: generators, transformers and liquid-cooling equipment, with long lead times. "transformers um some of the cooling equipment" [0:15:40]
- The limiting factor is mentoring capacity. "great people and having the mentorship capacity" [0:23:31]

- Match model, hardware and location to the decision's latency budget; use humans to watch automated systems and judge unusual days. "like all of the kind of decisions" [0:06:16]

Worked:
- Specialized model architectures per data source and application, per the speakers. "are just like many possible data sources" [0:05:30]

Failed:
- Colocation space limits power and cooling, e.g. one GPU per rack. "space yeah and your power your cooling" [0:04:08]
