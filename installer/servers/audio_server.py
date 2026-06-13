"""
audio_server.py — Stable Audio 3 (small-sfx + small-music) local server (port 8001).

Refactored for the installer: paths come from the environment (set by the launcher),
no hard-coded absolute paths. Same /generate-sfx and /generate-music JSON contract
as before, so the frontend needs zero changes.

Env it reads:
    SA3_SRC            path to the cloned stable_audio_3 package (the inference code)
    LOCAL_MODELS_DIR   HF model cache root (SA3 weights live directly under it)
    DND_PROFILE        balanced | performance | ultra
    DND_PROFILES_JSON  path to profiles.json
    DND_OFFLINE        "1" (default) => offline; "0" => may download
    HF_TOKEN           HF token (only if DND_OFFLINE=0)
    DND_AUDIO_PORT     default 8001
"""
import os
import sys
import io
import json
import base64

HERE = os.path.dirname(os.path.abspath(__file__))

# --- locate the cloned stable_audio_3 package (pure-python inference code) ---
_SA3_SRC = os.environ.get("SA3_SRC", os.path.join(HERE, "..", "engine", "sa3"))
if _SA3_SRC not in sys.path:
    sys.path.insert(0, _SA3_SRC)

# --- point HF at the model cache BEFORE any HF/transformers import ---
LOCAL_MODELS_DIR = os.environ.get("LOCAL_MODELS_DIR", os.path.join(HERE, "..", "Local Models"))
os.environ.setdefault("HF_HUB_CACHE", LOCAL_MODELS_DIR)
if os.environ.get("DND_OFFLINE", "1") == "1":
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

import numpy as np  # noqa: E402  (kept: SA3 helpers expect numpy importable)
import torch  # noqa: E402
import soundfile as sf  # noqa: E402
from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel  # noqa: E402
from stable_audio_3 import StableAudioModel  # noqa: E402

PROFILE_NAME = os.environ.get("DND_PROFILE", "balanced")
PROFILES_JSON = os.environ.get("DND_PROFILES_JSON", os.path.join(HERE, "..", "bootstrap", "profiles.json"))


def load_audio_profile() -> dict:
    try:
        with open(PROFILES_JSON, "r", encoding="utf-8") as f:
            return json.load(f)["profiles"][PROFILE_NAME]["audio"]
    except Exception as e:
        print(f"[sa3] could not read profile '{PROFILE_NAME}' ({e}); using balanced defaults.")
        return {"preload": ["small-sfx"], "half": True}


PROFILE = load_audio_profile()

app = FastAPI(title=f"DungeonAI Stable Audio 3 Server [{PROFILE_NAME}]")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

device = "cuda" if torch.cuda.is_available() else "cpu"
_use_half = PROFILE.get("half", True) and device == "cuda"
_models = {}


def get_model(name: str):
    if name not in _models:
        print(f"[sa3] Loading '{name}' on {device} (half={_use_half})...", flush=True)
        _models[name] = StableAudioModel.from_pretrained(name, device=device, model_half=_use_half)
        print(f"[sa3] '{name}' loaded (sample_rate={_models[name].model.sample_rate}).", flush=True)
    return _models[name]


def _wav_b64(audio_one, sample_rate: int) -> str:
    wav = audio_one.to(torch.float32).clamp(-1, 1).cpu().numpy().T
    buf = io.BytesIO()
    sf.write(buf, wav, sample_rate, format="WAV", subtype="PCM_16")
    return base64.b64encode(buf.getvalue()).decode()


class AudioRequest(BaseModel):
    prompt: str
    duration: int = 30


@app.on_event("startup")
async def warmup():
    for name in PROFILE.get("preload", ["small-sfx"]):
        try:
            get_model(name)
        except Exception as e:
            print(f"[sa3] preload '{name}' failed (will retry on request): {e}", flush=True)


@app.get("/health")
async def health():
    status = {"status": "ok", "device": device, "backend": "stable-audio-3", "profile": PROFILE_NAME}
    if device == "cuda":
        status["gpu"] = torch.cuda.get_device_name(0)
    status["sfx_model"] = "loaded" if "small-sfx" in _models else "lazy"
    status["music_model"] = "loaded" if "small-music" in _models else "lazy"
    return status


def _generate(model_name: str, prompt: str, duration: int, max_seconds: int):
    model = get_model(model_name)
    dur = max(1, min(max_seconds, int(duration)))
    print(f"[sa3:{model_name}] '{prompt[:60]}' ({dur}s)", flush=True)
    audio = model.generate(prompt=prompt, duration=dur, steps=8, cfg_scale=1.0, seed=-1, batch_size=1)
    sr = model.model.sample_rate
    return {"audio": f"data:audio/wav;base64,{_wav_b64(audio[0], sr)}", "duration": dur, "sampling_rate": sr}


@app.post("/generate-sfx")
async def generate_sfx(request: AudioRequest):
    try:
        return _generate("small-sfx", request.prompt, request.duration, max_seconds=12)
    except Exception as e:
        print(f"[sa3] SFX error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-music")
async def generate_music(request: AudioRequest):
    try:
        return _generate("small-music", request.prompt, request.duration, max_seconds=47)
    except Exception as e:
        print(f"[sa3] Music error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("DND_AUDIO_PORT", "8001")))
