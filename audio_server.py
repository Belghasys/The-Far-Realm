"""
audio_server.py — Stable Audio 3 (small-sfx + small-music) local server.

Runs in the MAIN Python env (same torch 2.12+cu130 as FLUX) — NO separate venv.
Verified: torch 2.12 loads & generates SA3 fine; the only catch is torchaudio.save
needs torchcodec, so we save WAV via soundfile instead.

Endpoints + JSON contract are unchanged from the legacy server, so the frontend
needs ZERO changes: POST /generate-sfx and /generate-music take {prompt,duration}
and return {audio:"data:audio/wav;base64,...", duration, sampling_rate}.

Requires (all pure-python, no torch impact): einops, einops-exts, soundfile,
and the cloned `stable_audio_3` package on PYTHONPATH (default C:\\Users\\O\\sa3).
"""
import os
import sys

# --- locate the cloned stable_audio_3 package (pure-python inference code) ---
_SA3_SRC = os.environ.get("SA3_SRC", r"C:\Users\O\sa3")
if _SA3_SRC not in sys.path:
    sys.path.insert(0, _SA3_SRC)

# --- point HF at the offline D: cache BEFORE any HF/transformers import ---
os.environ.setdefault("HF_HUB_CACHE", r"D:\SalimAI\DnD - The Far Realm\Local Models")
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

import io
import base64
import numpy as np
import torch
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from stable_audio_3 import StableAudioModel

app = FastAPI(title="DungeonAI Stable Audio 3 Server")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

device = "cuda" if torch.cuda.is_available() else "cpu"
_models = {}

def get_model(name: str):
    if name not in _models:
        print(f"Loading SA3 '{name}' on {device}...", flush=True)
        _models[name] = StableAudioModel.from_pretrained(
            name, device=device, model_half=(device == "cuda")
        )
        print(f"SA3 '{name}' loaded (sample_rate={_models[name].model.sample_rate}).", flush=True)
    return _models[name]

def _wav_b64(audio_one, sample_rate: int) -> str:
    # audio_one: torch tensor [channels, samples] -> soundfile wants [samples, channels]
    wav = audio_one.to(torch.float32).clamp(-1, 1).cpu().numpy().T
    buf = io.BytesIO()
    sf.write(buf, wav, sample_rate, format="WAV", subtype="PCM_16")
    return base64.b64encode(buf.getvalue()).decode()

class AudioRequest(BaseModel):
    prompt: str
    duration: int = 30

@app.on_event("startup")
async def warmup():
    try:
        get_model("small-sfx")  # most frequent; music loads lazily
    except Exception as e:
        print(f"Startup preload failed (will retry on request): {e}", flush=True)

@app.get("/health")
async def health():
    status = {"status": "ok", "device": device, "backend": "stable-audio-3"}
    if device == "cuda":
        status["gpu"] = torch.cuda.get_device_name(0)
    status["sfx_model"] = "stable-audio-3-small-sfx (loaded)" if "small-sfx" in _models else "stable-audio-3-small-sfx (lazy)"
    status["music_model"] = "stable-audio-3-small-music (loaded)" if "small-music" in _models else "stable-audio-3-small-music (lazy)"
    return status

def _generate(model_name: str, prompt: str, duration: int, max_seconds: int):
    model = get_model(model_name)
    dur = max(1, min(max_seconds, int(duration)))
    print(f"[{model_name}] '{prompt[:60]}' ({dur}s)", flush=True)
    audio = model.generate(prompt=prompt, duration=dur, steps=8, cfg_scale=1.0, seed=-1, batch_size=1)
    sr = model.model.sample_rate
    return {"audio": f"data:audio/wav;base64,{_wav_b64(audio[0], sr)}", "duration": dur, "sampling_rate": sr}

@app.post("/generate-sfx")
async def generate_sfx(request: AudioRequest):
    try:
        return _generate("small-sfx", request.prompt, request.duration, max_seconds=12)
    except Exception as e:
        print(f"SFX error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-music")
async def generate_music(request: AudioRequest):
    try:
        # SA3 small max ~120s; cap at 47s and the frontend loops it.
        return _generate("small-music", request.prompt, request.duration, max_seconds=47)
    except Exception as e:
        print(f"Music error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
