import os
import io
import base64
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

app = FastAPI(title="FLUX.2-klein-9B Local Server")
CACHE_DIR = r"D:\SalimAI\DnD - The Far Realm\Local Models\hub"

# Configurer le CORS pour permettre les requêtes depuis l'application Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variable globale pour stocker le pipeline
pipe = None

def get_pipeline():
    global pipe
    if pipe is not None:
        return pipe
        
    print("Loading FLUX.2-klein-9B model with 4-bit NF4 Quantization on CUDA...")
    try:
        # Configurer la quantification 4-bit (NF4) pour le Transformer
        bnb_config = DiffusersBitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16
        )
        
        # Charger le Transformer en 4-bit (~5 Go de VRAM)
        transformer = Flux2Transformer2DModel.from_pretrained(
            "black-forest-labs/FLUX.2-klein-9B",
            subfolder="transformer",
            quantization_config=bnb_config,
            torch_dtype=torch.bfloat16,
            cache_dir=CACHE_DIR,
            local_files_only=True
        )
        
        # Configurer la quantification 4-bit pour le Text Encoder Qwen3
        text_encoder_config = TransformersBitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16
        )
        
        # Charger le Text Encoder Qwen3 en 4-bit (~4.5 Go de VRAM)
        text_encoder = AutoModelForCausalLM.from_pretrained(
            "black-forest-labs/FLUX.2-klein-9B",
            subfolder="text_encoder",
            quantization_config=text_encoder_config,
            torch_dtype=torch.bfloat16,
            cache_dir=CACHE_DIR,
            local_files_only=True
        )
        
        # Charger la pipeline globale en bfloat16 en passant les versions quantifiées
        pipe = Flux2KleinPipeline.from_pretrained(
            "black-forest-labs/FLUX.2-klein-9B", 
            transformer=transformer,
            text_encoder=text_encoder,
            torch_dtype=torch.bfloat16,
            cache_dir=CACHE_DIR,
            local_files_only=True
        )
        
        # Activer le CPU offload pour un maximum d'économie de mémoire
        pipe.enable_model_cpu_offload()
        print("FLUX.2-klein-9B (4-bit NF4 optimized) loaded successfully.")
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
    except Exception as e:
        import traceback
        print("Startup pre-load failed trace:")
        traceback.print_exc()
        print("Will retry on first request.")

class ImageRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "16:9"
    num_inference_steps: int = 4  # Schnell/Klein est optimisé pour 4 étapes

@app.get("/health")
async def health():
    try:
        get_pipeline()
        return {"status": "ok", "model": "FLUX.2-klein-9B"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/generate-image")
async def generate_image(request: ImageRequest):
    try:
        pipeline = get_pipeline()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model not loaded: {str(e)}")
    
    try:
        # Résolutions optimisées pour FLUX.1 / FLUX.2
        width, height = 1024, 576  # 16:9
        if request.aspect_ratio == "1:1":
            width, height = 1024, 1024
        elif request.aspect_ratio == "3:4" or request.aspect_ratio == "4:3":
            if request.aspect_ratio == "4:3":
                width, height = 1024, 768
            else:
                width, height = 768, 1024
        
        print(f"Generating image for prompt: '{request.prompt[:60]}...' with size {width}x{height}")
        
        image = pipeline(
            prompt=request.prompt,
            width=width,
            height=height,
            guidance_scale=0.0,  # Schnell/Klein n'utilise pas de guidance scale (0.0 est recommandé)
            num_inference_steps=request.num_inference_steps,
            max_sequence_length=256,
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
