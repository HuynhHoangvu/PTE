"""
Quick test for Voice Activity Detection (VAD) fix
Test nhanh để kiểm tra VAD hoạt động
"""

import numpy as np
import librosa
from acoustic_features import detect_voice_activity

print("=" * 70)
print("🧪 TESTING VOICE ACTIVITY DETECTION (VAD)")
print("=" * 70)

# Test 1: Tạo audio có tiếng (word "Hello" 16kHz 1s)
print("\n[Test 1] Tạo audio có tiếng nói (Sine wave 440Hz)")
sr = 16000
duration = 1.0
freq = 440  # Hz (giọng trung bình)

# Generate tone with envelope (sinusoid)
t = np.linspace(0, duration, int(sr * duration), endpoint=False)
audio_with_speech = 0.3 * np.sin(2 * np.pi * freq * t)

# Apply envelope to make it sound more like speech
envelope = np.hann(len(audio_with_speech))
audio_with_speech = audio_with_speech * envelope

print(f"Audio shape: {audio_with_speech.shape}")
print(f"Audio duration: {len(audio_with_speech) / sr} seconds")

# Run VAD
result = detect_voice_activity(audio_with_speech, sr, threshold_db=-40.0, min_duration_ms=200)
print(f"\nVAD Result:")
print(f"  - has_speech: {result['has_speech']}")
print(f"  - speech_ratio: {result['speech_ratio']}")
print(f"  - speech_time: {result['speech_time']}s")
print(f"  - status: {result['status']}")

if result['has_speech']:
    print("✅ Test 1 PASSED: VAD correctly detected speech")
else:
    print("❌ Test 1 FAILED: VAD should detect speech but didn't")

# Test 2: Tạo audio trong yên tĩnh (chỉ noise thấp)
print("\n[Test 2] Tạo audio yên tĩnh (white noise nhỏ)")
audio_silent = 0.05 * np.random.randn(int(sr * duration))  # Very quiet noise

result2 = detect_voice_activity(audio_silent, sr, threshold_db=-40.0, min_duration_ms=200)
print(f"\nVAD Result:")
print(f"  - has_speech: {result2['has_speech']}")
print(f"  - speech_ratio: {result2['speech_ratio']}")
print(f"  - speech_time: {result2['speech_time']}s")
print(f"  - status: {result2['status']}")

if not result2['has_speech']:
    print("✅ Test 2 PASSED: VAD correctly rejected silence")
else:
    print("❌ Test 2 FAILED: VAD should reject silence but detected speech")

# Test 3: Load real test audio if exists
print("\n[Test 3] Load real test audio (test_audio_q1.wav)")
try:
    audio_real, sr_real = librosa.load("test_audio_q1.wav", sr=16000, mono=True)
    result3 = detect_voice_activity(audio_real, sr_real, threshold_db=-40.0, min_duration_ms=200)
    print(f"\nReal Audio VAD Result:")
    print(f"  - has_speech: {result3['has_speech']}")
    print(f"  - speech_ratio: {result3['speech_ratio']}")
    print(f"  - speech_time: {result3['speech_time']}s")
    print(f"  - status: {result3['status']}")
    
    if result3['has_speech']:
        print("✅ Test 3 PASSED: VAD detected real speech")
    else:
        print("❌ Test 3 FAILED: VAD should detect real speech")
except FileNotFoundError:
    print("⏭️ Test 3 SKIPPED: test_audio_q1.wav not found")
except Exception as e:
    print(f"❌ Test 3 ERROR: {e}")

print("\n" + "=" * 70)
print("✅ VAD Testing Complete!")
print("=" * 70)
