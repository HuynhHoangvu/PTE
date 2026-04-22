import re
import json
import logging
import subprocess
import numpy as np
import librosa
import soundfile as sf
from typing import Optional

# ── Logging Setup ────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger("pte-scorer")

# ── Text Cleaning ────────────────────────────────────────────────────────────
def _clean_text(text: str) -> str:
    """Normalize text: lowercase, strip punctuation, remove multiple spaces."""
    if not text: return ""
    text = text.lower()
    # Remove punctuation
    text = text.translate(str.maketrans("", "", '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~'))
    # Normalize spaces
    text = " ".join(text.split())
    return text


def _parse_json(text: str) -> dict:
    """Extract JSON from Gemini response (may be wrapped in ```json block)."""
    try:
        text = text.strip()
        text = re.sub(r"^```json\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"^```\s*", "", text, flags=re.MULTILINE)
        if text.startswith('{') and text.endswith('}'):
            return json.loads(text)
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {}
    except Exception as e:
        logger.error(f"JSON Parse Error: {e} | Text: {text[:100]}...")
        return {}

# ── Audio Loading & Normalization ──────────────────────────────────────────
def _clean_base64_audio(audio_b64: str) -> str:
    """Strip data:audio/...;base64, prefix if present."""
    if "," in audio_b64:
        return audio_b64.split(",")[1]
    return audio_b64


def _normalize_audio_to_wav(input_path: str, output_path: str, target_sr: int = 16000) -> bool:
    """Convert any audio format to 16kHz mono WAV using ffmpeg."""
    try:
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-ar", str(target_sr), "-ac", "1",
            output_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return result.returncode == 0
    except Exception as e:
        logger.error(f"FFmpeg normalization failed: {e}")
        return False


def _load_audio_as_float32(path: str, target_sr: int = 16000) -> np.ndarray:
    """
    Load any audio format (webm/ogg/mp4/wav) to float32 numpy array at target_sr.
    """
    try:
        cmd = [
            "ffmpeg", "-y", "-i", path,
            "-ar", str(target_sr), "-ac", "1",
            "-f", "f32le", "-",
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode == 0 and len(result.stdout) > 0:
            audio = np.frombuffer(result.stdout, dtype=np.float32)
            return audio
    except FileNotFoundError:
        pass

    try:
        audio, sr = sf.read(path)
        audio = np.array(audio, dtype=np.float32)
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        if sr != target_sr:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
        return audio
    except Exception:
        try:
            audio, _ = librosa.load(path, sr=target_sr, mono=True)
            return audio
        except:
            return np.array([], dtype=np.float32)
