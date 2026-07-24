import asyncio
import librosa
import time
import urllib.request
from flask import Flask, jsonify

app = Flask(__name__)

# Arm motion is handled by the TS motion-service (open/wave/turn-sway,
# cycled in a shuffled permutation) — this backend's job is just detecting
# beat timestamps and firing them at the right moment.
MOTION_SERVICE_URL = "http://localhost:8080/beat"

def fire_beat():
    try:
        req = urllib.request.Request(MOTION_SERVICE_URL, method="POST")
        with urllib.request.urlopen(req, timeout=2) as resp:
            print(f"[BACKEND] beat -> {resp.read().decode()}")
    except Exception as e:
        print(f"[BACKEND] beat failed: {e}")

# --- Webhook endpoint ---

@app.route("/beat", methods=["POST"])
def on_beat():
    fire_beat()
    return jsonify({"status": "ok"}), 200

# --- Beat detection + playback sync ---

def get_beat_timestamps(audio_path: str) -> list[float]:
    print(f"[BACKEND] Loading audio: {audio_path}")
    y, sr = librosa.load(audio_path)
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    tempo_val = float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    print(f"[BACKEND] Detected tempo: {tempo_val:.1f} BPM")
    print(f"[BACKEND] Total beats: {len(beat_times)}")
    return beat_times.tolist()

# Detected beats (~740ms apart on this track) are much closer together than
# a full motion (1.5-3s), so firing on every one would constantly interrupt
# the previous move. Firing every BEAT_DIVISOR-th beat instead gives each
# motion room to play out while still landing on the music.
BEAT_DIVISOR = 3

async def play_and_nod(audio_path: str, clip_duration_sec: float = None):
    beat_times = get_beat_timestamps(audio_path)
    if clip_duration_sec is not None:
        beat_times = [t for t in beat_times if t <= clip_duration_sec]
        print(f"[BACKEND] Clip length {clip_duration_sec}s -> {len(beat_times)} beats in range")
    print("[BACKEND] Starting in 3 seconds...")
    await asyncio.sleep(3)
    start_time = time.time()
    print("[BACKEND] GO")
    for i, beat_t in enumerate(beat_times):
        now = time.time() - start_time
        wait = beat_t - now
        if wait > 0:
            await asyncio.sleep(wait)
        if i % BEAT_DIVISOR == 0:
            fire_beat()
    print("[BACKEND] Done — clip ended, motion stops")

# --- Entry point ---

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "server":
        # Mode 1: webhook server (frontend sends POST /beat)
        print("[BACKEND] Starting webhook server on port 5000...")
        app.run(port=5000)
    elif len(sys.argv) > 1:
        # Mode 2: standalone beat detection + arm sync
        # Optional 2nd arg caps it to a clip (e.g. 10) so it stops on its
        # own instead of needing to be killed.
        clip_duration = float(sys.argv[2]) if len(sys.argv) > 2 else None
        asyncio.run(play_and_nod(sys.argv[1], clip_duration))
    else:
        print("Usage:")
        print("  python beat_backend.py <audio_file> [clip_duration_sec]   # standalone mode")
        print("  python beat_backend.py server                              # webhook server mode")
