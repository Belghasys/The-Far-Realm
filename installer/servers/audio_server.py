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
# ML15 (contre-audit) — wildcard + credentials est une combinaison invalide,
# déjà corrigée sur les deux flux_server mais oubliée ici.
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"],
)

# Banque de SFX pré-enregistrés (480 sons / 69 clés + sfx_registry.json) servie
# sur /sfx — consommée par services/media/sfxLibrary.ts. Chez un joueur, le launcher
# fournit DND_SFX_DIR (payload de l'installeur) ; sans lui, /sfx est désactivé
# et le jeu retombe sur la génération.
_SFX_DIR = os.environ.get("DND_SFX_DIR", "")
if _SFX_DIR and os.path.isdir(_SFX_DIR):
    from fastapi.staticfiles import StaticFiles
    app.mount("/sfx", StaticFiles(directory=_SFX_DIR), name="sfx")
    print(f"[sfx] Bank mounted: {_SFX_DIR}", flush=True)

# ── Journal de session (POST /session-log) — même contrat que le jumeau dev ──
import json as _trace_json  # noqa: E402
import re as _trace_re  # noqa: E402

_TRACE_DIR = os.environ.get(
    "DND_SESSION_LOG_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs", "sessions"),
)


class SessionLogBatch(BaseModel):
    sessionId: str
    lines: list


@app.post("/session-log")
def session_log(batch: SessionLogBatch):
    sid = _trace_re.sub(r"[^A-Za-z0-9_-]", "", str(batch.sessionId))[:80]
    if not sid:
        raise HTTPException(status_code=400, detail="sessionId invalide")
    os.makedirs(_TRACE_DIR, exist_ok=True)
    path = os.path.join(_TRACE_DIR, f"{sid}.jsonl")
    wrote = 0
    with open(path, "a", encoding="utf-8") as f:
        for line in list(batch.lines)[:500]:
            try:
                s = _trace_json.dumps(line, ensure_ascii=False)
            except (TypeError, ValueError):
                continue
            if len(s) > 40000:
                s = _trace_json.dumps({
                    "t": (line.get("t") if isinstance(line, dict) else None),
                    "src": "trace", "ch": "session",
                    "title": f"[ligne écartée : {len(s)} chars]",
                }, ensure_ascii=False)
            f.write(s + "\n")
            wrote += 1
    return {"ok": True, "wrote": wrote}


# Pistes musicales pré-enregistrées (un fichier par mood) sur /music.
# 2026-08-15 : le jeu n'appelle plus /generate-music.
_MUSIC_DIR = os.environ.get("DND_MUSIC_DIR", "")
if _MUSIC_DIR and os.path.isdir(_MUSIC_DIR):
    from fastapi.staticfiles import StaticFiles
    app.mount("/music", StaticFiles(directory=_MUSIC_DIR), name="music")
    print(f"[music] Library mounted: {_MUSIC_DIR}", flush=True)

device = "cuda" if torch.cuda.is_available() else "cpu"
_use_half = PROFILE.get("half", True) and device == "cuda"
_models = {}
# ML3 (contre-audit) — même patron que flux_server : la génération GPU est
# sérialisée par un verrou explicite (deux requêtes concurrentes ne doivent pas
# se partager la VRAM), et les endpoints sont SYNCHRONES (def) pour tourner dans
# le threadpool au lieu de geler la boucle d'événements — /health répondait
# plus pendant les 47 s d'une musique.
import threading
GEN_LOCK = threading.Lock()


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


# 2026-08-15 — génération DÉBRANCHÉE côté jeu (banques /sfx + /music) : le
# warmup SA3 gaspillait la VRAM du serveur d'images. Opt-in via env.
AUDIO_GEN_ENABLED = os.environ.get("DND_ENABLE_AUDIO_GEN", "0") == "1"

@app.on_event("startup")
async def warmup():
    if not AUDIO_GEN_ENABLED:
        print("[sa3] Generation disabled (DND_ENABLE_AUDIO_GEN != 1) — serving /sfx and /music only.", flush=True)
        return
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
    if not AUDIO_GEN_ENABLED:
        raise HTTPException(status_code=503, detail="Audio generation is unplugged (set DND_ENABLE_AUDIO_GEN=1 to re-enable).")
    with GEN_LOCK:
        model = get_model(model_name)
        dur = max(1, min(max_seconds, int(duration)))
        print(f"[sa3:{model_name}] '{prompt[:60]}' ({dur}s)", flush=True)
        audio = model.generate(prompt=prompt, duration=dur, steps=8, cfg_scale=1.0, seed=-1, batch_size=1)
        sr = model.model.sample_rate
        return {"audio": f"data:audio/wav;base64,{_wav_b64(audio[0], sr)}", "duration": dur, "sampling_rate": sr}


# ML3 — endpoints SYNC (def) : exécutés dans le threadpool anyio, la boucle
# d'événements reste libre et /health répond pendant une génération.
@app.post("/generate-sfx")
def generate_sfx(request: AudioRequest):
    try:
        return _generate("small-sfx", request.prompt, request.duration, max_seconds=12)
    except Exception as e:
        print(f"[sa3] SFX error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-music")
def generate_music(request: AudioRequest):
    try:
        return _generate("small-music", request.prompt, request.duration, max_seconds=47)
    except Exception as e:
        print(f"[sa3] Music error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("DND_AUDIO_PORT", "8001")))
