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
import threading
import numpy as np
import torch
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from stable_audio_3 import StableAudioModel

app = FastAPI(title="DungeonAI Stable Audio 3 Server")
# ML15 — wildcard + credentials est une combinaison invalide (même correctif
# que la copie installeur — les jumeaux se corrigent ENSEMBLE).
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"],
)

# Banque de SFX pré-enregistrés (480 sons / 69 clés + sfx_registry.json) servie
# statiquement sur /sfx — consommée par services/sfxLibrary.ts. Le chemin est
# relocalisable via DND_SFX_DIR.
_SFX_DIR = os.environ.get("DND_SFX_DIR", r"D:\Sound Library\SFX")
if os.path.isdir(_SFX_DIR):
    app.mount("/sfx", StaticFiles(directory=_SFX_DIR), name="sfx")
    print(f"[sfx] Bank mounted: {_SFX_DIR}", flush=True)
else:
    print(f"[sfx] Bank directory not found ({_SFX_DIR}) — /sfx disabled.", flush=True)

# ── Journal de session (POST /session-log) ───────────────────────────────────
# Le client (services/infra/sessionTrace.ts) envoie par lots tout ce qui traverse
# auditBus + campaignEventLog ; on APPEND en JSONL dans logs/sessions/ pour
# qu'une session entière soit analysable après coup depuis Claude Code.
import json as _trace_json
import re as _trace_re

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
                # Une ligne géante ne doit ni casser le JSONL ni tout absorber.
                s = _trace_json.dumps({
                    "t": (line.get("t") if isinstance(line, dict) else None),
                    "src": "trace", "ch": "session",
                    "title": f"[ligne écartée : {len(s)} chars]",
                }, ensure_ascii=False)
            f.write(s + "\n")
            wrote += 1
    return {"ok": True, "wrote": wrote}


# Pistes musicales pré-enregistrées (30 thèmes Lyria — un fichier par mood :
# exploration.mp3, combat_boss.mp3…) servies sur /music pour lyriaMusic.ts.
# 2026-08-15 : la GÉNÉRATION (/generate-music) n'est plus appelée par le jeu.
_MUSIC_DIR = os.environ.get("DND_MUSIC_DIR", r"D:\Sound Library\Music")
if os.path.isdir(_MUSIC_DIR):
    app.mount("/music", StaticFiles(directory=_MUSIC_DIR), name="music")
    print(f"[music] Library mounted: {_MUSIC_DIR}", flush=True)
else:
    print(f"[music] Library directory not found ({_MUSIC_DIR}) — /music disabled.", flush=True)

device = "cuda" if torch.cuda.is_available() else "cpu"
_models = {}
# ML3 — sérialise la génération GPU (deux requêtes ne partagent pas la VRAM).
GEN_LOCK = threading.Lock()

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

# 2026-08-15 — la génération est DÉBRANCHÉE côté jeu (banque de SFX + pistes
# pré-enregistrées). Charger SA3 au démarrage gaspillait ~3-4 Go de VRAM et
# poussait le serveur d'images (Z-Image FP8, ~11 Go) hors GPU → images à
# 120 s+ au lieu de 10-12 s. Le warmup (et les endpoints /generate-*) ne
# s'activent plus que si DND_ENABLE_AUDIO_GEN=1.
AUDIO_GEN_ENABLED = os.environ.get("DND_ENABLE_AUDIO_GEN", "0") == "1"

@app.on_event("startup")
async def warmup():
    if not AUDIO_GEN_ENABLED:
        print("[sa3] Generation disabled (DND_ENABLE_AUDIO_GEN != 1) — serving /sfx and /music only, no VRAM used.", flush=True)
        return
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
    if not AUDIO_GEN_ENABLED:
        raise HTTPException(status_code=503, detail="Audio generation is unplugged (set DND_ENABLE_AUDIO_GEN=1 to re-enable). The game uses the pre-recorded /sfx and /music libraries.")
    with GEN_LOCK:
        model = get_model(model_name)
        dur = max(1, min(max_seconds, int(duration)))
        print(f"[{model_name}] '{prompt[:60]}' ({dur}s)", flush=True)
        audio = model.generate(prompt=prompt, duration=dur, steps=8, cfg_scale=1.0, seed=-1, batch_size=1)
        sr = model.model.sample_rate
        return {"audio": f"data:audio/wav;base64,{_wav_b64(audio[0], sr)}", "duration": dur, "sampling_rate": sr}

# ML3 — endpoints SYNC (def) : exécutés dans le threadpool, la boucle
# d'événements reste libre et /health (et /sfx) répondent pendant une
# génération de 47 s. Même correctif que la copie installeur.
@app.post("/generate-sfx")
def generate_sfx(request: AudioRequest):
    try:
        return _generate("small-sfx", request.prompt, request.duration, max_seconds=12)
    except Exception as e:
        print(f"SFX error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-music")
def generate_music(request: AudioRequest):
    try:
        # SA3 small max ~120s; cap at 47s and the frontend loops it.
        return _generate("small-music", request.prompt, request.duration, max_seconds=47)
    except Exception as e:
        print(f"Music error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
