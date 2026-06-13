<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1mdyTbScA0-_k5P4I5uqARtO1xRqgFKZN

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set `VITE_GEMINI_API_KEY`.
3. Run the app:
   `npm run dev`

## Local Image Generation with FLUX.1-schnell

To bypass Gemini's image generation limits and generate scene images locally using your PC's GPU (RTX 5070 Ti, etc.):

### 1. Python Environment Setup
You need Python 3.10+ installed.

1. **Install PyTorch with CUDA support** (essential for GPU acceleration):
   Visit [pytorch.org](https://pytorch.org/) or run:
   ```bash
   pip install torch --index-url https://download.pytorch.org/whl/cu121
   ```
2. **Install required libraries**:
   ```bash
   pip install fastapi uvicorn diffusers transformers accelerate pydantic sentencepiece
   ```

### 2. Hugging Face Access Setup
`FLUX.1-schnell` is hosted on Hugging Face and requires accepting their license terms.
1. Go to [black-forest-labs/FLUX.1-schnell](https://huggingface.co/black-forest-labs/FLUX.1-schnell) and accept the terms of use.
2. Create a Hugging Face Access Token in your HF Account settings (Write/Read).
3. Set your token as an environment variable in your terminal before running the server:
   * **Windows (PowerShell)**: `$env:HF_TOKEN="your_token_here"`
   * **Windows (CMD)**: `set HF_TOKEN=your_token_here`

### 3. Run the Local Server
Start the local server by running:
```bash
python flux_server.py
```
It will automatically download the model on the first run (approx. 23 GB) and load it into your GPU's VRAM.

### 4. Enable Local Server in App
Make sure your `.env` file contains the URL path:
```env
VITE_LOCAL_IMAGE_SERVER_URL=http://127.0.0.1:8000/generate-image
```
If the local server is running, the app will automatically route image generation requests to FLUX.1-schnell. If the local server is not running or fails, the app will fall back to Gemini automatically.

