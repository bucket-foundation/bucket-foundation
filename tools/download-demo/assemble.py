import argparse
import json
import hashlib
import pathlib
import subprocess
import textwrap


def run(*args):
    subprocess.run([str(arg) for arg in args], check=True)


def duration(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)]))


def timestamp(seconds):
    millis = round(seconds * 1000)
    return f"{millis // 3600000:02}:{millis // 60000 % 60:02}:{millis // 1000 % 60:02}.{millis % 1000:03}"


parser = argparse.ArgumentParser()
parser.add_argument("capture", type=pathlib.Path)
parser.add_argument("intro", type=pathlib.Path)
parser.add_argument("output", type=pathlib.Path)
parser.add_argument("--takes", type=pathlib.Path)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=False)
capture = json.loads(args.capture.read_text())
if capture["problems"] or any("end" not in scene for scene in capture["scenes"]):
    raise ValueError("Capture has errors or unfinished scenes")
script = json.loads(pathlib.Path(__file__).with_name("chapters.json").read_text())
if capture["version"] != script["version"]:
    raise ValueError("Capture and narration script versions differ")
texts = {entry["id"]: entry["text"] for entry in script["chapters"]}
if any(scene["text"] != texts.get(scene["id"]) for scene in capture["scenes"]):
    raise ValueError("Capture and narration text differ")
takes = json.loads(args.takes.read_text()) if args.takes else {}
clock_offset = capture["scenes"][-1]["end"] - duration(capture["video"])
if not 0 <= clock_offset <= capture["scenes"][0]["start"]:
    raise ValueError("Recording clock offset exceeds the initial capture delay")
scenes = [{"id": "intro", "start": 0, "end": duration(args.intro), "text": texts["intro"], "video": str(args.intro)}] + [{**scene, "start": scene["start"] - clock_offset, "end": scene["end"] - clock_offset, "video": capture["video"]} for scene in capture["scenes"]]
clips = []
captions = ["WEBVTT\n"]
transcript = ["Bucket desktop 0.5.0\n", "Desktop footage uses a fresh sample library. The opening entropy animation illustrates the formula from Claude Shannon, A Mathematical Theory of Communication, 1948. https://doi.org/10.1002/j.1538-7305.1948.tb00917.x\n"]
cursor = 0
for index, scene in enumerate(scenes):
    length = scene["end"] - scene["start"]
    audio = pathlib.Path(takes[scene["id"]]).resolve() if scene["id"] in takes else None
    target = max(length, duration(audio) + .4) if audio else length
    clip = args.output / f"segment-{index:02}.mp4"
    command = ["ffmpeg", "-v", "error", "-nostdin", "-ss", str(scene["start"]), "-t", str(length), "-i", scene["video"]]
    command += ["-i", str(audio)] if audio else ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
    command += ["-vf", f"scale=1280:720,setsar=1,fps=30,tpad=stop_mode=clone:stop_duration={target}", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,apad", "-map", "0:v:0", "-map", "1:a:0", "-t", str(target), "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-threads", "2", clip]
    run(*command)
    clips.append(clip)
    captions.append(f"{timestamp(cursor)} --> {timestamp(cursor+target)}\n{textwrap.fill(scene['text'], 58)}\n")
    transcript.append(f"{timestamp(cursor)} {scene['id'].title()}\n{scene['text']}\n")
    cursor += target
manifest = args.output / "segments.txt"
manifest.write_text("".join(f"file '{clip.name}'\n" for clip in clips))
run("ffmpeg", "-v", "error", "-nostdin", "-f", "concat", "-safe", "1", "-i", manifest, "-c", "copy", "-movflags", "+faststart", args.output / "desktop-tour.mp4")
run("ffmpeg", "-v", "error", "-nostdin", "-ss", "3", "-i", args.output / "desktop-tour.mp4", "-frames:v", "1", args.output / "poster.webp")
(args.output / "captions.vtt").write_text("\n".join(captions))
(args.output / "transcript.txt").write_text("\n".join(transcript))
(args.output / "provenance.json").write_text(json.dumps({"desktop_version": capture["version"], "binary_sha256": capture["binarySha256"], "capture_sha256": hashlib.sha256(args.capture.read_bytes()).hexdigest(), "capture_clock_offset_seconds": clock_offset, "narrated_sections": list(takes), "duration_seconds": cursor}, indent=2))
print(args.output)
