"""
flux_server.py — local image server (port 8000).

Model family is profile-driven: Z-Image-Turbo (default — 6B, Apache 2.0,
non-gated, bf16 sans quantization) or FLUX.2-klein-9B (legacy, NF4+int8).

Refactored for the installer: every machine-specific value comes from the
environment (set by the Electron launcher from config/runtime.env), so the SAME
file works on any player's PC. No hard-coded paths.

Env it reads:
    LOCAL_MODELS_DIR     root of the HF model cache (FLUX lives in <dir>/hub)
    DND_PROFILE          balanced | performance | ultra
    DND_PROFILES_JSON    path to profiles.json (defaults next to this file)
    DND_OFFLINE          "1" (default) => local_files_only; "0" => may download
    HF_TOKEN             Hugging Face token (only needed if DND_OFFLINE=0)
    DND_IMAGE_PORT       default 8000
"""
import os
import io
import base64
import json
import threading

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from diffusers import Flux2KleinPipeline, Flux2Transformer2DModel
from diffusers import BitsAndBytesConfig as DiffusersBitsAndBytesConfig
from transformers import BitsAndBytesConfig as TransformersBitsAndBytesConfig
from transformers import AutoModelForCausalLM

try:
    from diffusers import ZImagePipeline
except ImportError:  # diffusers trop ancien — message clair au chargement
    ZImagePipeline = None

HERE = os.path.dirname(os.path.abspath(__file__))
LOCAL_MODELS_DIR = os.environ.get("LOCAL_MODELS_DIR", os.path.join(HERE, "..", "Local Models"))
CACHE_DIR = os.path.join(LOCAL_MODELS_DIR, "hub")
PROFILE_NAME = os.environ.get("DND_PROFILE", "balanced")
PROFILES_JSON = os.environ.get("DND_PROFILES_JSON", os.path.join(HERE, "..", "bootstrap", "profiles.json"))
OFFLINE = os.environ.get("DND_OFFLINE", "1") == "1"


def load_image_profile() -> dict:
    try:
        with open(PROFILES_JSON, "r", encoding="utf-8") as f:
            return json.load(f)["profiles"][PROFILE_NAME]["image"]
    except Exception as e:
        print(f"[flux] could not read profile '{PROFILE_NAME}' ({e}); using balanced defaults.")
        return {
            "model": "black-forest-labs/FLUX.2-klein-9B",
            "transformer_quant": "nf4", "text_encoder_quant": "nf4",
            "cpu_offload": True, "width": 1024, "height": 576,
            "steps": 4, "max_sequence_length": 256,
        }


PROFILE = load_image_profile()
MODEL_ID = PROFILE.get("model", "Tongyi-MAI/Z-Image-Turbo")
IS_ZIMAGE = "z-image" in MODEL_ID.lower() or "zimage" in MODEL_ID.lower()

app = FastAPI(title=f"Local Image Server [{PROFILE_NAME}]")
# Audit 2026-08-12 : wildcard + credentials est une combinaison CORS invalide ;
# aucune requête n'utilise de cookies.
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"],
)

pipe = None
# Audit 2026-08-12 : sérialise le GPU (2 requêtes simultanées → OOM) et protège
# le chargement (endpoints sync → threadpool).
GEN_LOCK = threading.Lock()
LOAD_LOCK = threading.Lock()


def _bnb_diffusers(quant: str):
    if quant == "nf4":
        return DiffusersBitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16)
    if quant == "int8":
        return DiffusersBitsAndBytesConfig(load_in_8bit=True)
    return None


def _bnb_transformers(quant: str):
    if quant == "nf4":
        return TransformersBitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16)
    if quant == "int8":
        return TransformersBitsAndBytesConfig(load_in_8bit=True)
    return None


def get_pipeline():
    global pipe
    if pipe is not None:
        return pipe
    with LOAD_LOCK:
        if pipe is not None:
            return pipe
        return _load_pipeline()


def _load_pipeline():
    # ML1 (contre-audit 2026-08-13) — construire dans une variable LOCALE et
    # n'assigner le global `pipe` qu'après le placement GPU réussi (comme la
    # copie dev). Avant : le global était publié à moitié chargé, et si
    # .to("cuda") levait un OOM, `pipe` restait assigné cassé pour toujours
    # pendant que /health répondait « ok » — le message « will retry on first
    # request » était mensonger (le fast-path renvoyait la pipeline morte).
    global pipe

    common = dict(cache_dir=CACHE_DIR, local_files_only=OFFLINE, torch_dtype=torch.bfloat16)

    if IS_ZIMAGE:
        # Z-Image-Turbo : pipeline entière en bf16, PAS de quantization — le 6B
        # tient en 12-16 Go avec offload et la qualité reste maximale (la
        # quantization NF4 est ce qui dégradait klein).
        if ZImagePipeline is None:
            raise RuntimeError(
                "diffusers ne connaît pas ZImagePipeline — update: "
                "pip install -U git+https://github.com/huggingface/diffusers.git"
            )
        print(f"[image] Loading {MODEL_ID}  profile={PROFILE_NAME}  bf16 offload={PROFILE.get('cpu_offload')}")
        p = ZImagePipeline.from_pretrained(MODEL_ID, **common)
        # FP8 weight-only (torchao) : transformer 12→~6 Go + TE 8→~4 Go → tout
        # résident sur un GPU 16 Go, au lieu de l'offload bf16 qui transférait
        # ~20 Go par image (1-2 min mesurées). DND_ZIMAGE_QUANT=bf16 désactive.
        quant_mode = os.environ.get("DND_ZIMAGE_QUANT", "auto").lower()
        want_fp8 = quant_mode == "fp8" or (quant_mode == "auto" and PROFILE.get("cpu_offload", True))
        if want_fp8:
            try:
                from torchao.quantization import quantize_
                try:
                    from torchao.quantization import Float8WeightOnlyConfig
                    fp8_config = Float8WeightOnlyConfig()
                except ImportError:  # anciennes versions de torchao
                    from torchao.quantization import float8_weight_only
                    fp8_config = float8_weight_only()
                print("[image] Quantizing Z-Image (transformer + text encoder) to FP8 weight-only (torchao)...")
                quantize_(p.transformer, fp8_config)
                quantize_(p.text_encoder, fp8_config)
                try:
                    p.to("cuda")
                    print(f"[image] {MODEL_ID} FP8 fully resident on GPU.")
                    pipe = p
                    return pipe
                except torch.cuda.OutOfMemoryError:
                    torch.cuda.empty_cache()
                    print("[image] FP8 done but VRAM still tight — keeping CPU offload.")
            except Exception as quant_error:
                print(f"[image] FP8 quantization unavailable ({quant_error!r}) — bf16 path.")
    else:
        t_quant = PROFILE.get("transformer_quant", "nf4")
        te_quant = PROFILE.get("text_encoder_quant", "nf4")
        print(f"[image] Loading {MODEL_ID}  profile={PROFILE_NAME}  transformer={t_quant} text_encoder={te_quant} offload={PROFILE.get('cpu_offload')}")

        t_cfg = _bnb_diffusers(t_quant)
        transformer = Flux2Transformer2DModel.from_pretrained(
            MODEL_ID, subfolder="transformer",
            **({"quantization_config": t_cfg} if t_cfg else {}), **common,
        )

        te_cfg = _bnb_transformers(te_quant)
        text_encoder = AutoModelForCausalLM.from_pretrained(
            MODEL_ID, subfolder="text_encoder",
            **({"quantization_config": te_cfg} if te_cfg else {}), **common,
        )

        p = Flux2KleinPipeline.from_pretrained(
            MODEL_ID, transformer=transformer, text_encoder=text_encoder, **common,
        )

    if PROFILE.get("cpu_offload", True):
        p.enable_model_cpu_offload()
    else:
        p.to("cuda")
    print(f"[image] {MODEL_ID} loaded.")
    pipe = p
    return pipe


@app.on_event("startup")
async def startup_event():
    try:
        get_pipeline()
    except Exception:
        import traceback
        print("[flux] startup pre-load failed (will retry on first request):")
        traceback.print_exc()


class ImageRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "16:9"
    num_inference_steps: int | None = None


# Audit 2026-08-12 : endpoints SYNC (def) → threadpool ; la génération GPU ne
# bloque plus la boucle d'événements et /health répond pendant une image.
@app.get("/health")
def health():
    try:
        get_pipeline()
        return {"status": "ok", "model": MODEL_ID, "profile": PROFILE_NAME}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def _dims(aspect_ratio: str) -> tuple[int, int]:
    w, h = PROFILE.get("width", 1024), PROFILE.get("height", 576)  # 16:9 base from profile
    if aspect_ratio == "1:1":
        s = min(w, h) if min(w, h) % 16 == 0 else 1024
        return s, s
    if aspect_ratio == "4:3":
        return w, round(w * 3 / 4 / 16) * 16
    if aspect_ratio == "3:4":
        return round(h * 3 / 4 / 16) * 16, h
    return w, h


@app.post("/generate-image")
def generate_image(request: ImageRequest):
    try:
        pipeline = get_pipeline()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model not loaded: {e}")
    try:
        width, height = _dims(request.aspect_ratio)
        steps = request.num_inference_steps or PROFILE.get("steps", 8 if IS_ZIMAGE else 4)
        # Turbo est distillé CFG → guidance 1.0 ; klein (distillé aussi) → 0.0.
        guidance = 1.0 if IS_ZIMAGE else 0.0
        print(f"[image] '{request.prompt[:60]}...' {width}x{height} steps={steps} gs={guidance}")
        gen_kwargs = dict(
            prompt=request.prompt, width=width, height=height,
            guidance_scale=guidance, num_inference_steps=steps,
        )
        # max_sequence_length est un paramètre FLUX ; Z-Image gère le prompt
        # via son encodeur Qwen3 sans cette limite explicite.
        if not IS_ZIMAGE:
            gen_kwargs["max_sequence_length"] = PROFILE.get("max_sequence_length", 256)
        # Verrou GPU : deux requêtes simultanées se sérialisent au lieu d'OOM.
        with GEN_LOCK:
            image = pipeline(**gen_kwargs).images[0]
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG", quality=85)
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return {"image": f"data:image/jpeg;base64,{img_str}"}
    except Exception as e:
        print(f"[flux] generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("DND_IMAGE_PORT", "8000")))
