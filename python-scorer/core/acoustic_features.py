"""
Phase 2: Acoustic Features Analysis
=====================================
Features:
1. Voice Activity Detection (VAD) - Phát hiện tiếng nói
2. Pause Detection (Silence analysis)
3. WPM Calculation (Syllable-based)
4. F0 Pitch extraction (Intonation)
"""

import numpy as np
import librosa
import logging
from typing import Dict, List, Tuple

logger = logging.getLogger("acoustic-features")

# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 0: VOICE ACTIVITY DETECTION (VAD)
# ═══════════════════════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 1: PAUSE DETECTION
# ═══════════════════════════════════════════════════════════════════════════

def detect_pauses(audio_data: np.ndarray, sr: int, threshold_db: float = -40.0) -> Dict:
    """
    Detect silence/pause segments in audio.
    
    Args:
        audio_data: Audio waveform (numpy array)
        sr: Sample rate (Hz)
        threshold_db: Energy threshold for silence detection (dB)
    
    Returns:
        Dict with pause statistics
    """
    try:
        # Convert to dB scale
        S = librosa.feature.melspectrogram(y=audio_data, sr=sr)
        S_db = librosa.power_to_db(S, ref=np.max)
        
        # Frame-level energy
        energy = np.mean(S_db, axis=0)
        
        # Identify silence frames
        is_silent = energy < threshold_db
        
        # Convert frame indices to time
        frame_times = librosa.frames_to_time(np.arange(len(energy)), sr=sr)
        
        # Find pause segments (consecutive silent frames)
        pause_segments = []
        in_pause = False
        pause_start = 0
        
        for i, silent in enumerate(is_silent):
            if silent and not in_pause:
                pause_start = frame_times[i]
                in_pause = True
            elif not silent and in_pause:
                pause_end = frame_times[i]
                pause_duration = pause_end - pause_start
                
                # Only count pauses > 300ms
                if pause_duration > 0.3:
                    pause_segments.append({
                        "start": round(pause_start, 2),
                        "end": round(pause_end, 2),
                        "duration": round(pause_duration, 2)
                    })
                in_pause = False
        
        # Statistics
        total_pause_time = sum(p["duration"] for p in pause_segments)
        total_duration = len(audio_data) / sr
        speech_time = total_duration - total_pause_time
        
        return {
            "total_pauses": len(pause_segments),
            "total_pause_time": round(total_pause_time, 2),
            "speech_time": round(speech_time, 2),
            "pause_ratio": round(total_pause_time / total_duration, 3) if total_duration > 0 else 0,
            "segments": pause_segments,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Pause detection failed: {e}")
        return {
            "total_pauses": 0,
            "total_pause_time": 0,
            "speech_time": 0,
            "pause_ratio": 0,
            "segments": [],
            "status": "error",
            "error": str(e)
        }


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 2: WPM CALCULATION (SYLLABLE-BASED)
# ═══════════════════════════════════════════════════════════════════════════

def estimate_syllables(word: str) -> int:
    """
    Rough estimate of syllables in English word.
    Based on vowel groups (not perfect but useful).
    """
    word = word.lower()
    vowels = "aeiouy"
    syllable_count = 0
    previous_was_vowel = False
    
    for char in word:
        is_vowel = char in vowels
        if is_vowel and not previous_was_vowel:
            syllable_count += 1
        previous_was_vowel = is_vowel
    
    # Adjustments
    if word.endswith("e"):
        syllable_count -= 1
    if word.endswith("le"):
        syllable_count += 1
    
    return max(1, syllable_count)


def calculate_wpm_syllable_based(transcript: str, duration_seconds: float) -> Dict:
    """
    Calculate WPM based on syllable count (more accurate than word count).
    
    Args:
        transcript: Transcribed text
        duration_seconds: Duration of audio in seconds
    
    Returns:
        Dict with WPM and syllable metrics
    """
    try:
        words = transcript.split()
        syllable_count = sum(estimate_syllables(w) for w in words)
        
        if duration_seconds <= 0:
            return {"wpm": 0, "syllables": syllable_count, "words": len(words)}
        
        # WPM = syllables / 5 / minutes (standard conversion: 5 syllables ≈ 1 word in English)
        minutes = duration_seconds / 60
        wpm = syllable_count / 5 / minutes if minutes > 0 else 0
        
        # Syllables per minute
        spm = syllable_count / minutes if minutes > 0 else 0
        
        return {
            "wpm": round(wpm, 1),
            "spm": round(spm, 1),  # Syllables per minute
            "words": len(words),
            "syllables": syllable_count,
            "duration_seconds": round(duration_seconds, 1)
        }
    except Exception as e:
        logger.error(f"WPM calculation failed: {e}")
        return {"wpm": 0, "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 3: F0 PITCH EXTRACTION (Using librosa)
# ═══════════════════════════════════════════════════════════════════════════

def extract_f0_pitch(audio_data: np.ndarray, sr: int) -> Dict:
    """
    Extract F0 (fundamental frequency) using librosa's piptrack.
    Describes the pitch contour and intonation patterns.
    
    Args:
        audio_data: Audio waveform
        sr: Sample rate
    
    Returns:
        Dict with F0 statistics
    """
    try:
        from scipy import signal
        
        # Use librosa's piptrack for F0 estimation
        f0 = librosa.yin(audio_data, fmin=50, fmax=400, sr=sr)
        
        # Filter out unvoiced frames (0 or very low values)
        voiced_frames = f0[f0 > 0]
        
        if len(voiced_frames) < 10:
            return {
                "status": "no_pitch",
                "message": "Could not extract F0 (mostly unvoiced)"
            }
        
        # Calculate statistics
        f0_mean = np.mean(voiced_frames)
        f0_std = np.std(voiced_frames)
        f0_min = np.min(voiced_frames)
        f0_max = np.max(voiced_frames)
        f0_range = f0_max - f0_min
        
        # Pitch stability score (lower std = more stable)
        stability_score = 100 - min(100, (f0_std / f0_mean * 100))
        
        # Pitch variation pattern (jitter - higher = less stable)
        f0_diffs = np.abs(np.diff(voiced_frames))
        jitter = np.mean(f0_diffs) / f0_mean * 100 if f0_mean > 0 else 0
        
        return {
            "f0_mean": round(f0_mean, 1),      # Average pitch (Hz)
            "f0_std": round(f0_std, 1),        # Pitch variation
            "f0_min": round(f0_min, 1),        # Lowest pitch
            "f0_max": round(f0_max, 1),        # Highest pitch
            "f0_range": round(f0_range, 1),    # Pitch range
            "stability_score": round(stability_score, 1),  # 0-100
            "jitter": round(jitter, 1),        # Pitch instability %
            "voiced_ratio": round(len(voiced_frames) / len(f0), 3),  # % voiced
            "status": "success"
        }
    except Exception as e:
        logger.error(f"F0 extraction failed: {e}")
        return {"status": "error", "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 4: FLUENCY SCORE (Integrated)
# ═══════════════════════════════════════════════════════════════════════════

def score_fluency_phase2(wpm: float, pause_data: Dict, f0_data: Dict) -> Dict:
    """
    Calculate fluency score using multiple acoustic features.
    
    Args:
        wpm: Words per minute
        pause_data: Pause detection results
        f0_data: F0 pitch data
    
    Returns:
        Dict with fluency metrics and score
    """
    score = 5.0
    deductions = []
    
    # 1. WPM penalty (ideal 110-130 WPM for PTE)
    if wpm < 100:
        score -= 1.0
        deductions.append(f"Too slow: {wpm:.0f} WPM (ideal 110-130)")
    elif wpm > 180:
        score -= 1.0
        deductions.append(f"Too fast: {wpm:.0f} WPM (ideal 110-130)")
    elif (100 <= wpm < 110) or (160 < wpm <= 180):
        score -= 0.5
        deductions.append(f"Slightly off pace: {wpm:.0f} WPM")
    
    # 2. Pause pattern penalty
    if "total_pauses" in pause_data:
        pause_ratio = pause_data.get("pause_ratio", 0)
        total_pauses = pause_data.get("total_pauses", 0)
        
        # Too many pauses (> 15% of speech)
        if pause_ratio > 0.15:
            score -= 0.5
            deductions.append(f"Too many pauses ({total_pauses} pauses, {pause_ratio*100:.0f}% pause ratio)")
        
        # Excessive long pauses
        long_pauses = sum(1 for p in pause_data.get("segments", []) if p.get("duration", 0) > 1.0)
        if long_pauses > 2:
            score -= 0.3
            deductions.append(f"{long_pauses} long pauses (> 1s)")
    
    # 3. Pitch stability (if F0 data available)
    if "stability_score" in f0_data:
        stability = f0_data.get("stability_score", 50)
        if stability < 50:
            score -= 0.3
            deductions.append(f"Low pitch stability: {stability:.0f}/100")
    
    return {
        "fluency_score": max(0, round(score)),
        "wpm": round(wpm, 1),
        "pause_ratio": pause_data.get("pause_ratio", 0),
        "pitch_stability": f0_data.get("stability_score", "N/A"),
        "deductions": deductions
    }
