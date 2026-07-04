"""
Voice Activity Detection.

Used only to reject a recording outright when it contains no real speech at all
(before wasting a Whisper transcription call on silence/noise).
"""

import numpy as np
import librosa
import logging
from typing import Dict

logger = logging.getLogger("acoustic-features")


def detect_voice_activity(audio_data: np.ndarray, sr: int, threshold_db: float = -40.0, min_duration_ms: int = 200) -> Dict:
    """
    Detect if audio contains voice activity (tiếng nói thực sự).

    Args:
        audio_data: Audio waveform (numpy array)
        sr: Sample rate (Hz)
        threshold_db: Energy threshold for voice detection (dB)
        min_duration_ms: Minimum voice segment duration (ms)

    Returns:
        Dict with voice activity statistics:
        {
            "has_speech": bool,
            "speech_ratio": float (0-1),
            "speech_time": float (seconds),
            "total_duration": float (seconds),
            "voice_segments": list,
            "status": "success" | "error"
        }
    """
    try:
        if len(audio_data) == 0:
            return {
                "has_speech": False,
                "speech_ratio": 0.0,
                "speech_time": 0.0,
                "total_duration": 0.0,
                "voice_segments": [],
                "status": "error",
                "error": "Empty audio"
            }

        # Convert to dB scale using mel-spectrogram energy
        S = librosa.feature.melspectrogram(y=audio_data, sr=sr, n_mels=128)
        S_db = librosa.power_to_db(S, ref=np.max)

        # Frame-level energy (mean across mel bins)
        energy = np.mean(S_db, axis=0)

        # Identify voiced frames (above threshold)
        is_voiced = energy > threshold_db

        # Convert frame indices to time
        frame_times = librosa.frames_to_time(np.arange(len(energy)), sr=sr)

        # Find voice segments (consecutive voiced frames)
        min_frames = int(min_duration_ms / 1000 * sr / 512)  # 512 is default hop_length
        voice_segments = []
        in_voice = False
        voice_start = 0
        segment_start_idx = 0

        for i, voiced in enumerate(is_voiced):
            if voiced and not in_voice:
                voice_start = frame_times[i]
                segment_start_idx = i
                in_voice = True
            elif not voiced and in_voice:
                # Check if segment is long enough
                if (i - segment_start_idx) >= min_frames:
                    voice_end = frame_times[i]
                    voice_duration = voice_end - voice_start
                    voice_segments.append({
                        "start": round(voice_start, 3),
                        "end": round(voice_end, 3),
                        "duration": round(voice_duration, 3)
                    })
                in_voice = False

        # Handle case where voice extends to end of audio
        if in_voice and (len(is_voiced) - segment_start_idx) >= min_frames:
            voice_end = frame_times[-1]
            voice_duration = voice_end - voice_start
            voice_segments.append({
                "start": round(voice_start, 3),
                "end": round(voice_end, 3),
                "duration": round(voice_duration, 3)
            })

        # Statistics
        total_speech_time = sum(seg["duration"] for seg in voice_segments)
        total_duration = len(audio_data) / sr
        speech_ratio = total_speech_time / total_duration if total_duration > 0 else 0

        # Has speech if >= 5% of audio contains voice activity
        has_speech = speech_ratio >= 0.05

        return {
            "has_speech": has_speech,
            "speech_ratio": round(speech_ratio, 3),
            "speech_time": round(total_speech_time, 2),
            "total_duration": round(total_duration, 2),
            "voice_segments": voice_segments,
            "status": "success"
        }

    except Exception as e:
        logger.error(f"Voice activity detection failed: {e}")
        return {
            "has_speech": False,
            "speech_ratio": 0.0,
            "speech_time": 0.0,
            "total_duration": 0.0,
            "voice_segments": [],
            "status": "error",
            "error": str(e)
        }
