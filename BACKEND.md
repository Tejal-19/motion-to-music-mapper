# Backend — motion-to-music-mapper

## Overview
The backend detects beats from an audio file and triggers robot arm actions in sync with the music.

## Files
- `beat_backend_v2.py` — main backend script

## How It Works
1. Load audio file → detect beat timestamps using `librosa`
2. For each beat, randomly select one of 3 arm actions (beat1 / beat2 / beat3)
3. Execute action at the correct timestamp

## Two Modes

### Mode 1: Standalone (backend drives everything)
Backend detects beats and fires actions itself, synced to audio playback.
```bash
python beat_backend_v2.py "We-Will-Rock-You-By-Queen-.mp3"
```

### Mode 2: Webhook Server (frontend sends beat signals)
Backend listens for POST requests from the frontend. Each POST triggers one random arm action.
```bash
python beat_backend_v2.py server
```

**Endpoint:**
```
POST http://localhost:5000/beat
```
No request body needed. Returns `{"status": "ok"}`.

## Dependencies
```bash
pip install librosa flask viam-sdk
```

## Integration Notes
- **Music playback** should be handled by the frontend
- Frontend sends `POST /beat` at each detected beat timestamp
- Backend executes the corresponding arm action
- `action1()`, `action2()`, `action3()` are currently print stubs — will be replaced with real Viam arm calls

## TODO
- [ ] Replace `action1/2/3` print stubs with real Viam `arm.move_to_position()` calls
- [ ] Connect to robot: `robot16-main.ag9khwy6jn.viam.cloud`
