import os
import whisper
import torch
from dotenv import load_dotenv
from core.utils import logger

load_dotenv()

# ── Whisper Model Loader ─────────────────────────────────────────────────────
_whisper_model = None

def _detect_device_and_dtype():
    """Detect the best device and dtype for Whisper."""
    if torch.cuda.is_available():
        device = "cuda"
        dtype = torch.float16  # FP16 for GPU (much faster)
        device_name = f"GPU ({torch.cuda.get_device_name(0)})"
    else:
        device = "cpu"
        dtype = torch.float32  # FP32 for CPU (no choice)
        device_name = "CPU"
    
    logger.info(f"📱 Device detected: {device_name} (dtype: {dtype})")
    return device, dtype

def get_whisper_model():
    """Load Whisper model (cached globally to avoid reloading)."""
    global _whisper_model
    if _whisper_model is None:
        # Auto-detect device and choose optimal model size
        device, dtype = _detect_device_and_dtype()
        
        # If CPU, use "tiny" model for speed; if GPU, can use "small" or larger
        if device == "cpu":
            model_name = os.getenv("WHISPER_MODEL", "tiny")  # Default to tiny on CPU
            if model_name not in ["tiny", "base", "small"]:
                logger.warning(f"⚠️ Model '{model_name}' is large for CPU. Using 'tiny' instead for speed.")
                model_name = "tiny"
        else:
            model_name = os.getenv("WHISPER_MODEL", "small")  # Default to small on GPU
        
        logger.info(f"🔄 Loading Whisper model ({model_name}) on {device}...")
        try:
            _whisper_model = whisper.load_model(model_name, device=device)
            logger.info(f"✅ Whisper model loaded successfully ({model_name} on {device})")
        except Exception as e:
            logger.error(f"❌ Failed to load Whisper model: {e}")
            raise e
    return _whisper_model
