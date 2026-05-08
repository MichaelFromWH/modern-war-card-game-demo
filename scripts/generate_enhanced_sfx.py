from __future__ import annotations

import json
import math
import wave
from pathlib import Path

import numpy as np


SR = 44_100
ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "audio" / "sfx" / "generated"
OUT_DIR = ROOT / "assets" / "audio" / "sfx" / "enhanced"
RNG = np.random.default_rng(44017)


def read_wav(name: str) -> np.ndarray:
    path = SOURCE_DIR / name
    if not path.exists():
        return np.zeros(0, dtype=np.float32)
    with wave.open(str(path), "rb") as source:
        channels = source.getnchannels()
        width = source.getsampwidth()
        rate = source.getframerate()
        frames = source.readframes(source.getnframes())
    if width != 2:
        raise ValueError(f"Only 16-bit PCM is supported: {path}")
    data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    if channels > 1:
        data = data.reshape(-1, channels).mean(axis=1)
    if rate != SR:
        data = resample_linear(data, rate, SR)
    return data


def write_wav(name: str, signal: np.ndarray) -> dict[str, float | str]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    signal = np.asarray(signal, dtype=np.float32)
    if signal.size == 0:
        signal = np.zeros(int(SR * 0.2), dtype=np.float32)
    signal = remove_dc(signal)
    signal = fade(signal, 0.006, 0.28)
    signal = soft_clip(signal, 1.35)
    peak = float(np.max(np.abs(signal))) or 1.0
    signal = signal / peak * 0.92
    out = np.clip(signal * 32767.0, -32768, 32767).astype(np.int16)
    path = OUT_DIR / name
    with wave.open(str(path), "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(SR)
        target.writeframes(out.tobytes())
    return {
        "file": name,
        "duration": round(len(signal) / SR, 3),
        "peak": round(float(np.max(np.abs(signal))), 4),
        "tail_rms_last_250ms": round(rms(signal[-int(SR * 0.25) :]), 5),
    }


def resample_linear(data: np.ndarray, old_rate: int, new_rate: int) -> np.ndarray:
    if data.size == 0 or old_rate == new_rate:
        return data
    old_x = np.linspace(0, 1, data.size, endpoint=False)
    new_size = max(1, int(round(data.size * new_rate / old_rate)))
    new_x = np.linspace(0, 1, new_size, endpoint=False)
    return np.interp(new_x, old_x, data).astype(np.float32)


def seconds(duration: float) -> int:
    return max(1, int(round(duration * SR)))


def time(duration: float) -> np.ndarray:
    return np.arange(seconds(duration), dtype=np.float32) / SR


def blank(duration: float) -> np.ndarray:
    return np.zeros(seconds(duration), dtype=np.float32)


def add_at(target: np.ndarray, layer: np.ndarray, start: float = 0.0, gain: float = 1.0) -> None:
    offset = seconds(start)
    if offset >= target.size:
        return
    amount = min(layer.size, target.size - offset)
    if amount > 0:
        target[offset : offset + amount] += layer[:amount] * gain


def white(duration: float) -> np.ndarray:
    return RNG.normal(0, 1, seconds(duration)).astype(np.float32)


def brown(duration: float) -> np.ndarray:
    noise = np.cumsum(white(duration))
    return normalize(noise)


def normalize(signal: np.ndarray) -> np.ndarray:
    peak = np.max(np.abs(signal)) if signal.size else 0
    return signal / peak if peak > 0 else signal


def remove_dc(signal: np.ndarray) -> np.ndarray:
    return signal - float(np.mean(signal))


def rms(signal: np.ndarray) -> float:
    if signal.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(signal))))


def envelope(duration: float, attack: float = 0.002, decay: float = 0.4, hold: float = 0.0) -> np.ndarray:
    t = time(duration)
    env = np.exp(-np.maximum(0, t - hold) / max(decay, 0.001))
    if attack > 0:
        env *= np.minimum(1.0, t / attack)
    return env.astype(np.float32)


def fade(signal: np.ndarray, fade_in: float = 0.005, fade_out: float = 0.12) -> np.ndarray:
    out = signal.copy()
    n_in = min(out.size, seconds(fade_in))
    n_out = min(out.size, seconds(fade_out))
    if n_in > 1:
        out[:n_in] *= np.linspace(0, 1, n_in, dtype=np.float32)
    if n_out > 1:
        out[-n_out:] *= np.linspace(1, 0, n_out, dtype=np.float32)
    return out


def soft_clip(signal: np.ndarray, drive: float = 1.0) -> np.ndarray:
    return np.tanh(signal * drive).astype(np.float32)


def lowpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    if signal.size == 0:
        return signal
    rc = 1.0 / (2.0 * math.pi * max(1.0, cutoff))
    dt = 1.0 / SR
    alpha = dt / (rc + dt)
    out = np.empty_like(signal, dtype=np.float32)
    current = float(signal[0])
    for index, sample in enumerate(signal):
        current += alpha * (float(sample) - current)
        out[index] = current
    return out


def highpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    return signal - lowpass(signal, cutoff)


def bandpass(signal: np.ndarray, low: float, high: float) -> np.ndarray:
    return highpass(lowpass(signal, high), low)


def chirp(duration: float, start_hz: float, end_hz: float, decay: float = 0.6) -> np.ndarray:
    t = time(duration)
    k = (end_hz - start_hz) / max(duration, 0.001)
    phase = 2.0 * math.pi * (start_hz * t + 0.5 * k * t * t)
    return (np.sin(phase) * envelope(duration, 0.001, decay)).astype(np.float32)


def source_bed(name: str, duration: float, gain: float = 0.28) -> np.ndarray:
    src = read_wav(name)
    out = blank(duration)
    if src.size:
        add_at(out, fade(src, 0.004, 0.22), 0.0, gain)
    return out


def blast_core(duration: float, low_start: float, low_end: float, snap_gain: float, body_gain: float) -> np.ndarray:
    out = blank(duration)
    snap = highpass(white(duration), 950) * envelope(duration, 0.001, 0.026)
    body = lowpass(brown(duration), 230) * envelope(duration, 0.003, 0.42)
    pressure = chirp(min(duration, 1.2), low_start, low_end, 0.62)
    add_at(out, snap, 0.0, snap_gain)
    add_at(out, body, 0.0, body_gain)
    add_at(out, pressure, 0.0, body_gain * 0.72)
    return out


def long_rumble(duration: float, cutoff: float = 130, decay: float = 1.9, gain: float = 0.35) -> np.ndarray:
    t = time(duration)
    noise = lowpass(brown(duration), cutoff)
    low = chirp(duration, 58, 32, decay * 0.7)
    tail = (noise * 0.72 + low * 0.5) * np.exp(-t / decay)
    return tail.astype(np.float32) * gain


def add_reflections(target: np.ndarray, core: np.ndarray, pattern: list[tuple[float, float, float]]) -> None:
    for delay, gain, cutoff in pattern:
        echo = lowpass(core, cutoff)
        add_at(target, echo, delay, gain)


def metal_clank(duration: float = 0.42) -> np.ndarray:
    out = blank(duration)
    add_at(out, bandpass(white(0.16), 900, 3600) * envelope(0.16, 0.001, 0.04), 0.0, 0.28)
    add_at(out, chirp(0.28, 620, 210, 0.12), 0.04, 0.2)
    return out


def rocket_whoosh(duration: float = 1.6) -> np.ndarray:
    t = time(duration)
    hiss = bandpass(white(duration), 260, 4200)
    flame = lowpass(brown(duration), 650)
    env = np.minimum(1.0, t / 0.08) * np.exp(-np.maximum(0, t - 0.22) / 0.9)
    return (hiss * 0.28 + flame * 0.38 + chirp(duration, 110, 48, 1.2) * 0.18) * env


def autocannon_round(duration: float = 0.18) -> np.ndarray:
    out = blank(duration)
    add_at(out, highpass(white(0.05), 1200) * envelope(0.05, 0.001, 0.015), 0.0, 0.45)
    add_at(out, lowpass(brown(0.13), 260) * envelope(0.13, 0.001, 0.05), 0.0, 0.2)
    return out


def rifle_round(duration: float = 0.2) -> np.ndarray:
    out = blank(duration)
    add_at(out, highpass(white(0.035), 1800) * envelope(0.035, 0.001, 0.01), 0.0, 0.55)
    add_at(out, bandpass(white(0.07), 450, 1800) * envelope(0.07, 0.001, 0.026), 0.0, 0.28)
    add_at(out, chirp(0.1, 190, 95, 0.04), 0.0, 0.14)
    return out


def tank_cannon() -> np.ndarray:
    out = source_bed("unit_armor_cannon.wav", 5.4, 0.18)
    core = blast_core(0.9, 95, 38, 0.92, 0.82)
    add_at(out, core, 0.0, 1.0)
    add_at(out, long_rumble(5.0, 118, 2.35, 0.62), 0.08, 1.0)
    add_reflections(out, core, [(0.28, 0.34, 720), (0.64, 0.24, 440), (1.18, 0.16, 260), (1.86, 0.08, 180)])
    add_at(out, metal_clank(), 0.86, 0.45)
    return out


def howitzer() -> np.ndarray:
    out = source_bed("unit_artillery_howitzer.wav", 6.2, 0.16)
    core = blast_core(1.0, 86, 30, 0.82, 0.95)
    add_at(out, core, 0.0, 0.92)
    add_at(out, long_rumble(6.0, 105, 2.9, 0.72), 0.1, 1.0)
    add_reflections(out, core, [(0.42, 0.28, 520), (0.94, 0.2, 360), (1.8, 0.14, 240), (2.8, 0.07, 180)])
    add_at(out, metal_clank(), 1.18, 0.28)
    return out


def heavy_explosion() -> np.ndarray:
    out = source_bed("impact_heavy_explosion_near.wav", 5.8, 0.2)
    core = blast_core(1.1, 74, 28, 0.76, 1.05)
    add_at(out, core, 0.0, 1.0)
    add_at(out, long_rumble(5.7, 95, 2.65, 0.8), 0.03, 1.0)
    debris = bandpass(white(1.8), 700, 5600) * envelope(1.8, 0.01, 0.75)
    add_at(out, debris, 0.12, 0.18)
    add_reflections(out, core, [(0.34, 0.22, 500), (0.9, 0.16, 320), (1.7, 0.11, 220)])
    return out


def armor_hit() -> np.ndarray:
    out = source_bed("impact_armor_piercing_hit.wav", 3.9, 0.18)
    crack = highpass(white(0.08), 1500) * envelope(0.08, 0.001, 0.018)
    ring = metal_clank(0.8)
    add_at(out, crack, 0.0, 0.72)
    add_at(out, ring, 0.02, 0.5)
    add_at(out, long_rumble(3.2, 150, 1.5, 0.38), 0.08, 1.0)
    return out


def airburst() -> np.ndarray:
    out = source_bed("impact_airburst_missile.wav", 3.8, 0.18)
    snap = highpass(white(0.16), 1100) * envelope(0.16, 0.001, 0.032)
    tail = bandpass(white(2.8), 180, 2300) * envelope(2.8, 0.008, 1.1)
    add_at(out, snap, 0.0, 0.8)
    add_at(out, tail, 0.05, 0.32)
    add_at(out, long_rumble(3.2, 180, 1.5, 0.25), 0.12, 1.0)
    return out


def infantry() -> np.ndarray:
    out = source_bed("unit_infantry_fire.wav", 2.8, 0.12)
    times = [0.0, 0.09, 0.17, 0.34, 0.43, 0.6, 0.75]
    for index, start in enumerate(times):
        add_at(out, rifle_round(), start, 1.0 if index < 3 else 0.78)
        add_at(out, lowpass(rifle_round(0.24), 500), start + 0.16, 0.16)
    add_at(out, bandpass(white(2.0), 280, 1800) * envelope(2.0, 0.004, 0.8), 0.18, 0.12)
    return out


def rocket_salvo() -> np.ndarray:
    out = source_bed("unit_rocket_artillery_salvo.wav", 6.0, 0.14)
    launch_times = [0.0, 0.22, 0.48, 0.78, 1.08, 1.42]
    for start in launch_times:
        core = blast_core(0.34, 92, 48, 0.42, 0.5)
        add_at(out, core, start, 0.76)
        add_at(out, rocket_whoosh(2.2), start + 0.04, 0.62)
    add_at(out, long_rumble(5.5, 125, 2.2, 0.46), 0.3, 1.0)
    return out


def heavy_aa() -> np.ndarray:
    out = source_bed("unit_heavy_aa_missile.wav", 5.2, 0.16)
    add_at(out, blast_core(0.48, 92, 50, 0.5, 0.65), 0.0, 0.9)
    add_at(out, rocket_whoosh(3.8), 0.08, 0.75)
    add_at(out, long_rumble(4.2, 140, 1.8, 0.32), 0.12, 1.0)
    return out


def mobile_aa() -> np.ndarray:
    out = source_bed("unit_mobile_aa_burst.wav", 3.2, 0.14)
    for start in np.linspace(0, 0.72, 9):
        add_at(out, autocannon_round(), float(start), 0.8)
    add_at(out, bandpass(white(2.6), 260, 2400) * envelope(2.6, 0.004, 0.92), 0.12, 0.18)
    return out


def helicopter_rockets() -> np.ndarray:
    out = source_bed("unit_helicopter_rocket_run.wav", 5.2, 0.14)
    rotor = lowpass(brown(5.2), 130) * (0.55 + 0.45 * np.sin(2 * math.pi * 13.5 * time(5.2)))
    add_at(out, rotor * envelope(5.2, 0.08, 2.6), 0.0, 0.18)
    for start in [0.34, 0.52, 0.72, 0.96]:
        add_at(out, rocket_whoosh(1.4), start, 0.42)
        add_at(out, blast_core(0.22, 110, 70, 0.32, 0.26), start, 0.48)
    add_at(out, long_rumble(3.4, 150, 1.6, 0.24), 0.7, 1.0)
    return out


def drone_strike() -> np.ndarray:
    out = source_bed("unit_drone_strike.wav", 3.7, 0.18)
    add_at(out, rocket_whoosh(1.2), 0.0, 0.36)
    add_at(out, airburst(), 0.72, 0.52)
    return out


def fighter_strike() -> np.ndarray:
    out = source_bed("unit_fighter_strike.wav", 4.5, 0.14)
    passby = bandpass(white(2.1), 120, 1800) * envelope(2.1, 0.25, 1.2)
    add_at(out, passby, 0.0, 0.38)
    add_at(out, airburst(), 1.05, 0.5)
    return out


def bomber_run() -> np.ndarray:
    out = source_bed("unit_bomber_bomb_run.wav", 6.4, 0.16)
    passby = lowpass(brown(2.6), 420) * envelope(2.6, 0.35, 1.6)
    add_at(out, passby, 0.0, 0.34)
    add_at(out, heavy_explosion(), 1.55, 0.7)
    add_at(out, heavy_explosion(), 2.25, 0.55)
    return out


def main() -> None:
    jobs = {
        "unit_armor_cannon_enhanced.wav": tank_cannon,
        "unit_artillery_howitzer_enhanced.wav": howitzer,
        "unit_rocket_artillery_salvo_enhanced.wav": rocket_salvo,
        "unit_infantry_fire_enhanced.wav": infantry,
        "unit_heavy_aa_missile_enhanced.wav": heavy_aa,
        "unit_mobile_aa_burst_enhanced.wav": mobile_aa,
        "unit_helicopter_rocket_run_enhanced.wav": helicopter_rockets,
        "unit_drone_strike_enhanced.wav": drone_strike,
        "unit_fighter_strike_enhanced.wav": fighter_strike,
        "unit_bomber_bomb_run_enhanced.wav": bomber_run,
        "impact_heavy_explosion_near_enhanced.wav": heavy_explosion,
        "impact_armor_piercing_hit_enhanced.wav": armor_hit,
        "impact_airburst_missile_enhanced.wav": airburst,
    }
    manifest = {
        "description": "Generated post-processed weapon SFX with non-abrupt tails and battlefield reflections.",
        "sampleRate": SR,
        "files": [],
    }
    for name, build in jobs.items():
        manifest["files"].append(write_wav(name, build()))
        print(f"wrote {name}")
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
