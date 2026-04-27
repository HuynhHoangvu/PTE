from pathlib import Path
from dotenv import load_dotenv

# Đồng bộ với main: đọc đúng python-scorer/.env trước khi tạo client (module import có thể chạy trước main).
_SCORER_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_SCORER_ROOT / ".env", override=True)

import os
from typing import List, Optional
from google import genai
from google.genai import types as genai_types

from core.utils import logger, _parse_json
from models import ScoreResult

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
_gemini_client = genai.Client(api_key=GEMINI_API_KEY)
_FLASH = "gemini-2.5-flash"

def _get_config(temperature: float = 0.3) -> genai_types.GenerateContentConfig:
    return genai_types.GenerateContentConfig(temperature=temperature)


async def call_gemini(prompt: str, expected_keys: List[str], model: str = _FLASH) -> ScoreResult:
    """Helper to call Gemini and return a ScoreResult with parsed JSON."""
    try:
        response = _gemini_client.models.generate_content(
            model=model,
            contents=prompt,
            config=_get_config()
        )
        data = _parse_json(response.text)
        
        # Ensure all expected keys exist
        for key in expected_keys:
            if key not in data:
                data[key] = 0
        
        score_breakdown = {k: data[k] for k in expected_keys}
        
        return ScoreResult(
            total_score=data.get("totalScore", 0),
            score_breakdown=score_breakdown,
            feedback=data.get("feedback", "No feedback provided.")
        )
    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
        return ScoreResult(
            total_score=0,
            score_breakdown={k: 0 for k in expected_keys},
            feedback=f"⚠️ AI scoring failed: {str(e)}"
        )
