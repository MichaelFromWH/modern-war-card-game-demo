import argparse
import json
import os
import random
import shutil
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
import yaml


def parse_args():
    parser = argparse.ArgumentParser(description="Generate game SFX with iflytek/AudioFly.")
    parser.add_argument("--audiofly-root", required=True, help="Local AudioFly repository root.")
    parser.add_argument("--prompts", default="assets/audio/sfx/audiofly-prompts.json")
    parser.add_argument("--output-dir", default="assets/audio/sfx/generated")
    parser.add_argument("--names", nargs="*", help="Optional prompt names to generate.")
    parser.add_argument("--limit", type=int, help="Generate only the first N selected prompts.")
    parser.add_argument("--cfg", type=float, default=3.5)
    parser.add_argument("--steps", type=int, default=200)
    parser.add_argument("--wav-sec", type=float, default=4.0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--half", action="store_true", help="Use fp16 to reduce VRAM use.")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--manifest-only", action="store_true", help="Rebuild manifest for existing generated files.")
    return parser.parse_args()


def add_audiofly_to_path(audiofly_root):
    root = Path(audiofly_root).resolve()
    if not root.exists():
        raise FileNotFoundError(f"AudioFly root not found: {root}")
    sys.path.insert(0, str(root))
    sys.path.insert(0, str(root / "ldm" / "modules" / "bigvgan"))
    return root


def load_prompts(path, names=None, limit=None):
    prompts = json.loads(Path(path).read_text(encoding="utf-8"))
    if names:
        wanted = set(names)
        prompts = [item for item in prompts if item["name"] in wanted or item.get("event") in wanted]
    if limit:
        prompts = prompts[:limit]
    if not prompts:
        raise ValueError("No prompts selected.")
    return prompts


def load_model(audiofly_root, half=False):
    from ldm.utils.util import instantiate_from_config

    config_path = audiofly_root / "config" / "config.yaml"
    checkpoint_path = audiofly_root / "models" / "ldm" / "model.ckpt"
    if not checkpoint_path.exists() or checkpoint_path.stat().st_size < 1024 * 1024:
        raise FileNotFoundError(f"AudioFly checkpoint is missing or still an LFS pointer: {checkpoint_path}")

    with config_path.open("r", encoding="utf-8") as handle:
        configs = yaml.load(handle, Loader=yaml.FullLoader)

    model = instantiate_from_config(configs["model"])
    checkpoint = torch.load(str(checkpoint_path), map_location="cpu")
    model.load_state_dict(checkpoint, strict=False)
    del checkpoint

    model.eval()
    model = model.cuda()
    if half:
        model = model.half()
    torch.cuda.empty_cache()
    return model


def normalize_wav(path, max_duration=4.5, target_peak=0.92):
    audio, sample_rate = sf.read(path, always_2d=False)
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)
    max_samples = int(sample_rate * max_duration)
    audio = audio[:max_samples]

    if audio.size:
        fade = min(int(sample_rate * 0.015), audio.size // 4)
        if fade > 0:
            audio[:fade] *= np.linspace(0.0, 1.0, fade)
            audio[-fade:] *= np.linspace(1.0, 0.0, fade)
        peak = float(np.max(np.abs(audio)))
        if peak > 0:
            audio = audio * min(4.0, target_peak / peak)

    sf.write(path, audio, sample_rate)


def write_manifest(output_dir, prompt_items, project_root):
    records = []
    for item in prompt_items:
        out_path = output_dir / f"{item['name']}.wav"
        if out_path.exists():
            records.append({**item, "file": str(out_path.relative_to(project_root)).replace("\\", "/")})
    (output_dir / "manifest.json").write_text(json.dumps(records, indent=2), encoding="utf-8")


def main():
    args = parse_args()
    project_root = Path.cwd()
    audiofly_root = add_audiofly_to_path(args.audiofly_root)
    output_dir = (project_root / args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    os.chdir(audiofly_root)

    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)

    prompt_path = project_root / args.prompts
    prompts = load_prompts(prompt_path, args.names, args.limit)
    all_prompts = load_prompts(prompt_path)
    if args.manifest_only:
        write_manifest(output_dir, all_prompts, project_root)
        return

    model = load_model(audiofly_root, half=args.half)

    with torch.inference_mode():
        for item in prompts:
            name = item["name"]
            out_path = output_dir / f"{name}.wav"
            if out_path.exists() and not args.overwrite:
                print(f"skip existing {out_path}")
            else:
                tmp_dir = output_dir / "_tmp"
                tmp_dir.mkdir(exist_ok=True)
                print(f"generate {name}: {item['prompt']}")
                model.generate_sample(
                    textlist=[item["prompt"]],
                    name=name,
                    cfg=args.cfg,
                    ddim_steps=args.steps,
                    outputdir=str(tmp_dir),
                    wav_sec=args.wav_sec,
                )
                tmp_path = tmp_dir / f"{name}.wav"
                shutil.move(str(tmp_path), str(out_path))
                normalize_wav(out_path, max_duration=max(1.0, args.wav_sec + 0.5))

    write_manifest(output_dir, all_prompts, project_root)
    tmp_dir = output_dir / "_tmp"
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)


if __name__ == "__main__":
    main()
