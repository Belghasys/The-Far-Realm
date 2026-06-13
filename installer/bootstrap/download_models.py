"""
download_models.py — download the model weights required by the active profile.

Run inside the installed venv (huggingface_hub must be installed). Resumable:
re-running skips files already present. FLUX goes into <LOCAL_MODELS_DIR>/hub,
the Stable Audio 3 weights go directly under <LOCAL_MODELS_DIR>, matching exactly
what flux_server.py / audio_server.py expect at load time.

Usage:
    python download_models.py --profile balanced --models-dir "D:\\...\\Local Models" \
        --profiles-json profiles.json [--token hf_xxx]
"""
import argparse
import json
import os
import sys


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", required=True)
    ap.add_argument("--models-dir", required=True)
    ap.add_argument("--profiles-json", default=os.path.join(os.path.dirname(__file__), "profiles.json"))
    ap.add_argument("--token", default=os.environ.get("HF_TOKEN"))
    args = ap.parse_args()

    # Faster transfers when the optional hf_transfer backend is installed.
    os.environ.setdefault("HF_HUB_ENABLE_HF_TRANSFER", "1")

    from huggingface_hub import snapshot_download
    from huggingface_hub.utils import GatedRepoError, HfHubHTTPError

    with open(args.profiles_json, "r", encoding="utf-8") as f:
        profile = json.load(f)["profiles"][args.profile]

    dl = profile.get("download", {})
    image_repos = dl.get("image", [])
    audio_repos = dl.get("audio", [])

    hub_dir = os.path.join(args.models_dir, "hub")   # FLUX cache root
    os.makedirs(hub_dir, exist_ok=True)
    os.makedirs(args.models_dir, exist_ok=True)

    jobs = [(r, hub_dir, "image") for r in image_repos] + \
           [(r, args.models_dir, "audio") for r in audio_repos]

    total = len(jobs)
    for i, (repo, cache_dir, kind) in enumerate(jobs, 1):
        print(f"\n[{i}/{total}] Downloading {kind}: {repo}", flush=True)
        try:
            snapshot_download(
                repo_id=repo,
                cache_dir=cache_dir,
                token=args.token,
                resume_download=True,
            )
            print(f"    OK -> {cache_dir}", flush=True)
        except GatedRepoError:
            print(
                f"\n  !! '{repo}' is GATED. Accept its license while logged in:\n"
                f"     https://huggingface.co/{repo}\n"
                f"     Then re-run setup (the download resumes).",
                flush=True,
            )
            return 3
        except HfHubHTTPError as e:
            if "401" in str(e) or "403" in str(e):
                print(f"\n  !! Auth failed for '{repo}'. Check your Hugging Face token and license acceptance.", flush=True)
                return 4
            print(f"\n  !! HTTP error downloading '{repo}': {e}", flush=True)
            return 5

    print("\nAll model weights present.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
