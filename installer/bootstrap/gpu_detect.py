"""
gpu_detect.py — detect the NVIDIA GPU via nvidia-smi and pick the best profile.

Prints a JSON object on stdout:
    {"name": "...", "vram_gb": 16, "recommended_profile": "balanced", "cuda": true}

Used by the installer wizard (to pre-select a profile) and by setup.py.
Exit code is always 0 unless --strict is passed and no CUDA GPU is found.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def load_profiles(profiles_json: str | None = None) -> dict:
    path = profiles_json or os.path.join(HERE, "profiles.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)["profiles"]


def query_gpu() -> tuple[str | None, int]:
    """Return (gpu_name, vram_gb). (None, 0) when no NVIDIA GPU / nvidia-smi."""
    smi = shutil.which("nvidia-smi")
    if not smi:
        # Common fallback location on Windows when PATH is missing it.
        candidate = os.path.join(
            os.environ.get("SystemRoot", r"C:\Windows"), "System32", "nvidia-smi.exe"
        )
        smi = candidate if os.path.exists(candidate) else None
    if not smi:
        return None, 0
    try:
        out = subprocess.check_output(
            [smi, "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        return None, 0
    first = next((ln.strip() for ln in out.splitlines() if ln.strip()), "")
    if not first:
        return None, 0
    parts = [p.strip() for p in first.split(",")]
    name = parts[0] if parts else None
    try:
        vram_gb = round(int(parts[1]) / 1024)  # MiB -> GiB
    except (IndexError, ValueError):
        vram_gb = 0
    return name, vram_gb


def pick_profile(vram_gb: int, profiles: dict) -> str:
    """Highest profile whose min_vram_gb fits, else the smallest one."""
    eligible = [
        (p["min_vram_gb"], key)
        for key, p in profiles.items()
        if vram_gb >= p.get("min_vram_gb", 0)
    ]
    if eligible:
        return max(eligible)[1]
    return min(profiles.items(), key=lambda kv: kv[1].get("min_vram_gb", 0))[0]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--profiles-json", default=None)
    ap.add_argument("--strict", action="store_true", help="exit 2 if no CUDA GPU")
    args = ap.parse_args()

    profiles = load_profiles(args.profiles_json)
    name, vram_gb = query_gpu()
    cuda = name is not None
    profile = pick_profile(vram_gb, profiles) if cuda else "balanced"

    print(json.dumps({
        "name": name,
        "vram_gb": vram_gb,
        "recommended_profile": profile,
        "cuda": cuda,
    }))
    if args.strict and not cuda:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
