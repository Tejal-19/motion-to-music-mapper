import asyncio
import librosa
import time
import random


def get_beat_timestamps(audio_path: str) -> list[float]:
    print(f"[BACKEND] Loading audio: {audio_path}")
    y, sr = librosa.load(audio_path)
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    tempo_val = float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    print(f"[BACKEND] Detected tempo: {tempo_val:.1f} BPM")
    print(f"[BACKEND] Total beats: {len(beat_times)}")
    return beat_times.tolist()


def action1():
    print("[ARM] beat1")

def action2():
    print("[ARM] beat2")

def action3():
    print("[ARM] beat3")

ACTIONS = [action1, action2, action3]


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


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python beat_backend.py <audio_file>")
    else:
        asyncio.run(play_and_nod(sys.argv[1]))
