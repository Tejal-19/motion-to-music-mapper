import asyncio
import librosa
import time
import random
import threading
from flask import Flask, request, jsonify

app = Flask(__name__)

# --- Actions (replace prints with real Viam calls later) ---

def action1():
    print("[ARM] beat1")

def action2():
    print("[ARM] beat2")

def action3():
    print("[ARM] beat3")

ACTIONS = [action1, action2, action3]

# --- Webhook endpoint ---

@app.route("/beat", methods=["POST"])
def on_beat():
    action = random.choice(ACTIONS)
    action()
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

async def play_and_nod(audio_path: str):
    beat_times = get_beat_timestamps(audio_path)
    print("[BACKEND] Starting in 3 seconds...")
    await asyncio.sleep(3)
    start_time = time.time()
    print("[BACKEND] GO")
    for beat_t in beat_times:
        now = time.time() - start_time
        wait = beat_t - now
        if wait > 0:
            await asyncio.sleep(wait)
        action = random.choice(ACTIONS)
        action()
    print("[BACKEND] Done")

# --- Entry point ---

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "server":
        # Mode 1: webhook server (frontend sends POST /beat)
        print("[BACKEND] Starting webhook server on port 5000...")
        app.run(port=5000)
    elif len(sys.argv) > 1:
        # Mode 2: standalone beat detection + arm sync
        asyncio.run(play_and_nod(sys.argv[1]))
    else:
        print("Usage:")
        print("  python beat_backend.py <audio_file>   # standalone mode")
        print("  python beat_backend.py server          # webhook server mode")
