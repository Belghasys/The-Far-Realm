"""
flux_server.py — serveur d'images local (port 8000).

Modèle par défaut : Z-Image-Turbo (Tongyi/Alibaba) — 6B S3-DiT, Apache 2.0,
NON-gated. Distillé CFG : 8 steps, guidance 1.0, qualité > FLUX.2-klein NF4
sans aucune quantization (c'est la quantization 4-bit qui abîmait klein).

Bascule de secours : DND_IMAGE_MODEL=klein relance l'ancien FLUX.2-klein-9B
(NF4 + int8) à l'identique.

Env optionnels :
    DND_IMAGE_MODEL   zimage (défaut) | klein
    DND_ZIMAGE_ID     repo HF (défaut Tongyi-MAI/Z-Image-Turbo)
    DND_IMAGE_STEPS   override du nombre de steps
    DND_ZIMAGE_QUANT  auto (défaut) | fp8 | bf16
                      auto : FP8 weight-only (torchao) quand la VRAM < 20 Go —
                      le transformer 12 Go tombe à ~6 Go et TOUT reste résident
                      sur le GPU. C'était le va-et-vient RAM↔VRAM du bf16
                      (enable_model_cpu_offload) qui coûtait 1-2 min par image
                      sur 16 Go, pas le calcul. Perte de qualité FP8 : quasi
                      nulle (rien à voir avec le NF4 4-bit qui abîmait klein).
"""
import os
import io
import base64
import threading
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from diffusers import Flux2KleinPipeline, Flux2Transformer2DModel
from diffusers import BitsAndBytesConfig as DiffusersBitsAndBytesConfig
from transformers import BitsAndBytesConfig as TransformersBitsAndBytesConfig
from transformers import AutoModelForCausalLM

# ZImagePipeline est récent dans diffusers — import gardé pour donner un
# message clair (« mets à jour diffusers ») au lieu d'un ImportError au boot.
try:
    from diffusers import ZImagePipeline
except ImportError:
    ZImagePipeline = None

# Audit 2026-08-12 : chemin D:\ codé en dur — cassait sur toute autre machine.
# Surchargez avec LOCAL_MODELS_DIR ; le défaut historique reste pour ce poste.
_DEFAULT_MODELS = r"D:\SalimAI\DnD - The Far Realm\Local Models"
LOCAL_MODELS_DIR = os.environ.get("LOCAL_MODELS_DIR", _DEFAULT_MODELS)
CACHE_DIR = os.path.join(LOCAL_MODELS_DIR, "hub")
MODEL_FAMILY = os.environ.get("DND_IMAGE_MODEL", "zimage").lower()
ZIMAGE_ID = os.environ.get("DND_ZIMAGE_ID", "Tongyi-MAI/Z-Image-Turbo")
KLEIN_ID = "black-forest-labs/FLUX.2-klein-9B"
MODEL_ID = ZIMAGE_ID if MODEL_FAMILY == "zimage" else KLEIN_ID

app = FastAPI(title=f"Local Image Server — {MODEL_ID}")

# Configurer le CORS pour permettre les requêtes depuis l'application Vite.
# Audit 2026-08-12 : allow_origins=["*"] AVEC allow_credentials=True est une
# combinaison invalide/interdite par la spec CORS — aucune requête n'utilise de
# cookies, on coupe credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variable globale pour stocker le pipeline
pipe = None
# Audit 2026-08-12 : deux requêtes simultanées faisaient tourner DEUX
# générations sur le GPU (OOM). Un verrou sérialise le GPU ; un second verrou
# protège le chargement (les endpoints sync tournent dans le threadpool).
GEN_LOCK = threading.Lock()
LOAD_LOCK = threading.Lock()


def _vram_gb() -> int:
    try:
        return round(torch.cuda.get_device_properties(0).total_memory / (1024 ** 3))
    except Exception:
        return 0


def _load_zimage():
    if ZImagePipeline is None:
        raise RuntimeError(
            "Ce diffusers ne connaît pas ZImagePipeline — mets-le à jour :\n"
            "  pip install -U git+https://github.com/huggingface/diffusers.git"
        )
    print(f"Loading {ZIMAGE_ID} (bf16, no quantization) on CUDA...")
    kwargs = dict(torch_dtype=torch.bfloat16, cache_dir=CACHE_DIR)
    try:
        p = ZImagePipeline.from_pretrained(ZIMAGE_ID, local_files_only=True, **kwargs)
    except Exception:
        # Non-gated + Apache 2.0 : on peut télécharger sans token (~19 Go,
        # reprise sur coupure gérée par huggingface_hub).
        print(f"{ZIMAGE_ID} absent du cache local — téléchargement (~19 Go, reprenable)...")
        p = ZImagePipeline.from_pretrained(ZIMAGE_ID, local_files_only=False, **kwargs)

    vram = _vram_gb()
    quant_mode = os.environ.get("DND_ZIMAGE_QUANT", "auto").lower()
    want_fp8 = quant_mode == "fp8" or (quant_mode == "auto" and 0 < vram < 20)

    if want_fp8:
        # FP8 weight-only (torchao) : transformer 12→~6 Go, text encoder
        # Qwen3-4B 8→~4 Go → ~11 Go résidents sur le GPU. Fini l'offload CPU
        # qui transférait ~20 Go par image (54-122 s mesurés sur 16 Go).
        try:
            from torchao.quantization import quantize_
            try:
                from torchao.quantization import Float8WeightOnlyConfig
                fp8_config = Float8WeightOnlyConfig()
            except ImportError:  # anciennes versions de torchao
                from torchao.quantization import float8_weight_only
                fp8_config = float8_weight_only()
            print("Quantizing Z-Image (transformer + text encoder) to FP8 weight-only (torchao)...")
            quantize_(p.transformer, fp8_config)
            quantize_(p.text_encoder, fp8_config)
            try:
                p.to("cuda")
                print(f"Z-Image-Turbo FP8 fully resident on GPU ({vram} GB VRAM).")
            except torch.cuda.OutOfMemoryError:
                torch.cuda.empty_cache()
                p.enable_model_cpu_offload()
                print(f"Z-Image-Turbo FP8 with CPU offload — VRAM still tight ({vram} GB).")
            return p
        except Exception as quant_error:
            print(f"FP8 quantization unavailable ({quant_error!r}) — falling back to bf16.")

    if vram >= 20:
        # 5090/4090 : tout résident (transformer 6B ≈ 12 Go + TE Qwen3-4B).
        p.to("cuda")
        print(f"Z-Image-Turbo fully resident on GPU ({vram} GB VRAM).")
    else:
        # 12-16 Go : le text encoder est déchargé entre les steps.
        p.enable_model_cpu_offload()
        print(f"Z-Image-Turbo with CPU offload ({vram} GB VRAM).")
    return p


def _load_klein():
    print("Loading FLUX.2-klein-9B (transformer NF4, text encoder INT8) on CUDA...")
    # Configurer la quantification 4-bit (NF4) pour le Transformer
    bnb_config = DiffusersBitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )

    # Charger le Transformer en 4-bit (~5 Go de VRAM)
    transformer = Flux2Transformer2DModel.from_pretrained(
        KLEIN_ID,
        subfolder="transformer",
        quantization_config=bnb_config,
        torch_dtype=torch.bfloat16,
        cache_dir=CACHE_DIR,
        local_files_only=True
    )

    # Text Encoder Qwen3 en INT8 (pas nf4) : c'est lui qui LIT le prompt,
    # et en 4-bit il perdait la comprehension des scenes complexes.
    text_encoder_config = TransformersBitsAndBytesConfig(load_in_8bit=True)
    text_encoder = AutoModelForCausalLM.from_pretrained(
        KLEIN_ID,
        subfolder="text_encoder",
        quantization_config=text_encoder_config,
        torch_dtype=torch.bfloat16,
        cache_dir=CACHE_DIR,
        local_files_only=True
    )

    p = Flux2KleinPipeline.from_pretrained(
        KLEIN_ID,
        transformer=transformer,
        text_encoder=text_encoder,
        torch_dtype=torch.bfloat16,
        cache_dir=CACHE_DIR,
        local_files_only=True
    )
    p.enable_model_cpu_offload()
    print("FLUX.2-klein-9B (4-bit NF4 optimized) loaded successfully.")
    return p


def get_pipeline():
    global pipe
    if pipe is not None:
        return pipe
    with LOAD_LOCK:
        if pipe is not None:
            return pipe
        try:
            pipe = _load_zimage() if MODEL_FAMILY == "zimage" else _load_klein()
            return pipe
        except Exception as e:
            import traceback
            print("Error loading model:")
            traceback.print_exc()
            print("Please check that PyTorch with CUDA is installed.")
            raise e


@app.on_event("startup")
async def startup_event():
    try:
        get_pipeline()
    except Exception:
        import traceback
        print("Startup pre-load failed trace:")
        traceback.print_exc()
        print("Will retry on first request.")


class ImageRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "16:9"
    # Turbo est distillé pour ~8 steps ; klein reste à 6. None = défaut du modèle.
    num_inference_steps: int | None = None


# Audit 2026-08-12 : endpoints SYNC (def, pas async def) → FastAPI les exécute
# dans le threadpool et la génération GPU ne bloque plus la boucle d'événements
# (/health pendait pendant chaque image, rendant tout liveness-probe inutile).
@app.get("/health")
def health():
    try:
        get_pipeline()
        return {"status": "ok", "model": MODEL_ID}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/generate-image")
def generate_image(request: ImageRequest):
    try:
        pipeline = get_pipeline()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model not loaded: {str(e)}")

    try:
        # Dimensions multiples de 16 (exigence DiT, valable Z-Image ET FLUX)
        width, height = 1024, 576  # 16:9
        if request.aspect_ratio == "1:1":
            width, height = 1024, 1024
        elif request.aspect_ratio == "4:3":
            width, height = 1024, 768
        elif request.aspect_ratio == "3:4":
            width, height = 768, 1024

        is_zimage = MODEL_FAMILY == "zimage"
        default_steps = 8 if is_zimage else 6
        # Audit 2026-08-12 : int() sur une valeur non numérique levait une 500
        # par requête — parse tolérant.
        try:
            env_steps = int(os.environ.get("DND_IMAGE_STEPS", "0"))
        except ValueError:
            env_steps = 0
        steps = env_steps or request.num_inference_steps or default_steps
        # Z-Image-Turbo est distillé CFG → guidance 1.0 (pas de negative prompt).
        # Klein (distillé lui aussi) tourne à 0.0 comme avant.
        guidance = 1.0 if is_zimage else 0.0

        print(f"Generating image for prompt: '{request.prompt[:60]}...' {width}x{height} steps={steps} gs={guidance}")

        # Verrou GPU : les requêtes simultanées se sérialisent au lieu d'OOM.
        with GEN_LOCK:
            image = pipeline(
                prompt=request.prompt,
                width=width,
                height=height,
                guidance_scale=guidance,
                num_inference_steps=steps,
            ).images[0]

        # Convertir en JPEG base64
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG", quality=85)
        img_str = base64.b64encode(buffered.getvalue()).decode()

        print("Generation complete.")
        return {"image": f"data:image/jpeg;base64,{img_str}"}
    except Exception as e:
        print(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
