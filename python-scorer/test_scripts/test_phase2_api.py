"""Test Phase 2 integration with API"""
import requests
import json
import numpy as np
import soundfile as sf
import base64

# Create a simple test audio file (2 seconds, 16kHz)
sr = 16000
duration = 2.0
audio = np.random.randn(int(sr * duration)) * 0.05
audio_path = "test_audio_phase2.wav"
sf.write(audio_path, audio, sr)

# Read and encode to base64
with open(audio_path, "rb") as f:
    audio_bytes = f.read()
    audio_base64 = base64.b64encode(audio_bytes).decode()

print("=" * 70)
print("PHASE 2: END-TO-END API TEST")
print("=" * 70)

url = "http://127.0.0.1:8001/score"
payload = {
    "question_type": "SPEAKING_READ_ALOUD",
    "question": {
        "content": "Climate change is pressing issue facing humanity today rising temperatures melting ice caps extreme weather events consequences increased greenhouse emissions",
        "title": "Climate",
        "response_time": 40
    },
    "audio_base64": audio_base64,
    "audio_mime": "audio/wav",
    "duration_seconds": duration
}

try:
    print(f"\nSending request to {url}")
    print(f"Audio size: {len(audio_bytes)} bytes")
    
    response = requests.post(url, json=payload, timeout=30)
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        
        print(f"\nTotal Score: {result.get('total_score', 'N/A')}/15")
        breakdown = result.get('score_breakdown', {})
        print(f"Content: {breakdown.get('content', 'N/A')}/5")
        print(f"Pronunciation: {breakdown.get('pronunciation', 'N/A')}/5")
        print(f"Fluency: {breakdown.get('fluency', 'N/A')}/5")
        
        details = breakdown.get('details', {})
        print(f"\nDetails:")
        print(f"  Accuracy: {details.get('accuracy_pct', 'N/A')}%")
        print(f"  WPM: {details.get('wpm', 'N/A')}")
        
        phase2 = breakdown.get('phase2', {})
        if phase2:
            print(f"\n✅ PHASE 2 DATA DETECTED:")
            pauses = phase2.get('pauses', {})
            if pauses:
                print(f"  Pauses detected: {pauses.get('total_pauses', 0)}")
                print(f"  Pause ratio: {pauses.get('pause_ratio', 0):.1%}")
            
            pitch = phase2.get('pitch', {})
            if pitch and pitch.get('status') == 'success':
                print(f"  F0 Mean (Hz): {pitch.get('f0_mean', 'N/A')}")
                print(f"  Pitch Stability: {pitch.get('stability_score', 'N/A')}/100")
            
            fluency_analysis = phase2.get('fluency_analysis', {})
            if fluency_analysis:
                print(f"  Fluency Analysis available ✓")
        else:
            print(f"\n⚠️  Phase 2 data not included in response")
        
        print(f"\nFeedback: {result.get('feedback', 'N/A')}")
        
    else:
        print(f"Error: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")

import os
os.remove(audio_path)
print("\n" + "=" * 70)
print("Test complete!")
print("=" * 70)
