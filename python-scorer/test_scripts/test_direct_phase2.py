"""Direct test of score_read_aloud with audio buffer"""
import asyncio
import base64
import numpy as np
import soundfile as sf
import sys
sys.path.insert(0, '.')

from main import score_read_aloud, QuestionData, PHASE2_AVAILABLE

async def test_direct():
    print(f"PHASE2_AVAILABLE: {PHASE2_AVAILABLE}")
    
    # Load a real audio file
    audio_file = "test_audio_q1.wav"
    audio_data, sr = sf.read(audio_file)
    
    # Convert to bytes
    audio_bytes = np.float32(audio_data).tobytes()
    
    print(f"Audio loaded: {len(audio_bytes)} bytes, sr={sr}")
    
    # Create question data
    q = QuestionData(
        content="The early bird gets the worm. Starting your day early gives you more time to accomplish your goals.",
        title="Early Bird",
        response_time=40
    )
    
    # Call score_read_aloud with audio
    transcription = "Climate change is one of the most pressing challenges facing humanity today."
    result = await score_read_aloud(q, transcription, duration_seconds=8.0, audio_buffer=audio_bytes)
    
    print(f"\n===== RESULT =====")
    print(f"Total Score: {result.total_score}/15")
    print(f"Breakdown: {result.score_breakdown}")
    
    if "phase2" in result.score_breakdown:
        print(f"\n✅ PHASE 2 DATA FOUND!")
        phase2 = result.score_breakdown.get("phase2", {})
        print(f"Phase 2 keys: {list(phase2.keys())}")
    else:
        print(f"\n⚠️  No Phase 2 data in breakdown")

asyncio.run(test_direct())
