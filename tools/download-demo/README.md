# Desktop demo

The public tour uses Bucket 0.5.0 with a fresh sample library. Its captions and narration studio read `chapters.json`. Audio is silent until founder takes are supplied.

Capture the installed release with Bun and Playwright. Set `TMPDIR` to a disk-backed scratch directory with room for video:

```sh
bun tools/download-demo/capture.ts /path/to/bucket .local/demo-capture
manim -qm --media_dir .local/manim tools/download-demo/intro.py CoinQuestion
python3 tools/download-demo/assemble.py .local/demo-capture/capture.json .local/manim/videos/intro/720p30/CoinQuestion.mp4 .local/demo-assembled
```

The capture checks the executable version and records its SHA-256. Assembly rejects unfinished scenes or script mismatches. Publish `desktop-tour.mp4`, `poster.webp`, `captions.vtt`, `transcript.txt`, and `provenance.json` from the assembled folder under a new versioned media path. Raw captures and sample stores stay local.

Serve the narration studio on localhost:

```sh
python3 -m http.server 3190 --bind 127.0.0.1 --directory tools/download-demo
```

Open `http://localhost:3190/recorder.html`, choose a section, record, stop, and save the take. The browser keeps each recording until refresh. Microphone tracks stop when recording ends. No upload endpoint is provided.

Create a local JSON object mapping section IDs to the saved audio paths, then pass `--takes /path/to/takes.json` to assembly with a new output directory. Each clip extends to fit its take. FFmpeg normalizes the audio and writes captions from the shared script. Listen to each take against its caption before publishing.

Run browser checks against a local Next.js preview:

```sh
node_modules/.bin/playwright test --config tools/download-demo/playwright.config.ts
```

The recorder tests use synthetic microphone input.
