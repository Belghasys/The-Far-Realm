"""
flux_server.py — FLUX.2-klein-9B local image server (port 8000).

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

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from diffusers import Flux2KleinPipeline, Flux2Transformer2DModel
from diffusers import BitsAndBytesConfig as DiffusersBitsAndBytesConfig
from transformers import BitsAndBytesConfig as TransformersBitsAndBytesConfig
from transformers import AutoModelForCausalLM

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
MODEL_ID = PROFILE.get("model", "black-forest-labs/FLUX.2-klein-9B")

app = FastAPI(title=f"FLUX.2-klein-9B Local Server [{PROFILE_NAME}]")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

pipe = None


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

    t_quant = PROFILE.get("transformer_quant", "nf4")
    te_quant = PROFILE.get("text_encoder_quant", "nf4")
    print(f"[flux] Loading {MODEL_ID}  profile={PROFILE_NAME}  transformer={t_quant} text_encoder={te_quant} offload={PROFILE.get('cpu_offload')}")

    common = dict(cache_dir=CACHE_DIR, local_files_only=OFFLINE, torch_dtype=torch.bfloat16)

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

    pipe = Flux2KleinPipeline.from_pretrained(
        MODEL_ID, transformer=transformer, text_encoder=text_encoder, **common,
    )

    if PROFILE.get("cpu_offload", True):
        pipe.enable_model_cpu_offload()
    else:
        pipe.to("cuda")
    print(f"[flux] {MODEL_ID} loaded.")
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


@app.get("/health")
async def health():
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
async def generate_image(request: ImageRequest):
    try:
        pipeline = get_pipeline()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model not loaded: {e}")
    try:
        width, height = _dims(request.aspect_ratio)
        steps = request.num_inference_steps or PROFILE.get("steps", 4)
        print(f"[flux] '{request.prompt[:60]}...' {width}x{height} steps={steps}")
        image = pipeline(
            prompt=request.prompt, width=width, height=height,
            guidance_scale=0.0, num_inference_steps=steps,
            max_sequence_length=PROFILE.get("max_sequence_length", 256),
        ).images[0]
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
