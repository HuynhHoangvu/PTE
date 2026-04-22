"""Test Phase 2 integration with API using real audio files (port 8002)"""
import requests
import json
import base64
import os

# Find and use an actual audio file
audio_files = [
    "test_audio_q1.wav",
    "test_audio_q2.wav",
    "test_audio_q3.wav",
    "test_audio_q4.wav",
]

audio_file = None
for af in audio_files:
    if os.path.exists(af):
        audio_file = af
        break

if not audio_file:
    print("❌ No test audio files found. Please create one first.")
    print("Available test audio files should be: ", audio_files)
    exit(1)

# Read and encode to base64
with open(audio_file, "rb") as f:
    audio_bytes = f.read()
    audio_base64 = base64.b64encode(audio_bytes).decode()

print("=" * 70)
print("PHASE 2: END-TO-END API TEST (with real audio) - PORT 8002")
print("=" * 70)

url = "http://127.0.0.1:8002/score"
payload = {
    "question_type": "SPEAKING_READ_ALOUD",
    "question": {
        "content": "The early bird gets the worm. Starting your day early gives you more time to accomplish your goals.",
        "title": "Early Bird",
        "response_time": 40
    },
    "audio_base64": audio_base64,
    "audio_mime": "audio/wav",
    "duration_seconds": 8.0
}

try:
    print(f"\nSending request to {url}")
    print(f"Audio file: {audio_file}")
    print(f"Audio size: {len(audio_bytes)} bytes")
    
    response = requests.post(url, json=payload, timeout=60)
    
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
        print(f"  Total errors: {details.get('total_errors', 'N/A')}")
        
        phase2 = breakdown.get('phase2', {})
        if phase2:
            print(f"\n✅ PHASE 2 DATA DETECTED:")
            pauses = phase2.get('pauses', {})
            if pauses:
                print(f"  Pauses detected: {pauses.get('total_pauses', 0)}")
                print(f"  Pause ratio: {pauses.get('pause_ratio', 0):.1%}")
                print(f"  Total pause time: {pauses.get('total_pause_time', 0):.2f}s")
            
            wpm_data = phase2.get('wpm_detailed', {})
            if wpm_data:
                print(f"  WPM (syllable-based): {wpm_data.get('wpm', 'N/A')}")
                print(f"  Estimated syllables: {wpm_data.get('estimated_syllables', 'N/A')}")
            
            pitch = phase2.get('pitch', {})
            if pitch and pitch.get('status') == 'success':
                print(f"  F0 Mean (Hz): {pitch.get('f0_mean', 'N/A'):.1f}")
                print(f"  F0 Std: {pitch.get('f0_std', 'N/A'):.1f}")
                print(f"  Pitch Range: {pitch.get('f0_min', 'N/A'):.1f}-{pitch.get('f0_max', 'N/A'):.1f} Hz")
                print(f"  Pitch Stability: {pitch.get('stability_score', 'N/A'):.1f}/100")
            
            fluency_analysis = phase2.get('fluency_analysis', {})
            if fluency_analysis:
                print(f"  Fluency Score: {fluency_analysis.get('fluency_score', 'N/A')}/5")
                print(f"  Base fluency: {fluency_analysis.get('base_fluency', 'N/A')}/5")
                deductions = fluency_analysis.get('deductions', [])
                if deductions:
                    print(f"  Deductions:")
                    for d in deductions:
                        print(f"    - {d}")
        else:
            print(f"\n⚠️  Phase 2 data not included in response")
        
        print(f"\nTranscription: {result.get('transcription', 'N/A')[:100]}")
        print(f"\nFeedback: {result.get('feedback', 'N/A')}")
        
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "=" * 70)
print("Test complete!")
print("=" * 70)
