"""
setup.py — first-run bootstrap for DnD: The Far Realm (local media engine).

Run once after install (by the Inno wizard) and re-runnable any time as "Repair".
Idempotent: an existing venv is reused, pip/download steps resume.

It:
  1. Detects the GPU and picks a profile (unless --profile forces one).
  2. Creates an isolated venv with `uv` (uv fetches a managed Python if needed).
  3. Installs requirements.txt (PyTorch CUDA + diffusers + Stable Audio deps).
  4. Verifies the bundled stable_audio_3 engine (or clones it if --sa3-repo given).
  5. Writes config/runtime.env + config/profile.json.
  6. Downloads the model weights for the chosen profile (resumable).
  7. Drops config/.setup-complete on success.

Layout it assumes (install root passed via --install-dir):
    <root>/bootstrap/   this folder
    <root>/servers/     flux_server.py, audio_server.py
    <root>/engine/sa3/  stable_audio_3 package
    <root>/tools/uv.exe (or --uv)
    <root>/runtime/venv (created here)
    <root>/config/      (created here)
    <models-dir>        weights (default <root>/Local Models)
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

import gpu_detect  # same folder


def run(cmd, **kw):
    print("  $ " + " ".join(str(c) for c in cmd), flush=True)
    return subprocess.run(cmd, check=True, **kw)


def find_uv(arg_uv: str | None, root: str) -> str:
    for cand in (arg_uv, os.path.join(root, "tools", "uv.exe"), shutil.which("uv")):
        if cand and os.path.exists(cand):
            return cand
    sys.exit("FATAL: uv not found. Pass --uv <path to uv.exe> or put it in <root>/tools/.")


def venv_python(venv_dir: str) -> str:
    p = os.path.join(venv_dir, "Scripts", "python.exe")  # Windows
    return p if os.path.exists(p) else os.path.join(venv_dir, "bin", "python")


def main() -> int:
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--install-dir", default=os.path.dirname(here))
    ap.add_argument("--models-dir", default=None)
    ap.add_argument("--profile", default="auto", help="auto | balanced | performance | ultra")
    ap.add_argument("--hf-token", default=os.environ.get("HF_TOKEN", ""))
    ap.add_argument("--gemini-key", default=os.environ.get("VITE_GEMINI_API_KEY", ""))
    ap.add_argument("--uv", default=None)
    ap.add_argument("--sa3-repo", default=None, help="git URL to clone if engine/sa3 is missing")
    ap.add_argument("--python-version", default="3.11")
    ap.add_argument("--skip-download", action="store_true", help="write config but defer the model download")
    args = ap.parse_args()

    root = os.path.abspath(args.install_dir)
    models_dir = os.path.abspath(args.models_dir) if args.models_dir else os.path.join(root, "Local Models")
    profiles_json = os.path.join(here, "profiles.json")
    venv_dir = os.path.join(root, "runtime", "venv")
    config_dir = os.path.join(root, "config")
    sa3_dir = os.path.join(root, "engine", "sa3")
    os.makedirs(config_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)

    print("=" * 64)
    print(" DnD: The Far Realm — local media engine setup")
    print("=" * 64)

    # 1. GPU + profile -----------------------------------------------------
    profiles = gpu_detect.load_profiles(profiles_json)
    name, vram = gpu_detect.query_gpu()
    if args.profile != "auto" and args.profile in profiles:
        profile = args.profile
    else:
        profile = gpu_detect.pick_profile(vram, profiles) if name else "balanced"
    print(f"GPU: {name or 'none detected'} ({vram} GB)  ->  profile: {profile}")
    if not name:
        print("WARNING: no CUDA GPU detected. Local generation will be unavailable;")
        print("         the game falls back to Gemini for images/audio.")

    # 2. venv --------------------------------------------------------------
    uv = find_uv(args.uv, root)
    print("\n[1/5] Creating Python environment...")
    run([uv, "venv", venv_dir, "--python", args.python_version])
    py = venv_python(venv_dir)

    # 3. dependencies ------------------------------------------------------
    print("\n[2/5] Installing libraries (PyTorch CUDA, diffusers, Stable Audio)... (several GB)")
    run([uv, "pip", "install", "--python", py,
         "--index-strategy", "unsafe-best-match",
         "-r", os.path.join(here, "requirements.txt")])

    # 4. audio engine ------------------------------------------------------
    print("\n[3/5] Checking Stable Audio 3 engine...")
    if os.path.isdir(sa3_dir) and os.listdir(sa3_dir):
        print(f"  bundled engine present: {sa3_dir}")
    elif args.sa3_repo:
        os.makedirs(os.path.dirname(sa3_dir), exist_ok=True)
        run(["git", "clone", "--depth", "1", args.sa3_repo, sa3_dir])
    else:
        print(f"  WARNING: {sa3_dir} missing and no --sa3-repo given. Audio will be disabled "
              f"until the stable_audio_3 package is placed there.")

    # 5. config files ------------------------------------------------------
    print("\n[4/5] Writing config...")
    env_lines = [
        "# Generated by setup.py — runtime config for DnD: The Far Realm.",
        "# VITE_* keys are exposed to the game UI by the launcher (window.__DND_RUNTIME__).",
        f"VITE_GEMINI_API_KEY={args.gemini_key}",
        "VITE_AUDIO_MODEL=models/gemini-3.1-flash-live-preview",
        "VITE_IMAGE_MODEL=gemini-3.1-flash-image-preview",
        "VITE_LLM_MODEL=gemini-flash-latest",
        "VITE_SUMMARY_MODEL=gemini-flash-latest",
        "VITE_BRANCH_MODEL=gemini-flash-latest",
        "VITE_LOCAL_IMAGE_SERVER_URL=http://127.0.0.1:8000/generate-image",
        "VITE_LOCAL_AUDIO_SERVER_URL=http://127.0.0.1:8001",
        "# --- engine vars (used to spawn the python servers) ---",
        f"DND_PROFILE={profile}",
        f"LOCAL_MODELS_DIR={models_dir}",
        f"SA3_SRC={sa3_dir}",
        f"DND_PROFILES_JSON={profiles_json}",
        f"HF_TOKEN={args.hf_token}",
        "DND_OFFLINE=1",
    ]
    with open(os.path.join(config_dir, "runtime.env"), "w", encoding="utf-8") as f:
        f.write("\n".join(env_lines) + "\n")
    with open(os.path.join(config_dir, "profile.json"), "w", encoding="utf-8") as f:
        json.dump({"profile": profile, "models_dir": models_dir,
                   "detected_gpu": {"name": name, "vram_gb": vram}}, f, indent=2)

    # 6. model weights -----------------------------------------------------
    if args.skip_download:
        print("\n[5/5] Skipping model download (--skip-download). Run Repair later to fetch weights.")
        print("\nSetup finished (config written, weights pending).")
        return 0
    print("\n[5/5] Downloading model weights for profile (resumable)...")
    env = dict(os.environ, HF_TOKEN=args.hf_token or "")
    rc = subprocess.run(
        [py, os.path.join(here, "download_models.py"),
         "--profile", profile, "--models-dir", models_dir,
         "--profiles-json", profiles_json] + (["--token", args.hf_token] if args.hf_token else []),
        env=env,
    ).returncode
    if rc != 0:
        print(f"\nModel download did not complete (code {rc}). Re-run setup once fixed.")
        return rc

    open(os.path.join(config_dir, ".setup-complete"), "w").close()
    print("\n" + "=" * 64)
    print(" Setup complete. You can now launch DnD: The Far Realm.")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except subprocess.CalledProcessError as e:
        print(f"\nFATAL: a setup command failed (exit {e.returncode}).")
        sys.exit(e.returncode or 1)
