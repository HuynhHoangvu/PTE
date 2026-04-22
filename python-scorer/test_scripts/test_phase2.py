"""Test Phase 2 acoustic features implementation"""
import asyncio
import numpy as np
from acoustic_features import (
    detect_pauses,
    calculate_wpm_syllable_based,
    extract_f0_pitch,
    score_fluency_phase2
)

async def test_phase2():
    print("=" * 70)
    print("PHASE 2: ACOUSTIC FEATURES TEST")
    print("=" * 70)
    
    # Simulate audio data (1 second at 16kHz)
    sr = 16000
    duration = 2.0
    audio_data = np.zeros(int(sr * duration), dtype=np.float32)
    
    # Add some pseudo-speech: 50% silence, 50% "speech" (noise)
    speech_start = int(sr * 0.5)
    audio_data[speech_start:] = np.random.randn(len(audio_data) - speech_start) * 0.1
    
    # Test transcription
    transcription = "Climate change is one of the most pressing issues facing humanity today"
    
    print("\n1. PAUSE DETECTION")
    print("-" * 70)
    pause_result = detect_pauses(audio_data, sr)
    print(f"   Total pauses detected: {pause_result.get('total_pauses', 0)}")
    print(f"   Total pause time: {pause_result.get('total_pause_time', 0):.2f}s")
    print(f"   Speech time: {pause_result.get('speech_time', 0):.2f}s")
    print(f"   Pause ratio: {pause_result.get('pause_ratio', 0):.2%}")
    print(f"   Status: {pause_result.get('status', 'unknown')}")
    
    print("\n2. WPM CALCULATION (SYLLABLE-BASED)")
    print("-" * 70)
    wpm_result = calculate_wpm_syllable_based(transcription, duration)
    print(f"   Words: {wpm_result.get('words', 0)}")
    print(f"   Syllables: {wpm_result.get('syllables', 0)}")
    print(f"   WPM: {wpm_result.get('wpm', 0):.1f}")
    print(f"   SPM (Syllables/min): {wpm_result.get('spm', 0):.1f}")
    
    print("\n3. F0 PITCH EXTRACTION")
    print("-" * 70)
    f0_result = extract_f0_pitch(audio_data, sr)
    if f0_result.get('status') == 'success':
        print(f"   F0 Mean (Hz): {f0_result.get('f0_mean', 'N/A')}")
        print(f"   F0 Std Dev: {f0_result.get('f0_std', 'N/A')}")
        print(f"   F0 Range: {f0_result.get('f0_range', 'N/A')}")
        print(f"   Stability Score: {f0_result.get('stability_score', 'N/A')}/100")
        print(f"   Jitter: {f0_result.get('jitter', 'N/A')}%")
    else:
        print(f"   Status: {f0_result.get('status', 'error')}")
        print(f"   Message: {f0_result.get('message', f0_result.get('error', 'Unknown'))}")
    
    print("\n4. INTEGRATED FLUENCY SCORE")
    print("-" * 70)
    wpm = wpm_result.get('wpm', 100)
    fluency_result = score_fluency_phase2(wpm, pause_result, f0_result)
    print(f"   Fluency Score: {fluency_result.get('fluency_score', 0)}/5")
    print(f"   WPM: {fluency_result.get('wpm', 0):.1f}")
    print(f"   Pause Ratio: {fluency_result.get('pause_ratio', 0):.2%}")
    deductions = fluency_result.get('deductions', [])
    if deductions:
        print(f"   Deductions:")
        for d in deductions:
            print(f"     - {d}")
    else:
        print(f"   No deductions")
    
    print("\n" + "=" * 70)
    print("✅ Phase 2 features loaded successfully!")
    print("=" * 70)

asyncio.run(test_phase2())
